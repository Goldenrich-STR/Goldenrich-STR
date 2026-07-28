from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
import logging

from middleware.auth_middleware import get_current_user
from models.notification import NotificationChannel, NotificationType
from models.support_ticket import SupportTicket, SupportTicketCreate, SupportTicketUpdate, SupportTicketStatus
from services.audit_service import write_audit_log
from services.notification_service import send_multi_channel_notification


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/support-tickets", tags=["Support Tickets"])


async def get_db():
    from server import db_instance
    return db_instance


async def _notify_admins(db: AsyncIOMotorDatabase, ticket: dict):
    admins = await db.users.find({"role": "admin", "is_active": True}, {"_id": 0}).to_list(length=100)
    if not admins:
        admins = await db.users.find({"role": "admin"}, {"_id": 0}).to_list(length=100)

    for admin in admins:
        await send_multi_channel_notification(
            db=db,
            user_id=admin["user_id"],
            notification_type=NotificationType.SUPPORT_TICKET_CREATED,
            title="New support ticket",
            message=f"{ticket.get('user_name', 'A user')} raised: {ticket.get('subject', 'Support request')}",
            channels=[NotificationChannel.IN_APP],
            data={"ticket_id": ticket["ticket_id"], "category": ticket.get("category")},
        )


def _public_user_details(user: dict) -> dict:
    return {
        "user_name": user.get("full_name") or "User",
        "user_email": user.get("email") or "",
        "user_phone": user.get("phone") or "",
        "user_role": user.get("role") or "guest",
        "user_lg_code": user.get("lg_code") or user.get("broker_code") or "",
        "user_employee_code": user.get("employee_code") or user.get("rm_code") or "",
        "user_uid": user.get("uid") or "",
        "user_broker_id": user.get("broker_id") or "",
        "user_rm_id": user.get("rm_id") or "",
    }


async def _enrich_ticket_user_details(db: AsyncIOMotorDatabase, ticket: dict) -> dict:
    user = await db.users.find_one(
        {"user_id": ticket.get("user_id")},
        {
            "_id": 0,
            "full_name": 1,
            "email": 1,
            "phone": 1,
            "role": 1,
            "lg_code": 1,
            "employee_code": 1,
            "uid": 1,
            "broker_id": 1,
            "rm_id": 1,
        },
    )
    if not user:
        return ticket
    enriched = {**ticket, **_public_user_details(user)}
    return enriched


def _ticket_age_hours(ticket: dict) -> float:
    created_at = ticket.get("created_at")
    if not created_at:
        return 0
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return max(0, (datetime.now(timezone.utc) - created_at).total_seconds() / 3600)


def _ticket_sla_status(ticket: dict) -> str:
    if ticket.get("status") in {SupportTicketStatus.RESOLVED.value, SupportTicketStatus.CLOSED.value}:
        return "resolved"
    due_at = ticket.get("sla_due_at")
    if due_at:
        if isinstance(due_at, str):
            due_at = datetime.fromisoformat(due_at.replace("Z", "+00:00"))
        if due_at.tzinfo is None:
            due_at = due_at.replace(tzinfo=timezone.utc)
        return "breached" if due_at < datetime.now(timezone.utc) else "within_sla"
    age = _ticket_age_hours(ticket)
    if age >= 16:
        return "level_2_escalated"
    if age >= 8:
        return "level_1_escalated"
    if age >= 4:
        return "due_soon"
    return "within_sla"


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_support_ticket(
    payload: SupportTicketCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    try:
        user = await db.users.find_one({"user_id": current_user["user_id"]}, {"_id": 0}) or {}
        ticket = SupportTicket(
            user_id=current_user["user_id"],
            **_public_user_details(user),
            subject=payload.subject.strip(),
            message=payload.message.strip(),
            category=payload.category.strip() or "general",
            priority=payload.priority,
        )
        ticket_doc = ticket.model_dump()
        await db.support_tickets.insert_one(ticket_doc)
        await _notify_admins(db, ticket_doc)
        return {"ticket": ticket_doc, "message": "Support ticket created successfully."}
    except Exception as e:
        logger.error(f"Error creating support ticket: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create support ticket")


@router.get("/my")
async def get_my_support_tickets(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    try:
        tickets = await db.support_tickets.find(
            {"user_id": current_user["user_id"]},
            {"_id": 0},
        ).sort("created_at", -1).to_list(length=100)
        return {"tickets": tickets, "total": len(tickets)}
    except Exception as e:
        logger.error(f"Error fetching user support tickets: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch support tickets")


@router.get("/admin")
async def get_admin_support_tickets(
    status_filter: str = "all",
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    try:
        query = {}
        if status_filter and status_filter != "all":
            query["status"] = status_filter
        tickets = await db.support_tickets.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=300)
        tickets = [await _enrich_ticket_user_details(db, ticket) for ticket in tickets]
        assignee_ids = list({ticket.get("assigned_admin_id") for ticket in tickets if ticket.get("assigned_admin_id")})
        assignees = await db.users.find({"user_id": {"$in": assignee_ids}}, {"_id": 0, "password_hash": 0}).to_list(length=len(assignee_ids) or 1)
        assignee_map = {user["user_id"]: user for user in assignees}
        for ticket in tickets:
            ticket["assignee"] = assignee_map.get(ticket.get("assigned_admin_id"), {})
            ticket["age_hours"] = _ticket_age_hours(ticket)
            ticket["sla_status"] = _ticket_sla_status(ticket)
        return {"tickets": tickets, "total": len(tickets)}
    except Exception as e:
        logger.error(f"Error fetching admin support tickets: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch support tickets")


@router.patch("/admin/{ticket_id}")
async def update_support_ticket(
    ticket_id: str,
    payload: SupportTicketUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    ticket = await db.support_tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Support ticket not found")

    update_doc = {"updated_at": datetime.now(timezone.utc), "assigned_admin_id": current_user["user_id"]}
    if payload.status is not None:
        update_doc["status"] = payload.status.value
        if payload.status in {SupportTicketStatus.RESOLVED, SupportTicketStatus.CLOSED}:
            update_doc["resolved_at"] = datetime.now(timezone.utc)
    if payload.admin_response is not None:
        update_doc["admin_response"] = payload.admin_response.strip()
    if payload.priority is not None:
        update_doc["priority"] = payload.priority.value

    await db.support_tickets.update_one({"ticket_id": ticket_id}, {"$set": update_doc})
    updated = await db.support_tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})

    await send_multi_channel_notification(
        db=db,
        user_id=ticket["user_id"],
        notification_type=NotificationType.SUPPORT_TICKET_UPDATED,
        title="Support ticket updated",
        message=f"Your ticket '{ticket.get('subject', ticket_id)}' is now {updated.get('status', 'updated')}.",
        channels=[NotificationChannel.IN_APP],
        data={"ticket_id": ticket_id, "status": updated.get("status")},
    )
    await write_audit_log(
        db,
        user_id=current_user["user_id"],
        role=current_user["role"],
        module="support_ticket_management",
        action="ticket_status_updated",
        record_id=ticket_id,
        old_value={"status": ticket.get("status"), "priority": ticket.get("priority"), "admin_response": ticket.get("admin_response")},
        new_value={"status": updated.get("status"), "priority": updated.get("priority"), "admin_response": updated.get("admin_response")},
        reason="Support ticket workflow updated",
    )
    return {"ticket": updated, "message": "Support ticket updated successfully."}
