from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal
from models.lead import Lead, LeadCreate, LeadUpdate, LeadStatus
from models.verification import PropertyVerification, VerificationSubmit, VerificationStatus, GeoTaggedPhoto
from models.commission import Commission
from models.property import Property, PropertyCreate, PropertyUpdate
from models.user import UserRole
from middleware.auth_middleware import get_current_user
from services.audit_service import write_audit_log
from services.booking_calculation_service import calculate_configured_charge, extract_booking_pricing_snapshot, get_booking_payment_config, resolve_platform_fee_charge
from services.tds_service import get_active_tds_config
from datetime import datetime, timezone, timedelta
import logging
import asyncio
import re

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/broker", tags=["Broker"])


class BrokerPayoutSettingsUpdate(BaseModel):
    payout_method: Optional[str] = None
    account_holder_name: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    upi_id: Optional[str] = None

async def require_broker(current_user: dict = Depends(get_current_user)):
    """Dependency to check if user is broker."""
    role = current_user.get("role")
    admin_role_key = current_user.get("admin_role_key")
    if role != UserRole.BROKER.value and not (role == UserRole.EMPLOYEE.value and admin_role_key in ["rm", "relationship_manager"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Broker access required"
        )
    return current_user

async def get_db():
    from server import db_instance
    return db_instance


def _clean_identifier(value):
    return str(value).strip() if value not in (None, "", "-", "NA", "N/A") else ""


def _first_present(*values):
    for value in values:
        cleaned = _clean_identifier(value)
        if cleaned:
            return cleaned
    return ""


def _configured_platform_fee_paise(payment_config: dict, context: str, base_amount_paise: int) -> int:
    try:
        base_rupees = Decimal(str((base_amount_paise or 0) / 100))
        amount = calculate_configured_charge(base_rupees, resolve_platform_fee_charge(payment_config, context))
        return int(round(float(amount) * 100))
    except Exception:
        return 0


def _user_identifiers(user: dict) -> list[str]:
    return [
        value
        for value in {
            _clean_identifier(user.get("user_id")),
            _clean_identifier(user.get("employee_code")),
            _clean_identifier(user.get("lg_code")),
            _clean_identifier(user.get("uid")),
        }
        if value
    ]


def _assigned_ref(source: dict | None, field: str) -> str:
    return _clean_identifier((source or {}).get(field))


def _assigned_to_current_broker(assignment: dict, current_user: dict) -> bool:
    return assignment.get("broker_id") in _user_identifiers(current_user)


async def _property_owner_assignment(db: AsyncIOMotorDatabase, property_data: dict) -> tuple[dict, dict]:
    owner = {}
    if property_data.get("owner_id"):
        owner = await db.users.find_one({"user_id": property_data["owner_id"], "role": "host"}, {"_id": 0}) or {}
    owner_found = bool(owner.get("user_id"))
    return owner, {
        "broker_id": _assigned_ref(owner, "broker_id") if owner_found else _assigned_ref(property_data, "broker_id"),
        "rm_id": _assigned_ref(owner, "rm_id") if owner_found else _assigned_ref(property_data, "rm_id"),
        "branch_manager_id": _assigned_ref(owner, "branch_manager_id") if owner_found else _assigned_ref(property_data, "branch_manager_id"),
        "branch_manager_code": _assigned_ref(owner, "branch_manager_code") if owner_found else _assigned_ref(property_data, "branch_manager_code"),
    }


def _get_broker_or_rm_query(current_user: dict, additional_query: dict = None) -> dict:
    user_id = current_user["user_id"]
    is_rm = current_user.get("role") == UserRole.EMPLOYEE.value and current_user.get("admin_role_key") in ["rm", "relationship_manager"]
    q = {}
    if is_rm:
        identifiers = {
            user_id,
            current_user.get("employee_code"),
            current_user.get("uid"),
        }
        identifiers = [i for i in identifiers if i]
        conditions = [
            {"$or": [
                {"rm_id": {"$in": identifiers}},
                {"broker_id": {"$in": identifiers}}
            ]}
        ]
        if additional_query:
            conditions.append(additional_query)
        q["$and"] = conditions
    else:
        identifiers = _user_identifiers(current_user)
        q["broker_id"] = {"$in": identifiers}
        if additional_query:
            q.update(additional_query)
    return q


def _paise(value) -> int:
    try:
        amount = float(value or 0)
    except (TypeError, ValueError):
        return 0
    if amount <= 0:
        return 0
    return int(round(amount if amount >= 10000 else amount * 100))


def _commission_rule(config: dict, role: str) -> dict:
    rule = (config.get("commission_rules") or {}).get(role) or {}
    return rule if rule.get("enabled") else {}


def _gst_split(amount_paise: int) -> dict:
    gst_total = int(round(amount_paise * 0.18))
    cgst = gst_total // 2
    sgst = gst_total - cgst
    return {"commission_cgst": cgst, "commission_sgst": sgst, "commission_igst": 0, "commission_gst_total": gst_total}


def _pan_from_user(user: dict) -> str:
    return _clean_identifier(user.get("pan_number") or user.get("pan") or (user.get("kyc") or {}).get("pan_number"))


def _gstin_from_user(user: dict) -> str:
    return _clean_identifier(
        user.get("gstin")
        or user.get("gst_number")
        or user.get("gst_no")
        or user.get("gstin_number")
        or (user.get("gst") or {}).get("gstin")
        or (user.get("kyc") or {}).get("gstin")
        or (user.get("documents") or {}).get("gstin")
    )


def _settlement_status(value) -> str:
    status_value = str(value or "pending").lower()
    if status_value in {"paid", "processed", "success", "completed"}:
        return "paid"
    if status_value == "approved":
        return "approved"
    if status_value in {"rejected", "failed", "hold", "cancelled"}:
        return status_value
    return "pending"


def _partner_settlement_id(role: str, partner_code: str, booking_id: str) -> str:
    safe_partner = "".join(ch for ch in str(partner_code or "") if ch.isalnum())[-8:] or "NA"
    safe_booking = "".join(ch for ch in str(booking_id or "") if ch.isalnum())[-6:] or "NA"
    return f"SET-{role.upper()}-{safe_partner}-{safe_booking}"


async def _assigned_host_ids_for_current_user(db: AsyncIOMotorDatabase, current_user: dict) -> list[str]:
    owners = await db.users.find(
        _get_broker_or_rm_query(current_user, {"role": "host"}),
        {"_id": 0, "user_id": 1}
    ).to_list(length=3000)
    return [owner["user_id"] for owner in owners if owner.get("user_id")]


async def _assigned_property_query(db: AsyncIOMotorDatabase, current_user: dict, additional_query: dict | None = None) -> dict:
    host_ids = await _assigned_host_ids_for_current_user(db, current_user)
    identifiers = _user_identifiers(current_user)
    assignment_or = []
    if host_ids:
        assignment_or.append({"owner_id": {"$in": host_ids}})
    assignment_or.extend([
        {"broker_id": {"$in": identifiers}},
        {"rm_id": {"$in": identifiers}},
        {"branch_manager_id": {"$in": identifiers}},
    ])
    query = {"$or": assignment_or} if assignment_or else {"property_id": {"$exists": False}}
    if additional_query:
        query = {"$and": [query, additional_query]}
    return query

# ========== BROKER DASHBOARD ==========

def _parse_dt(value):
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None

def _task_sla_status(created_at, sla_hours=24):
    created = _parse_dt(created_at) or datetime.now(timezone.utc)
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    age_hours = (datetime.now(timezone.utc) - created).total_seconds() / 3600
    if age_hours >= sla_hours * 2:
        return "escalated", round(age_hours, 1)
    if age_hours >= sla_hours:
        return "breached", round(age_hours, 1)
    if age_hours >= max(0, sla_hours - 4):
        return "at_risk", round(age_hours, 1)
    return "within_sla", round(age_hours, 1)

def _group_count(rows, key):
    grouped = {}
    for row in rows:
        value = row.get(key) or "unknown"
        grouped[value] = grouped.get(value, 0) + 1
    return grouped

def _group_sum(rows, key, amount_key):
    grouped = {}
    for row in rows:
        value = row.get(key) or "unknown"
        grouped[value] = grouped.get(value, 0) + float(row.get(amount_key) or 0)
    return grouped


def _display_code(user: dict | None, fallback: str = "") -> str:
    if not user:
        return fallback or ""
    if user.get("role") == UserRole.BROKER.value:
        return user.get("lg_code") or user.get("employee_code") or user.get("uid") or fallback or user.get("user_id") or ""
    return user.get("employee_code") or user.get("uid") or fallback or user.get("user_id") or ""

@router.get("/dashboard/stats")
async def get_broker_dashboard_stats(
    current_user: dict = Depends(require_broker),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get broker dashboard statistics."""
    try:
        broker_id = current_user["user_id"]
        
        # Count assigned owners
        total_owners = await db.users.count_documents(_get_broker_or_rm_query(current_user, {"role": "host"}))
        assigned_property_query = await _assigned_property_query(db, current_user)
        
        # Count properties
        total_properties = await db.properties.count_documents(assigned_property_query)
        live_properties = await db.properties.count_documents(await _assigned_property_query(db, current_user, {"status": "live"}))
        
        # Pending verifications
        pending_verifications = await db.property_verifications.count_documents(await _assigned_property_query(db, current_user, {"status": {"$in": ["pending", "in_progress"]}}))
        
        # Leads count
        total_leads = await db.leads.count_documents(_get_broker_or_rm_query(current_user))
        converted_leads = await db.leads.count_documents(_get_broker_or_rm_query(current_user, {"status": "converted"}))
        
        # Commission earnings
        commission_cursor = db.commissions.find(_get_broker_or_rm_query(current_user))
        commissions = await commission_cursor.to_list(length=None)
        total_commission = sum(c.get("commission_amount", 0) for c in commissions)
        paid_commission = sum(c.get("commission_amount", 0) for c in commissions if c.get("payment_status") == "paid")
        
        return {
            "owners": {
                "total": total_owners
            },
            "properties": {
                "total": total_properties,
                "live": live_properties
            },
            "verifications": {
                "pending": pending_verifications
            },
            "leads": {
                "total": total_leads,
                "converted": converted_leads
            },
            "commission": {
                "total": total_commission,
                "paid": paid_commission,
                "pending": total_commission - paid_commission
            }
        }
    
    except Exception as e:
        logger.error(f"Error fetching broker dashboard stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch dashboard stats"
        )

# ========== MY OWNERS ==========

@router.get("/my-owners")
async def get_my_owners(
    current_user: dict = Depends(require_broker),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all property owners assigned to this broker."""
    try:
        broker_id = current_user["user_id"]
        broker_profile = await db.users.find_one(
            {"user_id": broker_id},
            {"_id": 0, "lg_code": 1, "employee_code": 1, "uid": 1}
        ) or {}
        broker_code = (
            broker_profile.get("lg_code")
            or broker_profile.get("employee_code")
            or broker_profile.get("uid")
            or current_user.get("lg_code")
            or current_user.get("employee_code")
            or current_user.get("uid")
            or broker_id
        )
        
        cursor = db.users.find(
            _get_broker_or_rm_query(current_user, {"role": "host"}),
            {"_id": 0, "password_hash": 0}
        )
        owners = await cursor.to_list(length=200)
        rm_ids = list({owner.get("rm_id") for owner in owners if owner.get("rm_id")})
        branch_manager_ids = list({owner.get("branch_manager_id") for owner in owners if owner.get("branch_manager_id")})
        rms = await db.users.find(
            {"user_id": {"$in": list(set(rm_ids + branch_manager_ids))}, "role": "employee"},
            {"_id": 0, "password_hash": 0}
        ).to_list(length=len(set(rm_ids + branch_manager_ids)) or 1)
        rm_map = {rm["user_id"]: rm for rm in rms}
        
        # Get property count for each owner
        for owner in owners:
            owner_id = owner["user_id"]
            rm = rm_map.get(owner.get("rm_id")) or {}
            branch_manager = rm_map.get(owner.get("branch_manager_id")) or {}
            property_count = await db.properties.count_documents({"owner_id": owner_id})
            live_property_count = await db.properties.count_documents({"owner_id": owner_id, "status": "live"})
            pending_property_count = await db.properties.count_documents({
                "owner_id": owner_id,
                "status": {"$in": ["draft", "pending", "pending_verification", "verification_pending", "under_review"]}
            })
            booking_count = await db.bookings.count_documents({"host_id": owner_id})
            revenue_cursor = db.bookings.find(
                {
                    "host_id": owner_id,
                    "payment_status": {"$in": ["paid", "partially_paid"]},
                    "booking_status": {"$nin": ["cancelled", "expired"]}
                },
                {"_id": 0, "total_amount": 1}
            )
            bookings = await revenue_cursor.to_list(length=None)
            revenue_generated = sum(float(booking.get("total_amount") or 0) for booking in bookings)
            owner["property_count"] = property_count
            owner["total_properties"] = property_count
            owner["live_properties"] = live_property_count
            owner["pending_properties"] = pending_property_count
            owner["total_bookings"] = booking_count
            owner["revenue_generated"] = revenue_generated
            owner["broker_lg_code"] = owner.get("lg_code") or broker_code
            owner["rm_code"] = _display_code(rm, owner.get("employee_code") or owner.get("rm_id") or "")
            owner["assigned_rm"] = rm.get("full_name") or owner.get("rm_id")
            owner["assigned_employee"] = owner["rm_code"]
            owner["branch_manager_code"] = _display_code(branch_manager, owner.get("branch_manager_code") or owner.get("branch_manager_id") or "")
            owner["branch_manager_name"] = branch_manager.get("full_name") or owner.get("branch_manager_id") or ""
            owner["rm"] = {
                "user_id": rm.get("user_id") or owner.get("rm_id") or "",
                "full_name": rm.get("full_name") or "",
                "employee_code": _display_code(rm, owner.get("rm_id") or ""),
            }
            owner["branch_manager"] = {
                "user_id": branch_manager.get("user_id") or owner.get("branch_manager_id") or "",
                "full_name": branch_manager.get("full_name") or "",
                "employee_code": _display_code(branch_manager, owner.get("branch_manager_id") or ""),
            }
        
        return {
            "owners": owners,
            "total": len(owners)
        }
    
    except Exception as e:
        logger.error(f"Error fetching owners: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch owners"
        )

@router.get("/owner/{owner_id}/details")
async def get_owner_details(
    owner_id: str,
    current_user: dict = Depends(require_broker),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get a full assigned host detail view for the broker CRM."""
    try:
        broker_id = current_user["user_id"]
        owner = await db.users.find_one(
            _get_broker_or_rm_query(current_user, {"user_id": owner_id, "role": "host"}),
            {"_id": 0, "password_hash": 0}
        )
        if not owner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Owner not found or not assigned to this broker"
            )
        broker_profile = await db.users.find_one(
            {"user_id": broker_id},
            {"_id": 0, "lg_code": 1, "employee_code": 1, "uid": 1}
        ) or {}
        rm = {}
        if owner.get("rm_id"):
            rm = await db.users.find_one(
                {"user_id": owner.get("rm_id"), "role": "employee"},
                {"_id": 0, "password_hash": 0}
            ) or {}
        branch_manager = {}
        if owner.get("branch_manager_id"):
            branch_manager = await db.users.find_one(
                {"user_id": owner.get("branch_manager_id"), "role": "employee"},
                {"_id": 0, "password_hash": 0}
            ) or {}
        owner["broker_lg_code"] = (
            owner.get("lg_code")
            or broker_profile.get("lg_code")
            or broker_profile.get("employee_code")
            or broker_profile.get("uid")
            or current_user.get("lg_code")
            or current_user.get("employee_code")
            or current_user.get("uid")
            or broker_id
        )
        owner["rm_code"] = _display_code(rm, owner.get("employee_code") or owner.get("rm_id") or "")
        owner["assigned_employee"] = owner["rm_code"]
        owner["branch_manager_code"] = _display_code(branch_manager, owner.get("branch_manager_code") or owner.get("branch_manager_id") or "")
        owner["branch_manager_name"] = branch_manager.get("full_name") or owner.get("branch_manager_id") or ""
        owner["rm"] = {
            "user_id": rm.get("user_id") or owner.get("rm_id") or "",
            "full_name": rm.get("full_name") or "",
            "employee_code": _display_code(rm, owner.get("rm_id") or ""),
        }
        owner["branch_manager"] = {
            "user_id": branch_manager.get("user_id") or owner.get("branch_manager_id") or "",
            "full_name": branch_manager.get("full_name") or "",
            "employee_code": _display_code(branch_manager, owner.get("branch_manager_id") or ""),
        }

        properties = await db.properties.find({"owner_id": owner_id}, {"_id": 0}).to_list(length=200)
        bookings = await db.bookings.find({"host_id": owner_id}, {"_id": 0}).sort("created_at", -1).to_list(length=100)
        payments = await db.transactions.find(
            {"$or": [{"host_id": owner_id}, {"user_id": owner_id}]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(length=100)
        verifications = await db.property_verifications.find(
            {"owner_id": owner_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(length=100)
        audit_events = await db.audit_logs.find(
            {"$or": [{"user_id": owner_id}, {"entity_id": owner_id}, {"target_id": owner_id}]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(length=50)

        activity_timeline = []
        for item in bookings[:10]:
            activity_timeline.append({
                "type": "booking",
                "label": item.get("booking_id"),
                "status": item.get("booking_status") or item.get("status"),
                "created_at": item.get("created_at")
            })
        for item in verifications[:10]:
            activity_timeline.append({
                "type": "verification",
                "label": item.get("property_id"),
                "status": item.get("status"),
                "created_at": item.get("created_at")
            })

        return {
            "owner": owner,
            "properties": properties,
            "bookings": bookings,
            "payments": payments,
            "verifications": verifications,
            "audit_events": audit_events,
            "activity_timeline": activity_timeline,
            "assigned_rm": owner.get("rm", {}).get("full_name") or owner.get("rm_id"),
            "assigned_admin": owner.get("assigned_admin_id") or owner.get("admin_id")
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching owner details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch owner details"
        )

# ========== STR PROPERTIES ==========

class BrokerPropertyCreate(PropertyCreate):
    owner_id: str

@router.get("/properties")
async def get_broker_properties(
    status_filter: Optional[str] = None,
    current_user: dict = Depends(require_broker),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all properties under this broker."""
    try:
        query = await _assigned_property_query(db, current_user)
        if status_filter:
            query = {"$and": [query, {"status": status_filter}]}
        
        cursor = db.properties.find(query, {"_id": 0})
        properties = await cursor.to_list(length=200)
        for property_doc in properties:
            owner_id = property_doc.get("owner_id")
            if owner_id:
                owner = await db.users.find_one(
                    {"user_id": owner_id},
                    {"_id": 0, "user_id": 1, "full_name": 1, "email": 1, "phone": 1, "kyc_status": 1, "rm_id": 1}
                )
                property_doc["owner_summary"] = owner or {}
            verification = await db.property_verifications.find_one({"property_id": property_doc.get("property_id")}, {"_id": 0}, sort=[("created_at", -1)])
            property_doc["verification_summary"] = {
                "status": verification.get("status") if verification else "not_started",
                "rm_reviewed": verification.get("rm_reviewed") if verification else False,
                "rm_approved": verification.get("rm_approved") if verification else None,
                "admin_reviewed": verification.get("admin_reviewed") if verification else False,
                "admin_approved": verification.get("admin_approved") if verification else None,
                "updated_at": verification.get("updated_at") if verification else None,
            }
        
        return {
            "properties": properties,
            "total": len(properties)
        }
    
    except Exception as e:
        logger.error(f"Error fetching broker properties: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch properties"
        )

@router.post("/properties", response_model=dict)
async def create_broker_property(
    property_data: BrokerPropertyCreate,
    current_user: dict = Depends(require_broker),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a draft property for a host assigned to this broker."""
    try:
        broker_id = current_user["user_id"]
        is_rm = current_user.get("role") == UserRole.EMPLOYEE.value and current_user.get("admin_role_key") in ["rm", "relationship_manager"]
        owner = await db.users.find_one(
            _get_broker_or_rm_query(current_user, {"user_id": property_data.owner_id, "role": "host"}),
            {"_id": 0, "password_hash": 0}
        )
        if not owner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assigned host not found"
            )
        broker_profile = await db.users.find_one(
            {"user_id": broker_id},
            {"_id": 0, "lg_code": 1, "employee_code": 1, "uid": 1}
        ) or {}
        broker_code = (
            owner.get("lg_code")
            or broker_profile.get("lg_code")
            or broker_profile.get("employee_code")
            or broker_profile.get("uid")
            or current_user.get("lg_code")
            or current_user.get("employee_code")
            or current_user.get("uid")
            or broker_id
        )

        payload = property_data.model_dump(exclude={"owner_id"})
        property_obj = Property(
            owner_id=owner["user_id"],
            broker_id=None if is_rm else broker_id,
            broker_lg_code=broker_code,
            rm_id=broker_id if is_rm else (owner.get("rm_id") or current_user.get("rm_id")),
            employee_id=owner.get("employee_id") or owner.get("assigned_employee_id") or current_user.get("employee_id"),
            created_by_role=current_user.get("role"),
            created_by_user_id=broker_id,
            managed_by_broker_id=None if is_rm else broker_id,
            **payload
        )
        property_dict = property_obj.model_dump()
        await db.properties.insert_one(property_dict)

        try:
            await db.audit_logs.insert_one({
                "module": "broker_property_crm",
                "action": "broker_property_created",
                "record_id": property_obj.property_id,
                "user_id": broker_id,
                "role": current_user.get("role"),
                "new_value": {
                    "property_id": property_obj.property_id,
                    "owner_id": owner["user_id"],
                    "broker_id": None if is_rm else broker_id,
                    "status": property_obj.status.value if hasattr(property_obj.status, "value") else property_obj.status,
                },
                "created_at": datetime.now(timezone.utc),
            })
        except Exception as audit_err:
            logger.warning(f"Failed to write broker property audit: {audit_err}")

        return {
            "message": "Draft property created successfully",
            "property_id": property_obj.property_id,
            "property": property_dict
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating broker property: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create broker property"
        )

@router.patch("/properties/{property_id}", response_model=dict)
async def update_broker_property_draft(
    property_id: str,
    property_data: PropertyUpdate,
    current_user: dict = Depends(require_broker),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update a broker-managed draft property without changing ownership."""
    try:
        broker_id = current_user["user_id"]
        existing_property = await db.properties.find_one(
            _get_broker_or_rm_query(current_user, {"property_id": property_id}),
            {"_id": 0}
        )
        if not existing_property:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Broker property not found"
            )

        editable_statuses = {"draft", "rejected"}
        if existing_property.get("status", "draft") not in editable_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only draft or rejected properties can be edited by broker"
            )

        owner = await db.users.find_one(
            _get_broker_or_rm_query(current_user, {"user_id": existing_property.get("owner_id"), "role": "host"}),
            {"_id": 0, "user_id": 1}
        )
        if not owner:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Property owner is not assigned to this broker"
            )

        update_data = property_data.model_dump(exclude_unset=True)
        update_data.pop("owner_id", None)
        update_data.pop("broker_id", None)
        update_data.pop("property_id", None)
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No draft property changes provided"
            )

        update_data["updated_at"] = datetime.now(timezone.utc)
        update_data["is_edited"] = True
        if existing_property.get("status") == "rejected":
            update_data["status"] = "draft"
        await db.properties.update_one(
            _get_broker_or_rm_query(current_user, {"property_id": property_id}),
            {"$set": update_data}
        )

        updated_property = await db.properties.find_one(
            _get_broker_or_rm_query(current_user, {"property_id": property_id}),
            {"_id": 0}
        )

        try:
            await db.audit_logs.insert_one({
                "module": "broker_property_crm",
                "action": "broker_property_updated",
                "record_id": property_id,
                "user_id": broker_id,
                "role": current_user.get("role"),
                "old_value": {
                    "status": existing_property.get("status"),
                    "title": existing_property.get("title"),
                    "price_per_night": existing_property.get("price_per_night"),
                },
                "new_value": {
                    "status": updated_property.get("status"),
                    "title": updated_property.get("title"),
                    "price_per_night": updated_property.get("price_per_night"),
                },
                "created_at": datetime.now(timezone.utc),
            })
        except Exception as audit_err:
            logger.warning(f"Failed to write broker property update audit: {audit_err}")

        return {
            "message": "Draft property updated successfully",
            "property_id": property_id,
            "property": updated_property
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating broker property draft: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update broker property"
        )

@router.post("/properties/{property_id}/start-rework", response_model=dict)
async def start_broker_property_rework(
    property_id: str,
    current_user: dict = Depends(require_broker),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Move a rejected broker property back to draft for correction."""
    try:
        broker_id = current_user["user_id"]
        property_data = await db.properties.find_one(
            _get_broker_or_rm_query(current_user, {"property_id": property_id}),
            {"_id": 0}
        )
        if not property_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Broker property not found"
            )

        verification = await db.property_verifications.find_one(
            _get_broker_or_rm_query(current_user, {"property_id": property_id}),
            {"_id": 0},
            sort=[("created_at", -1)]
        )
        is_rejected = (
            property_data.get("status") == "rejected"
            or (verification and verification.get("rm_reviewed") and verification.get("rm_approved") is False)
            or (verification and verification.get("admin_reviewed") and verification.get("admin_approved") is False)
            or (verification and verification.get("status") == "rejected")
        )
        if not is_rejected:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only rejected properties can be moved to rework"
            )

        now = datetime.now(timezone.utc)
        await db.properties.update_one(
            _get_broker_or_rm_query(current_user, {"property_id": property_id}),
            {"$set": {
                "status": "draft",
                "is_edited": True,
                "updated_at": now,
            }}
        )
        if verification:
            await db.property_verifications.update_one(
                {"verification_id": verification["verification_id"]},
                {"$set": {
                    "status": VerificationStatus.PENDING.value,
                    "rm_reviewed": False,
                    "rm_approved": False,
                    "admin_reviewed": False,
                    "admin_approved": False,
                    "updated_at": now,
                }}
            )

        try:
            await db.audit_logs.insert_one({
                "module": "broker_property_crm",
                "action": "broker_property_rework_started",
                "record_id": property_id,
                "user_id": broker_id,
                "role": current_user.get("role"),
                "old_value": {
                    "property_status": property_data.get("status"),
                    "verification_status": verification.get("status") if verification else None,
                },
                "new_value": {"property_status": "draft"},
                "created_at": now,
            })
        except Exception as audit_err:
            logger.warning(f"Failed to write broker property rework audit: {audit_err}")

        updated_property = await db.properties.find_one(
            _get_broker_or_rm_query(current_user, {"property_id": property_id}),
            {"_id": 0}
        )
        return {
            "message": "Property moved to draft for rework",
            "property_id": property_id,
            "property": updated_property
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting broker property rework: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start property rework"
        )

@router.post("/properties/{property_id}/submit-verification", response_model=dict)
async def submit_broker_property_for_verification(
    property_id: str,
    current_user: dict = Depends(require_broker),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Submit a broker-created draft property into the verification queue."""
    try:
        broker_id = current_user["user_id"]
        is_rm = current_user.get("role") == UserRole.EMPLOYEE.value and current_user.get("admin_role_key") in ["rm", "relationship_manager"]
        property_data = await db.properties.find_one(
            _get_broker_or_rm_query(current_user, {"property_id": property_id}),
            {"_id": 0}
        )
        if not property_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Broker property not found"
            )

        if property_data.get("status", "draft") != "draft":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only draft properties can be submitted for verification"
            )

        required_fields = ["title", "description", "property_type", "category", "bhk_type", "address", "city", "state", "pin_code", "area_sqft", "max_guests", "price_per_night"]
        missing_fields = [field for field in required_fields if property_data.get(field) in [None, "", []]]
        if missing_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Complete required fields before verification: {', '.join(missing_fields)}"
            )

        owner = await db.users.find_one(
            _get_broker_or_rm_query(current_user, {"user_id": property_data.get("owner_id"), "role": "host"}),
            {"_id": 0, "user_id": 1, "rm_id": 1}
        )
        if not owner:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Property owner is not assigned to this broker"
            )

        now = datetime.now(timezone.utc)
        existing_verification = await db.property_verifications.find_one(
            _get_broker_or_rm_query(current_user, {"property_id": property_id}),
            {"_id": 0}
        )
        if existing_verification:
            verification_id = existing_verification["verification_id"]
            await db.property_verifications.update_one(
                {"verification_id": verification_id},
                {"$set": {
                    "owner_id": property_data["owner_id"],
                    "status": VerificationStatus.PENDING.value,
                    "rm_reviewed": False,
                    "rm_approved": False,
                    "rm_remarks": None,
                    "rm_id": broker_id if is_rm else (owner.get("rm_id") or property_data.get("rm_id") or current_user.get("rm_id")),
                    "broker_remarks": "Broker submitted draft property for verification",
                    "updated_at": now,
                }}
            )
        else:
            verification = PropertyVerification(
                property_id=property_id,
                broker_id="" if is_rm else broker_id,
                owner_id=property_data["owner_id"],
                status=VerificationStatus.PENDING,
                rm_id=broker_id if is_rm else (owner.get("rm_id") or property_data.get("rm_id") or current_user.get("rm_id")),
                broker_remarks="Broker submitted draft property for verification"
            )
            verification_doc = verification.model_dump()
            await db.property_verifications.insert_one(verification_doc)
            verification_id = verification.verification_id

        await db.properties.update_one(
            _get_broker_or_rm_query(current_user, {"property_id": property_id}),
            {"$set": {
                "status": "pending_verification",
                "submitted_at": now,
                "updated_at": now,
            }}
        )

        try:
            await db.audit_logs.insert_one({
                "module": "broker_property_crm",
                "action": "broker_property_submitted_for_verification",
                "record_id": property_id,
                "user_id": broker_id,
                "role": current_user.get("role"),
                "old_value": {"status": property_data.get("status")},
                "new_value": {"status": "pending_verification", "verification_id": verification_id},
                "created_at": now,
            })
        except Exception as audit_err:
            logger.warning(f"Failed to write broker property submit audit: {audit_err}")

        return {
            "message": "Property submitted for verification",
            "property_id": property_id,
            "verification_id": verification_id,
            "status": "pending_verification"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting broker property for verification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit property for verification"
        )

# ========== LEADS MANAGEMENT ==========

@router.get("/bookings")
async def get_broker_bookings(
    status_filter: Optional[str] = None,
    current_user: dict = Depends(require_broker),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get broker-owned bookings with backward-compatible property ownership fallback."""
    try:
        broker_id = current_user["user_id"]
        assigned_property_ids = [
            prop["property_id"]
            for prop in await db.properties.find({"broker_id": broker_id}, {"_id": 0, "property_id": 1}).to_list(length=500)
        ]
        query = {
            "$or": [
                {"broker_id": broker_id},
                {"property_id": {"$in": assigned_property_ids}}
            ]
        }
        if status_filter:
            query["booking_status"] = status_filter

        bookings = await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=300)
        property_ids = list({booking.get("property_id") for booking in bookings if booking.get("property_id")})
        host_ids = list({booking.get("host_id") for booking in bookings if booking.get("host_id")})
        guest_ids = list({booking.get("guest_id") for booking in bookings if booking.get("guest_id")})
        properties = await db.properties.find(
            {"property_id": {"$in": property_ids}},
            {"_id": 0, "property_id": 1, "title": 1, "city": 1, "status": 1, "owner_id": 1}
        ).to_list(length=len(property_ids) or 1)
        hosts = await db.users.find(
            {"user_id": {"$in": host_ids}},
            {"_id": 0, "user_id": 1, "full_name": 1, "email": 1, "phone": 1, "kyc_status": 1}
        ).to_list(length=len(host_ids) or 1)
        guests = await db.users.find(
            {"user_id": {"$in": guest_ids}},
            {"_id": 0, "user_id": 1, "full_name": 1, "email": 1, "phone": 1}
        ).to_list(length=len(guest_ids) or 1)
        property_map = {prop["property_id"]: prop for prop in properties}
        host_map = {host["user_id"]: host for host in hosts}
        guest_map = {guest["user_id"]: guest for guest in guests}
        for booking in bookings:
            booking["property_summary"] = property_map.get(booking.get("property_id"), {})
            booking["host_summary"] = host_map.get(booking.get("host_id"), {})
            booking["guest_summary"] = guest_map.get(booking.get("guest_id"), {})

        total_revenue = sum(float(booking.get("total_amount") or 0) for booking in bookings if booking.get("payment_status") in {"paid", "partially_paid"})
        return {
            "bookings": bookings,
            "total": len(bookings),
            "summary": {
                "confirmed": sum(1 for booking in bookings if booking.get("booking_status") == "confirmed"),
                "soft_lock": sum(1 for booking in bookings if booking.get("booking_status") == "soft_lock"),
                "cancelled": sum(1 for booking in bookings if booking.get("booking_status") == "cancelled"),
                "completed": sum(1 for booking in bookings if booking.get("booking_status") == "completed"),
                "revenue": total_revenue
            }
        }
    except Exception as e:
        logger.error(f"Error fetching broker bookings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch broker bookings"
        )

@router.get("/tasks")
async def get_broker_tasks(
    current_user: dict = Depends(require_broker),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get broker task queue, activity feed and escalation watchlist."""
    try:
        broker_id = current_user["user_id"]
        tasks = []

        verifications = await db.property_verifications.find(
            {"broker_id": broker_id, "status": {"$in": ["pending", "in_progress", "rejected"]}},
            {"_id": 0}
        ).sort("created_at", -1).to_list(length=100)
        for item in verifications:
            sla_status, age_hours = _task_sla_status(item.get("created_at"), 24)
            tasks.append({
                "task_id": item.get("verification_id") or item.get("property_id"),
                "type": "verification",
                "title": "Property verification visit",
                "entity_id": item.get("property_id"),
                "status": item.get("status"),
                "priority": "high" if sla_status in {"breached", "escalated"} else "normal",
                "sla_status": sla_status,
                "age_hours": age_hours,
                "assigned_rm": item.get("rm_id"),
                "created_at": item.get("created_at"),
            })

        leads = await db.leads.find(
            {"broker_id": broker_id, "status": {"$in": ["new", "contacted"]}},
            {"_id": 0}
        ).sort("created_at", -1).to_list(length=100)
        for item in leads:
            sla_status, age_hours = _task_sla_status(item.get("created_at"), 12)
            tasks.append({
                "task_id": item.get("lead_id"),
                "type": "lead_follow_up",
                "title": f"Lead follow-up: {item.get('full_name', 'Guest lead')}",
                "entity_id": item.get("lead_id"),
                "status": item.get("status"),
                "priority": "high" if sla_status in {"breached", "escalated"} else "normal",
                "sla_status": sla_status,
                "age_hours": age_hours,
                "assigned_rm": current_user.get("rm_id"),
                "created_at": item.get("created_at"),
            })

        tickets = await db.support_tickets.find(
            {"user_broker_id": broker_id, "status": {"$nin": ["resolved", "closed"]}},
            {"_id": 0}
        ).sort("created_at", -1).to_list(length=100)
        for item in tickets:
            sla_status, age_hours = _task_sla_status(item.get("sla_due_at") or item.get("created_at"), 8)
            tasks.append({
                "task_id": item.get("ticket_id"),
                "type": "support_ticket",
                "title": item.get("subject") or "Support ticket",
                "entity_id": item.get("ticket_id"),
                "status": item.get("status"),
                "priority": item.get("priority") or "normal",
                "sla_status": sla_status,
                "age_hours": age_hours,
                "assigned_rm": item.get("user_rm_id") or current_user.get("rm_id"),
                "created_at": item.get("created_at"),
            })

        tasks.sort(key=lambda row: (_parse_dt(row.get("created_at")) or datetime.min.replace(tzinfo=timezone.utc)), reverse=True)
        escalations = [task for task in tasks if task["sla_status"] in {"at_risk", "breached", "escalated"}]
        activity = await db.audit_logs.find(
            {
                "$or": [
                    {"user_id": broker_id},
                    {"record_id": broker_id},
                    {"new_value.broker_id": broker_id},
                ]
            },
            {"_id": 0}
        ).sort("created_at", -1).limit(50).to_list(length=50)

        return {
            "tasks": tasks[:200],
            "escalations": escalations[:50],
            "activity": activity,
            "summary": {
                "open_tasks": len(tasks),
                "high_priority": len([task for task in tasks if task.get("priority") in {"high", "urgent"}]),
                "at_risk": len([task for task in tasks if task.get("sla_status") == "at_risk"]),
                "breached": len([task for task in tasks if task.get("sla_status") in {"breached", "escalated"}]),
            }
        }
    except Exception as e:
        logger.error(f"Error fetching broker tasks: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch broker tasks"
        )

@router.get("/analytics")
async def get_broker_analytics(
    current_user: dict = Depends(require_broker),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get broker performance analytics and audit readiness data."""
    try:
        broker_id = current_user["user_id"]
        host_ids = [
            host["user_id"]
            for host in await db.users.find({"broker_id": broker_id, "role": "host"}, {"_id": 0, "user_id": 1}).to_list(length=500)
        ]
        property_ids = [
            prop["property_id"]
            for prop in await db.properties.find({"broker_id": broker_id}, {"_id": 0, "property_id": 1}).to_list(length=500)
        ]
        booking_query = {
            "$or": [
                {"broker_id": broker_id},
                {"property_id": {"$in": property_ids}},
                {"host_id": {"$in": host_ids}},
            ]
        }
        bookings = await db.bookings.find(booking_query, {"_id": 0}).to_list(length=1000)
        leads = await db.leads.find({"broker_id": broker_id}, {"_id": 0}).to_list(length=1000)
        commissions = await db.commissions.find({"broker_id": broker_id}, {"_id": 0}).to_list(length=1000)
        verifications = await db.property_verifications.find({"broker_id": broker_id}, {"_id": 0}).to_list(length=1000)
        audits = await db.audit_logs.find(
            {"$or": [{"user_id": broker_id}, {"record_id": broker_id}, {"new_value.broker_id": broker_id}]},
            {"_id": 0}
        ).sort("created_at", -1).limit(100).to_list(length=100)

        paid_bookings = [booking for booking in bookings if booking.get("payment_status") in {"paid", "partially_paid"}]
        revenue = sum(float(booking.get("total_amount") or 0) for booking in paid_bookings)
        converted = len([lead for lead in leads if lead.get("status") == "converted"])
        live_properties = await db.properties.count_documents({"broker_id": broker_id, "status": "live"})
        total_properties = len(property_ids)

        return {
            "metrics": {
                "hosts": len(host_ids),
                "properties": total_properties,
                "live_properties": live_properties,
                "property_activation_rate": round((live_properties / total_properties) * 100, 1) if total_properties else 0,
                "bookings": len(bookings),
                "paid_bookings": len(paid_bookings),
                "revenue": revenue,
                "leads": len(leads),
                "converted_leads": converted,
                "lead_conversion_rate": round((converted / len(leads)) * 100, 1) if leads else 0,
                "pending_verifications": len([item for item in verifications if item.get("status") in {"pending", "in_progress"}]),
                "commission_total": sum(float(item.get("commission_amount") or 0) for item in commissions),
                "commission_pending": sum(float(item.get("commission_amount") or 0) for item in commissions if item.get("payment_status") != "paid"),
                "audit_events": len(audits),
            },
            "trends": {
                "bookings_by_status": _group_count(bookings, "booking_status"),
                "leads_by_status": _group_count(leads, "status"),
                "verifications_by_status": _group_count(verifications, "status"),
                "commission_by_status": _group_sum(commissions, "payment_status", "commission_amount"),
            },
            "audit": {
                "recent_events": audits,
                "coverage": [
                    {"module": "Host Management", "status": "ready", "source": "/broker/my-owners + /broker/owner/{id}/details"},
                    {"module": "Property CRM", "status": "ready", "source": "/broker/properties"},
                    {"module": "Bookings", "status": "ready", "source": "/broker/bookings + booking snapshot fields"},
                    {"module": "Tasks & Escalations", "status": "ready", "source": "/broker/tasks"},
                    {"module": "Analytics", "status": "ready", "source": "/broker/analytics"},
                ]
            }
        }
    except Exception as e:
        logger.error(f"Error fetching broker analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch broker analytics"
        )

@router.get("/leads")
async def get_broker_leads(
    status_filter: Optional[LeadStatus] = None,
    current_user: dict = Depends(require_broker),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all leads for this broker."""
    try:
        broker_id = current_user["user_id"]
        
        query = {"broker_id": broker_id}
        if status_filter:
            query["status"] = status_filter.value
        
        cursor = db.leads.find(query, {"_id": 0}).sort("created_at", -1)
        leads = await cursor.to_list(length=200)
        
        return {
            "leads": leads,
            "total": len(leads)
        }
    
    except Exception as e:
        logger.error(f"Error fetching leads: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch leads"
        )

@router.post("/leads")
async def create_lead(
    lead_data: LeadCreate,
    current_user: dict = Depends(require_broker),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new lead."""
    try:
        broker_id = current_user["user_id"]
        
        lead = Lead(
            broker_id=broker_id,
            **lead_data.model_dump()
        )
        
        lead_dict = lead.model_dump()
        await db.leads.insert_one(lead_dict)
        
        logger.info(f"Lead created: {lead.lead_id} by broker {broker_id}")
        return {"message": "Lead created successfully", "lead_id": lead.lead_id}
    
    except Exception as e:
        logger.error(f"Error creating lead: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create lead"
        )

@router.patch("/leads/{lead_id}")
async def update_lead(
    lead_id: str,
    lead_update: LeadUpdate,
    current_user: dict = Depends(require_broker),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update lead status and notes."""
    try:
        broker_id = current_user["user_id"]
        
        # Check ownership
        lead = await db.leads.find_one({"lead_id": lead_id, "broker_id": broker_id})
        if not lead:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lead not found"
            )
        
        update_data = {"updated_at": datetime.now(timezone.utc)}
        
        if lead_update.status:
            update_data["status"] = lead_update.status.value
            if lead_update.status == LeadStatus.CONTACTED:
                update_data["contacted_at"] = datetime.now(timezone.utc)
            elif lead_update.status == LeadStatus.CONVERTED:
                update_data["converted_at"] = datetime.now(timezone.utc)
        
        if lead_update.notes is not None:
            update_data["notes"] = lead_update.notes
        
        await db.leads.update_one(
            {"lead_id": lead_id},
            {"$set": update_data}
        )
        
        logger.info(f"Lead updated: {lead_id}")
        return {"message": "Lead updated successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating lead: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update lead"
        )

# ========== VERIFICATION TASKS ==========

@router.get("/verifications")
async def get_verification_tasks(
    status_filter: Optional[VerificationStatus] = None,
    current_user: dict = Depends(require_broker),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all verification tasks for this broker."""
    try:
        additional_q = {}
        if status_filter:
            additional_q["status"] = status_filter.value
        
        query = _get_broker_or_rm_query(current_user, additional_q)
        if current_user.get("role") == UserRole.BROKER.value:
            assigned_hosts = await db.users.find(
                {"role": "host", "broker_id": {"$in": _user_identifiers(current_user)}},
                {"_id": 0, "user_id": 1}
            ).to_list(length=3000)
            assigned_host_ids = [host["user_id"] for host in assigned_hosts if host.get("user_id")]
            broker_query_or = [{"broker_id": current_user["user_id"]}]
            if assigned_host_ids:
                broker_query_or.append({"owner_id": {"$in": assigned_host_ids}})
            query = {"$or": broker_query_or}
            if additional_q:
                query = {"$and": [query, additional_q]}
        cursor = db.property_verifications.find(query, {"_id": 0}).sort("created_at", -1)
        raw_verifications = await cursor.to_list(length=300)
        
        # Enrich with property details
        verifications = []
        for verification in raw_verifications:
            property_data = await db.properties.find_one(
                {"property_id": verification["property_id"]},
                {"_id": 0}
            )
            if property_data:
                verification["property_details"] = property_data
            owner_id = verification.get("owner_id") or (property_data or {}).get("owner_id")
            owner = {}
            if owner_id:
                owner = await db.users.find_one(
                    {"user_id": owner_id},
                    {"_id": 0, "user_id": 1, "full_name": 1, "email": 1, "phone": 1, "kyc_status": 1, "broker_id": 1, "rm_id": 1, "branch_manager_id": 1, "branch_manager_code": 1}
                ) or {}
                verification["owner_summary"] = owner or {}
            _, assignment = await _property_owner_assignment(db, property_data or {})
            if current_user.get("role") == UserRole.BROKER.value and not _assigned_to_current_broker(assignment, current_user):
                continue
            if current_user.get("role") == UserRole.EMPLOYEE.value and current_user.get("admin_role_key") in ["rm", "relationship_manager"]:
                if assignment.get("rm_id") not in _user_identifiers(current_user):
                    continue
            verification["broker_id"] = assignment.get("broker_id") or ("" if current_user.get("role") == UserRole.EMPLOYEE.value else verification.get("broker_id") or "")
            verification["rm_id"] = assignment.get("rm_id") or verification.get("rm_id") or ""
            verification["branch_manager_id"] = assignment.get("branch_manager_id") or assignment.get("branch_manager_code") or verification.get("branch_manager_id") or ""
            verifications.append(verification)
            if len(verifications) >= 100:
                break

        summary = {
            "total": len(verifications),
            "pending_visit": sum(1 for item in verifications if item.get("status") in {"pending", "in_progress"}),
            "broker_submitted": sum(1 for item in verifications if item.get("status") == "completed"),
            "rm_pending": sum(1 for item in verifications if item.get("status") == "completed" and not item.get("rm_reviewed")),
            "rm_approved": sum(1 for item in verifications if item.get("rm_reviewed") and item.get("rm_approved") is True),
            "rm_rejected": sum(1 for item in verifications if item.get("rm_reviewed") and item.get("rm_approved") is False),
            "branch_manager_pending": sum(1 for item in verifications if item.get("status") == "completed" and item.get("branch_manager_id") and not item.get("branch_manager_reviewed") and ((item.get("rm_reviewed") and item.get("rm_approved") is True) or not item.get("broker_id"))),
            "branch_manager_approved": sum(1 for item in verifications if item.get("branch_manager_reviewed") and item.get("branch_manager_approved") is True),
            "branch_manager_rejected": sum(1 for item in verifications if item.get("branch_manager_reviewed") and item.get("branch_manager_approved") is False),
            "admin_approved": sum(1 for item in verifications if item.get("admin_reviewed") and item.get("admin_approved") is True),
            "admin_rejected": sum(1 for item in verifications if item.get("admin_reviewed") and item.get("admin_approved") is False),
        }
        
        return {
            "verifications": verifications,
            "total": len(verifications),
            "summary": summary
        }
    
    except Exception as e:
        logger.error(f"Error fetching verifications: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch verification tasks"
        )

@router.post("/verifications/{property_id}/submit")
async def submit_verification(
    property_id: str,
    verification_data: VerificationSubmit,
    current_user: dict = Depends(require_broker),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Submit property verification after site visit."""
    try:
        broker_id = current_user["user_id"]
        is_rm = current_user.get("role") == UserRole.EMPLOYEE.value and current_user.get("admin_role_key") in ["rm", "relationship_manager"]
        
        # Get property
        property_data = await db.properties.find_one({"property_id": property_id})
        if not property_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )

        owner_data, assignment = await _property_owner_assignment(db, property_data)
        
        assigned_id = assignment.get("rm_id") if is_rm else assignment.get("broker_id")
        if is_rm:
            identifiers = _user_identifiers(current_user)
            assigned_refs = [
                assignment.get("rm_id"),
                assignment.get("branch_manager_id"),
                assignment.get("branch_manager_code"),
            ]
            if not any(ref and ref in identifiers for ref in assigned_refs):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="This property is not assigned to this RM"
                )
        else:
            if assigned_id != broker_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="This property is not assigned to this broker"
                )
        if property_data.get("status") not in {"pending_verification", "under_review", "draft", "rejected"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Property is not ready for broker verification"
            )

        checklist = verification_data.checklist.model_dump()
        failed_items = [key for key, value in checklist.items() if value is False]
        if failed_items and not (verification_data.broker_remarks or "").strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Broker remarks are required when any checklist item is unchecked"
            )
        if not verification_data.geo_tagged_photos:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one geo-tagged photo is required"
            )
        for index, photo in enumerate(verification_data.geo_tagged_photos, start=1):
            if not photo.photo_url:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Photo {index} URL is required"
                )
            if not (-90 <= float(photo.latitude) <= 90) or not (-180 <= float(photo.longitude) <= 180):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Photo {index} has invalid latitude or longitude"
                )
            if float(photo.latitude) == 0 and float(photo.longitude) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Photo {index} requires real geo coordinates"
                )
        
        # Resolve review chain from the host registration assignment.
        owner_rm_id = broker_id if is_rm else None
        if not owner_rm_id:
            owner_rm_id = assignment.get("rm_id") or property_data.get("rm_id")
        if not owner_rm_id:
            broker_user = await db.users.find_one({"user_id": broker_id})
            if broker_user:
                owner_rm_id = broker_user.get("rm_id")
        owner_branch_manager_id = assignment.get("branch_manager_id") or assignment.get("branch_manager_code") or property_data.get("branch_manager_id")
        is_rm_to_bm_flow = bool(is_rm and owner_branch_manager_id)

        # Check if verification already exists
        existing = await db.property_verifications.find_one(
            {"property_id": property_id}
        )
        
        if existing:
            # Update existing verification
            await db.property_verifications.update_one(
                {"verification_id": existing["verification_id"]},
                {"$set": {
                    "checklist": verification_data.checklist.model_dump(),
                    "geo_tagged_photos": [p.model_dump() for p in verification_data.geo_tagged_photos],
                    "video_url": verification_data.video_url,
                    "broker_remarks": verification_data.broker_remarks,
                    "status": VerificationStatus.COMPLETED.value,
                    "broker_id": "" if is_rm else broker_id,
                    "rm_reviewed": True if is_rm_to_bm_flow else False,
                    "rm_approved": True if is_rm_to_bm_flow else None,
                    "rm_remarks": None,
                    "rm_id": owner_rm_id,
                    "reviewed_at": datetime.now(timezone.utc) if is_rm_to_bm_flow else None,
                    "branch_manager_id": owner_branch_manager_id,
                    "branch_manager_reviewed": False,
                    "branch_manager_approved": None,
                    "branch_manager_remarks": None,
                    "branch_manager_reviewed_at": None,
                    "admin_reviewed": False,
                    "admin_approved": False,
                    "admin_remarks": None,
                    "admin_id": None,
                    "admin_reviewed_at": None,
                    "completed_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                }}
            )
            verification_id = existing["verification_id"]
        else:
            # Create new verification
            verification = PropertyVerification(
                property_id=property_id,
                broker_id="" if is_rm else broker_id,
                owner_id=(owner_data or {}).get("user_id") or property_data["owner_id"],
                checklist=verification_data.checklist,
                geo_tagged_photos=verification_data.geo_tagged_photos,
                video_url=verification_data.video_url,
                broker_remarks=verification_data.broker_remarks,
                status=VerificationStatus.COMPLETED,
                rm_id=owner_rm_id,
                branch_manager_id=owner_branch_manager_id
            )
            
            verification_dict = verification.model_dump()
            verification_dict.update({
                "rm_reviewed": True if is_rm_to_bm_flow else False,
                "rm_approved": True if is_rm_to_bm_flow else None,
                "reviewed_at": datetime.now(timezone.utc) if is_rm_to_bm_flow else None,
                "branch_manager_id": owner_branch_manager_id,
                "branch_manager_reviewed": False,
                "branch_manager_approved": None,
                "branch_manager_remarks": None,
                "branch_manager_reviewed_at": None,
            })
            await db.property_verifications.insert_one(verification_dict)
            verification_id = verification.verification_id
        
        # Update property status
        await db.properties.update_one(
            {"property_id": property_id},
            {"$set": {
                "status": "under_review",
                "updated_at": datetime.now(timezone.utc)
            }}
        )

        try:
            await write_audit_log(
                db,
                user_id=broker_id,
                role=current_user.get("role"),
                module="broker_verification",
                action="broker_site_visit_submitted",
                record_id=verification_id,
                old_value={
                    "property_status": property_data.get("status"),
                    "verification_status": existing.get("status") if existing else None,
                    "rm_reviewed": existing.get("rm_reviewed") if existing else None,
                },
                new_value={
                    "property_id": property_id,
                    "property_status": "under_review",
                    "verification_status": VerificationStatus.COMPLETED.value,
                    "photo_count": len(verification_data.geo_tagged_photos),
                    "failed_checklist_items": failed_items,
                    "rm_id": owner_rm_id,
                },
                reason=verification_data.broker_remarks or "",
            )
        except Exception as audit_err:
            logger.warning(f"Failed to write broker site visit audit: {audit_err}")

        # Notify RMs and host that broker visit is complete
        try:
            from services.verification_workflow import on_broker_submit
            verification_doc = await db.property_verifications.find_one(
                {"verification_id": verification_id}, {"_id": 0}
            )
            if verification_doc:
                asyncio.create_task(on_broker_submit(db, verification_doc))
        except Exception as wf_err:
            logger.warning(f"Verification workflow trigger (broker submit) failed: {wf_err}")

        logger.info(f"Verification submitted: {verification_id} for property {property_id}")
        return {
            "message": "Verification submitted successfully",
            "verification_id": verification_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting verification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit verification"
        )

# ========== COMMISSION TRACKING ==========

@router.get("/commissions")
async def get_broker_commissions(
    payment_status: Optional[str] = None,
    current_user: dict = Depends(require_broker),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get saved and calculated commissions for this broker/RM workspace."""
    try:
        try:
            from services.account_service import sweep_payout_eligibility
            await sweep_payout_eligibility(db)
        except Exception as sweep_err:
            logger.warning("Could not sweep payout eligibility before broker commissions: %s", sweep_err)

        broker_id = current_user["user_id"]
        lookup_values = _user_identifiers(current_user)
        db_user = None
        for field in ("user_id", "employee_code", "lg_code", "uid"):
            for value in lookup_values:
                db_user = await db.users.find_one({field: value}, {"_id": 0})
                if db_user:
                    break
            if db_user:
                break
        current_email = _clean_identifier(current_user.get("email"))
        if not db_user and current_email:
            db_user = await db.users.find_one({"email": current_email}, {"_id": 0})
        db_user = db_user or current_user
        broker_id = db_user.get("user_id") or broker_id
        identifiers = list(dict.fromkeys(_user_identifiers(current_user) + _user_identifiers(db_user)))
        payment_config = await get_booking_payment_config(db)
        broker_rule = _commission_rule(payment_config, "broker")
        broker_rate = float(broker_rule.get("value") or broker_rule.get("percent") or 0)
        tds_config = await get_active_tds_config(db, role="broker")
        pan_number = _pan_from_user(db_user)
        gstin_number = _gstin_from_user(db_user)
        tds_rate = float((tds_config.get("rate_percent") if pan_number else tds_config.get("missing_pan_rate")) or 0)
        is_rm_workspace = current_user.get("role") == UserRole.EMPLOYEE.value and current_user.get("admin_role_key") in ["rm", "relationship_manager"]
        partner_role = "employee" if is_rm_workspace else "broker"
        partner_code = db_user.get("lg_code") or db_user.get("employee_code") or broker_id

        # Partner dashboard must mirror the admin settlement ledger. Legacy
        # commission documents can contain non-settlement/future rows, so the
        # dashboard below is derived only from eligible payout rows.
        saved_commissions = []
        commissions_by_booking = {}
        for item in saved_commissions:
            amount = _paise(item.get("commission_amount"))
            gst = _gst_split(amount) if gstin_number else {"commission_cgst": 0, "commission_sgst": 0, "commission_igst": 0, "commission_gst_total": 0}
            tds_amount = _paise(item.get("tds_amount")) or int(round(amount * (tds_rate / 100)))
            row = {
                **item,
                "commission_id": _partner_settlement_id("broker", db_user.get("lg_code") or db_user.get("employee_code") or item.get("broker_code") or broker_id, item.get("booking_id") or item.get("commission_id")),
                "broker_id": broker_id,
                "broker_name": db_user.get("full_name") or item.get("broker_name"),
                "broker_code": db_user.get("lg_code") or db_user.get("employee_code") or item.get("broker_code"),
                "broker_email": db_user.get("email"),
                "broker_phone": db_user.get("phone") or db_user.get("mobile") or db_user.get("contact_number"),
                "broker_address": db_user.get("address"),
                "broker_city": db_user.get("city"),
                "broker_state": db_user.get("state"),
                "broker_pin_code": db_user.get("pin_code") or db_user.get("pincode"),
                "broker_pan_number": pan_number,
                "broker_gstin": gstin_number,
                "commission_amount": amount,
                "gross_amount": amount,
                **gst,
                "tds_rate_percent": tds_rate,
                "tds_amount": tds_amount,
                "net_amount": max(0, amount + gst["commission_gst_total"] - tds_amount),
                "payment_status": _settlement_status(item.get("payment_status") or item.get("status")),
            }
            commissions_by_booking[row.get("booking_id") or row.get("commission_id")] = row

        payout_rows = await db.payouts.find({}, {"_id": 0}).sort("eligible_at", -1).limit(1000).to_list(length=1000)
        transaction_rows = await db.transactions.find(
            {"type": "booking_payment", "status": "success"},
            {"_id": 0},
        ).sort("created_at", -1).limit(1000).to_list(length=1000)
        direct_booking_rows = await db.bookings.find(
            {
                "booking_status": "confirmed",
                "payment_status": {"$in": ["paid", "success", "captured", "completed"]},
            },
            {"_id": 0},
        ).sort("created_at", -1).limit(1000).to_list(length=1000)
        source_rows = [
            {**row, "_settlement_source": "Payout"} for row in payout_rows
        ] + [
            {**row, "_settlement_source": "Transaction"} for row in transaction_rows
        ] + [
            {**row, "_settlement_source": "Booking"} for row in direct_booking_rows
        ]
        for payout in source_rows:
            booking_id = payout.get("booking_id") or (payout.get("booking") or {}).get("booking_id")
            if not booking_id or booking_id in commissions_by_booking:
                continue
            booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0}) or {}
            prop = await db.properties.find_one({"property_id": payout.get("property_id") or booking.get("property_id")}, {"_id": 0}) or {}
            host = await db.users.find_one({"user_id": payout.get("host_id") or booking.get("host_id") or prop.get("owner_id")}, {"_id": 0}) or {}
            booking_status = str(booking.get("booking_status") or (payout.get("booking") or {}).get("booking_status") or "").strip().lower()
            payment_status_value = str(booking.get("payment_status") or (payout.get("booking") or {}).get("payment_status") or payout.get("payment_status") or "").strip().lower()
            if booking_status != "confirmed" or payment_status_value not in {"paid", "success", "captured", "completed"}:
                continue
            booking_status_text = " ".join(str(value or "").lower() for value in [
                booking.get("status"),
                booking_status,
                payment_status_value,
                booking.get("refund_status"),
                payout.get("status"),
                payout.get("refund_status"),
                (payout.get("booking") or {}).get("status"),
                (payout.get("booking") or {}).get("booking_status"),
                (payout.get("booking") or {}).get("payment_status"),
                (payout.get("booking") or {}).get("refund_status"),
            ])
            cancelled_at = _first_present(
                booking.get("cancelled_at"),
                booking.get("canceled_at"),
                booking.get("cancellation_date"),
                booking.get("refund_initiated_at"),
                booking.get("refunded_at"),
                payout.get("cancelled_at"),
                payout.get("canceled_at"),
                payout.get("cancellation_date"),
                payout.get("refund_initiated_at"),
                payout.get("refunded_at"),
                (payout.get("booking") or {}).get("cancelled_at"),
                (payout.get("booking") or {}).get("canceled_at"),
                (payout.get("booking") or {}).get("cancellation_date"),
                (payout.get("booking") or {}).get("refund_initiated_at"),
                (payout.get("booking") or {}).get("refunded_at"),
            )
            if cancelled_at or any(status_word in booking_status_text for status_word in ("cancelled", "canceled", "refund_initiated", "refunded")):
                continue
            check_in = booking.get("check_in_date") or payout.get("check_in_date") or (payout.get("booking") or {}).get("check_in_date")
            if not check_in:
                continue
            try:
                if datetime.fromisoformat(str(check_in).replace("Z", "+00:00")).date() > datetime.now(timezone.utc).date():
                    continue
            except Exception:
                continue
            broker_ref = _first_present(
                prop.get("broker_id"),
                prop.get("assigned_broker_id"),
                prop.get("broker_code"),
                prop.get("lg_code"),
                prop.get("managed_by_broker_id"),
                prop.get("managed_by_broker_code"),
                host.get("broker_id"),
                host.get("assigned_broker_id"),
                host.get("broker_code"),
                host.get("lg_code"),
                host.get("managed_by_broker_id"),
                host.get("managed_by_broker_code"),
                booking.get("broker_id"),
                booking.get("assigned_broker_id"),
                booking.get("managed_by_broker_id"),
                booking.get("broker_code"),
                booking.get("broker_lg_code"),
                booking.get("managed_by_broker_code"),
            )
            platform_fee_context = str(_first_present(
                booking.get("platform_fee_context"),
                prop.get("platform_fee_context"),
                payout.get("platform_fee_context"),
            ) or "").strip().lower()
            employee_ref = _first_present(
                prop.get("rm_id"),
                prop.get("employee_id"),
                prop.get("assigned_employee_id"),
                prop.get("employee_code"),
                host.get("rm_id"),
                host.get("employee_id"),
                host.get("assigned_employee_id"),
                host.get("employee_code"),
                booking.get("rm_id"),
                booking.get("employee_id"),
                booking.get("employee_code"),
                booking.get("rm_code"),
            )
            if is_rm_workspace and "rm" in platform_fee_context:
                employee_ref = _first_present(employee_ref, broker_ref)
                broker_ref = None
            matched_ref = employee_ref if is_rm_workspace else broker_ref
            if is_rm_workspace and broker_ref and broker_ref not in identifiers:
                assigned_broker = await db.users.find_one(
                    {
                        "role": "broker",
                        "$or": [
                            {"user_id": broker_ref},
                            {"lg_code": broker_ref},
                            {"employee_code": broker_ref},
                            {"uid": broker_ref},
                        ],
                    },
                    {"_id": 0, "user_id": 1},
                )
                if assigned_broker:
                    continue
            if matched_ref not in identifiers:
                continue
            rule = _commission_rule(payment_config, partner_role)
            rate = float(rule.get("value") or rule.get("percent") or 0)
            base_amount = _paise(
                payout.get("host_actual_value_amount")
                or payout.get("gross_amount")
                or payout.get("tds_base_amount")
                or booking.get("host_actual_value")
                or booking.get("host_base_amount")
                or booking.get("base_amount")
            )
            if not base_amount:
                try:
                    pricing = booking.get("pricing_snapshot") or booking.get("pricing") or {}
                    base_amount = _paise(pricing.get("host_actual_value"))
                except Exception:
                    base_amount = 0
            platform_fee_amount = 0
            if is_rm_workspace:
                pricing_snapshot = extract_booking_pricing_snapshot(booking)
                platform_fee_amount = _paise((pricing_snapshot.get("extra_charges") or {}).get("platform_fee"))
                if not platform_fee_amount:
                    platform_fee_amount = _paise(booking.get("service_fee") or booking.get("platform_fee_amount"))
                if not platform_fee_amount:
                    platform_fee_amount = _configured_platform_fee_paise(payment_config, "rm_mapped", base_amount)
            commission_amount = int(round(base_amount * (broker_rate / 100))) if broker_rate else 0
            if is_rm_workspace:
                commission_base_amount = platform_fee_amount
                commission_amount = int(round(commission_base_amount * (rate / 100))) if rate else 0
            if commission_amount <= 0:
                continue
            gst = _gst_split(commission_amount) if gstin_number else {
                "commission_cgst": 0,
                "commission_sgst": 0,
                "commission_igst": 0,
                "commission_gst_total": 0,
            }
            row_tds_rate = tds_rate if not is_rm_workspace else 0
            tds_amount = int(round(commission_amount * (row_tds_rate / 100)))
            commissions_by_booking[booking_id] = {
                "commission_id": _partner_settlement_id(partner_role, partner_code or matched_ref, booking_id),
                "broker_id": broker_id,
                "broker_name": db_user.get("full_name") or ("RM" if is_rm_workspace else "Broker"),
                "broker_code": partner_code or matched_ref,
                "broker_email": db_user.get("email"),
                "broker_phone": db_user.get("phone") or db_user.get("mobile") or db_user.get("contact_number"),
                "broker_address": db_user.get("address"),
                "broker_city": db_user.get("city"),
                "broker_state": db_user.get("state"),
                "broker_pin_code": db_user.get("pin_code") or db_user.get("pincode"),
                "broker_pan_number": pan_number,
                "broker_gstin": gstin_number,
                "booking_id": booking_id,
                "booking_source": payout.get("_settlement_source") or "Settlement",
                "property_id": prop.get("property_id") or payout.get("property_id") or booking.get("property_id"),
                "property_name": prop.get("title") or prop.get("property_name") or booking.get("property_name") or "NA",
                "booking_amount": base_amount,
                "base_amount": base_amount,
                "platform_fee_amount": platform_fee_amount if is_rm_workspace else base_amount,
                "commission_base_amount": platform_fee_amount if is_rm_workspace else base_amount,
                "commission_percentage": rate if is_rm_workspace else broker_rate,
                "commission_percent": rate if is_rm_workspace else broker_rate,
                "commission_amount": commission_amount,
                "gross_amount": commission_amount,
                **gst,
                "tds_rate_percent": row_tds_rate,
                "tds_amount": tds_amount,
                "net_amount": max(0, commission_amount + gst["commission_gst_total"] - tds_amount),
                "payment_status": _settlement_status(payout.get(f"{partner_role}_commission_status") or "pending"),
                "created_at": booking.get("check_in_date") or payout.get("created_at") or booking.get("created_at"),
            }

        commissions = sorted(commissions_by_booking.values(), key=lambda row: str(row.get("created_at") or ""), reverse=True)
        decision_ids = [row.get("commission_id") for row in commissions if row.get("commission_id")]
        booking_ids = [row.get("booking_id") for row in commissions if row.get("booking_id")]
        booking_suffixes = [
            "".join(ch for ch in str(booking_id or "") if ch.isalnum())[-6:]
            for booking_id in booking_ids
        ]
        booking_suffixes = [suffix for suffix in booking_suffixes if suffix]
        if decision_ids or booking_ids or booking_suffixes:
            decision_query = {"$or": []}
            if decision_ids:
                decision_query["$or"].append({"settlement_id": {"$in": decision_ids}})
            if booking_ids:
                decision_query["$or"].append({"booking_id": {"$in": booking_ids}})
            if booking_suffixes:
                decision_query["$or"].append({
                    "settlement_id": {
                        "$regex": f"({'|'.join(re.escape(suffix) for suffix in booking_suffixes)})$",
                        "$options": "i",
                    }
                })
            decisions = await db.partner_settlement_decisions.find(
                {"role": partner_role, **decision_query},
                {"_id": 0, "settlement_id": 1, "booking_id": 1, "status": 1},
            ).to_list(length=500)
            decision_map = {}
            for item in decisions:
                status_value = item.get("status")
                if item.get("settlement_id"):
                    decision_map[item.get("settlement_id")] = status_value
                    suffix = "".join(ch for ch in str(item.get("settlement_id") or "").rsplit("-", 1)[-1] if ch.isalnum())[-6:]
                    if suffix:
                        decision_map[f"suffix:{suffix}"] = status_value
                if item.get("booking_id"):
                    decision_map[f"booking:{item.get('booking_id')}"] = status_value
            for row in commissions:
                suffix = "".join(ch for ch in str(row.get("booking_id") or "") if ch.isalnum())[-6:]
                saved_status = (
                    decision_map.get(row.get("commission_id"))
                    or decision_map.get(f"booking:{row.get('booking_id')}")
                    or decision_map.get(f"suffix:{suffix}")
                )
                if saved_status:
                    row["payment_status"] = _settlement_status(saved_status)
                    row["status"] = row["payment_status"]
        if payment_status:
            commissions = [row for row in commissions if row.get("payment_status") == payment_status]
        total_earned = sum(c.get("net_amount", 0) for c in commissions)
        gst_total = sum(c.get("commission_gst_total", 0) for c in commissions)
        tds_total = sum(c.get("tds_amount", 0) for c in commissions)
        net_total = sum(c.get("net_amount", 0) for c in commissions)
        paid = sum(c.get("net_amount", 0) for c in commissions if c.get("payment_status") in {"paid", "processed", "success", "completed"})
        approved = sum(c.get("net_amount", 0) for c in commissions if c.get("payment_status") == "approved")
        pending = sum(c.get("net_amount", 0) for c in commissions if c.get("payment_status") == "pending")
        payout_settings = db_user.get("payout_settings") or {}

        return {
            "commissions": commissions,
            "total": len(commissions),
            "payout_settings": payout_settings,
            "summary": {
                "total_earned": total_earned,
                "gst_total": gst_total,
                "tds_total": tds_total,
                "net_total": net_total,
                "approved": approved,
                "paid": paid,
                "pending": pending,
                "payout_ready": bool((payout_settings.get("upi_id") or "") or ((payout_settings.get("account_number") or "") and (payout_settings.get("ifsc_code") or ""))),
            }
        }
    
    except Exception as e:
        logger.error(f"Error fetching commissions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch commissions"
        )


@router.put("/commissions/payout-settings")
async def update_broker_payout_settings(
    payload: BrokerPayoutSettingsUpdate,
    current_user: dict = Depends(require_broker),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    clean_payload = {
        key: _clean_identifier(value)
        for key, value in payload.dict().items()
        if value is not None
    }
    method = clean_payload.get("payout_method") if clean_payload.get("payout_method") in {"bank", "upi"} else "bank"
    clean_payload["payout_method"] = method
    if method == "upi":
        clean_payload["account_holder_name"] = ""
        clean_payload["bank_name"] = ""
        clean_payload["account_number"] = ""
        clean_payload["ifsc_code"] = ""
    else:
        clean_payload["upi_id"] = ""
    clean_payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": {"payout_settings": clean_payload, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Payout settings saved", "payout_settings": clean_payload}

# ========== SUBSCRIPTION ALERTS ==========

@router.get("/subscription-alerts")
async def get_subscription_alerts(
    current_user: dict = Depends(require_broker),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get subscription expiry alerts for owners."""
    try:
        broker_id = current_user["user_id"]
        
        # Get all owners under this broker
        owner_cursor = db.users.find(
            {"broker_id": broker_id, "role": "host"},
            {"_id": 0, "user_id": 1, "full_name": 1, "email": 1}
        )
        owners = await owner_cursor.to_list(length=200)
        
        alerts = []
        
        for owner in owners:
            # Get active subscriptions
            sub_cursor = db.subscriptions.find(
                {"user_id": owner["user_id"], "status": {"$in": ["trial", "active"]}},
                {"_id": 0}
            )
            subscriptions = await sub_cursor.to_list(length=10)
            
            for sub in subscriptions:
                # Check if expiring soon (within 5 days)
                from datetime import date, timedelta
                end_date = date.fromisoformat(sub["end_date"]) if isinstance(sub["end_date"], str) else sub["end_date"]
                days_remaining = (end_date - date.today()).days
                
                if days_remaining <= 5:
                    alerts.append({
                        "owner_name": owner["full_name"],
                        "owner_email": owner["email"],
                        "subscription_id": sub["subscription_id"],
                        "plan_type": sub["plan_type"],
                        "end_date": sub["end_date"],
                        "days_remaining": days_remaining,
                        "status": sub["status"]
                    })
        
        return {
            "alerts": alerts,
            "total": len(alerts)
        }
    
    except Exception as e:
        logger.error(f"Error fetching subscription alerts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch subscription alerts"
        )


# ========== OWNER KYC MANAGEMENT ==========

async def get_assigned_owner(owner_id: str, current_user: dict, db):
    query = _get_broker_or_rm_query(current_user, {"user_id": owner_id, "role": "host"})
    owner = await db.users.find_one(query)
    if not owner:
        raise HTTPException(
            status_code=404,
            detail="Owner not found or not assigned to this broker/RM"
        )
    return owner

class BrokerDraftDocumentUpload(BaseModel):
    document_type: str
    document_url: Optional[str] = ""
    text_value: Optional[str] = ""

class BrokerDraftAgreementUpdate(BaseModel):
    agreement_owner_name: Optional[str] = None
    agreement_owner_address: Optional[str] = None
    agreement_signature: Optional[str] = None

from routes.host_account_routes import HostVerificationSubmit, normalize_pan_number

@router.get("/owner/{owner_id}/kyc")
async def get_owner_kyc(
    owner_id: str,
    current_user: dict = Depends(require_broker),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get KYC details and documents for an assigned owner."""
    owner = await get_assigned_owner(owner_id, current_user, db)
    return {
        "kyc_status": owner.get("kyc_status", "unverified"),
        "kyc_documents": owner.get("kyc_documents") or [],
        "pan_number": owner.get("pan_number"),
        "gst_number": owner.get("gst_number"),
        "agreement_owner_name": owner.get("agreement_owner_name"),
        "agreement_owner_address": owner.get("agreement_owner_address"),
        "agreement_signature": owner.get("agreement_signature"),
        "agreement_signed_at": owner.get("agreement_signed_at"),
        "kyc_remarks": owner.get("kyc_remarks"),
    }

@router.patch("/owner/{owner_id}/kyc/documents/draft")
async def save_owner_draft_document(
    owner_id: str,
    payload: BrokerDraftDocumentUpload,
    current_user: dict = Depends(require_broker),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Save a draft KYC document for the assigned owner."""
    owner = await get_assigned_owner(owner_id, current_user, db)
    accepted_at = datetime.now(timezone.utc)
    doc_type = payload.document_type
    mapping = {
        "aadhar": "aadhar_card",
        "property": "property_proof",
        "cheque": "cancelled_cheque",
        "society": "society_noc",
        "shop_act": "shop_act",
        "gst": "gst_certificate",
        "gst_number": "gst_number",
        "pan_number": "pan_number",
        "pan": "pan_number"
    }
    mapped_type = mapping.get(doc_type, doc_type)
    text_value = (payload.text_value or payload.document_url or "").strip()
    text_doc_types = {"gst_number", "pan_number"}
    if mapped_type not in text_doc_types and not payload.document_url:
        raise HTTPException(400, detail="Document URL is required")
    if mapped_type == "gst_number" and not text_value:
        raise HTTPException(400, detail="GST number is required")
    if mapped_type == "pan_number":
        text_value = normalize_pan_number(text_value)
    
    current_docs = owner.get("kyc_documents") or []
    if not isinstance(current_docs, list):
        current_docs = list(current_docs)
        
    updated = False
    for doc in current_docs:
        if doc.get("document_type") == mapped_type:
            if mapped_type in text_doc_types:
                doc.pop("document_url", None)
                doc["text_value"] = text_value
            else:
                doc["document_url"] = payload.document_url
            doc["status"] = "pending"
            doc["rejection_reason"] = None
            doc["uploaded_at"] = accepted_at.isoformat()
            updated = True
            break
            
    if not updated:
        new_doc = {
            "document_type": mapped_type,
            "status": "pending",
            "rejection_reason": None,
            "uploaded_at": accepted_at.isoformat()
        }
        if mapped_type in text_doc_types:
            new_doc["text_value"] = text_value
        else:
            new_doc["document_url"] = payload.document_url
        current_docs.append(new_doc)

    update_data = {"kyc_documents": current_docs, "updated_at": accepted_at}
    if mapped_type == "gst_number":
        update_data["gst_number"] = text_value
    if mapped_type == "pan_number":
        update_data["pan_number"] = text_value
        
    await db.users.update_one(
        {"user_id": owner_id},
        {"$set": update_data}
    )
    return {"message": "Draft document saved", "kyc_documents": current_docs}

@router.delete("/owner/{owner_id}/kyc/documents/draft/{document_type}")
async def delete_owner_rejected_draft_document(
    owner_id: str,
    document_type: str,
    current_user: dict = Depends(require_broker),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Remove a rejected KYC document so a replacement can be uploaded."""
    owner = await get_assigned_owner(owner_id, current_user, db)
    mapping = {
        "aadhar": "aadhar_card",
        "property": "property_proof",
        "cheque": "cancelled_cheque",
        "society": "society_noc",
        "shop_act": "shop_act",
        "gst": "gst_certificate",
        "gst_number": "gst_number",
        "pan_number": "pan_number",
        "pan": "pan_number"
    }
    mapped_type = mapping.get(document_type, document_type)
    
    current_docs = list(owner.get("kyc_documents") or [])
    target = next(
        (doc for doc in current_docs if doc.get("document_type") == mapped_type),
        None,
    )
    if not target:
        raise HTTPException(404, detail="Document not found")
    if target.get("status") != "rejected" and owner.get("kyc_status") != "rejected":
        raise HTTPException(409, detail="Only rejected documents can be removed")
        
    remaining_docs = [
        doc for doc in current_docs if doc.get("document_type") != mapped_type
    ]
    updated_at = datetime.now(timezone.utc)
    update_doc = {"$set": {"kyc_documents": remaining_docs, "updated_at": updated_at}}
    if mapped_type == "gst_number":
        update_doc["$unset"] = {"gst_number": ""}
    if mapped_type == "pan_number":
        update_doc["$unset"] = {"pan_number": ""}

    await db.users.update_one(
        {"user_id": owner_id},
        update_doc
    )
    return {"message": "Rejected document removed", "kyc_documents": remaining_docs}

@router.patch("/owner/{owner_id}/kyc/agreement/draft")
async def save_owner_draft_agreement(
    owner_id: str,
    payload: BrokerDraftAgreementUpdate,
    current_user: dict = Depends(require_broker),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Save draft agreement info for the owner."""
    await get_assigned_owner(owner_id, current_user, db)
    accepted_at = datetime.now(timezone.utc)
    update_data = {}
    if payload.agreement_owner_name is not None:
        update_data["agreement_owner_name"] = payload.agreement_owner_name
    if payload.agreement_owner_address is not None:
        update_data["agreement_owner_address"] = payload.agreement_owner_address
    if payload.agreement_signature is not None:
        update_data["agreement_signature"] = payload.agreement_signature
        update_data["agreement_signed_at"] = accepted_at.isoformat()
        
    if update_data:
        update_data["updated_at"] = accepted_at
        await db.users.update_one(
            {"user_id": owner_id},
            {"$set": update_data}
        )
    return {"message": "Draft agreement updated successfully"}

@router.post("/owner/{owner_id}/submit-verification")
async def submit_owner_verification(
    owner_id: str,
    payload: HostVerificationSubmit,
    current_user: dict = Depends(require_broker),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Submit host verification documents for the owner."""
    owner = await get_assigned_owner(owner_id, current_user, db)
    if not payload.terms_accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Terms & Conditions consent is required",
        )
        
    accepted_at = datetime.now(timezone.utc)
    pan_number = normalize_pan_number(payload.pan_number)
    docs = [
        {"document_type": "aadhar_card", "document_url": payload.aadhar_card, "status": "pending", "uploaded_at": accepted_at.isoformat()},
        {"document_type": "pan_number", "text_value": pan_number, "status": "pending", "uploaded_at": accepted_at.isoformat()},
        {"document_type": "property_proof", "document_url": payload.property_proof, "status": "pending", "uploaded_at": accepted_at.isoformat()},
        {"document_type": "cancelled_cheque", "document_url": payload.cancelled_cheque, "status": "pending", "uploaded_at": accepted_at.isoformat()},
        {"document_type": "shop_act", "document_url": payload.shop_act, "status": "pending", "uploaded_at": accepted_at.isoformat()},
    ]
    if payload.society_noc:
        docs.append({"document_type": "society_noc", "document_url": payload.society_noc, "status": "pending", "uploaded_at": accepted_at.isoformat()})
    if payload.gst_certificate:
        docs.append({"document_type": "gst_certificate", "document_url": payload.gst_certificate, "status": "pending", "uploaded_at": accepted_at.isoformat()})
    if payload.gst_number:
        docs.append({"document_type": "gst_number", "text_value": payload.gst_number.strip(), "status": "pending", "uploaded_at": accepted_at.isoformat()})
        
    await db.users.update_one(
        {"user_id": owner_id},
        {
            "$set": {
                "kyc_status": "pending",
                "kyc_documents": docs,
                "agreement_owner_name": payload.agreement_owner_name,
                "agreement_owner_address": payload.agreement_owner_address,
                "agreement_signature": payload.agreement_signature,
                "pan_number": pan_number,
                "gst_number": payload.gst_number.strip() if payload.gst_number else None,
                "agreement_signed_at": accepted_at.isoformat(),
                "verification_terms_accepted": True,
                "verification_terms_accepted_at": accepted_at.isoformat(),
                "verification_terms_version": payload.terms_version or "host-verification",
                "updated_at": accepted_at
            }
        }
    )
    
    # Notify admins
    try:
        from services.notification_service import NotificationService
        from models.notification import NotificationType, NotificationChannel
        
        admins_cursor = db.users.find({"role": "admin"})
        admins = await admins_cursor.to_list(length=100)
        
        notification_service = NotificationService(db)
        for admin in admins:
            await notification_service.send_notification(
                user_id=admin["user_id"],
                notification_type=NotificationType.VERIFICATION_SUBMITTED,
                channels=[NotificationChannel.IN_APP],
                title="New Host Document Verification Request",
                message=f"Host {owner.get('full_name', 'Unknown')} has submitted documents via broker {current_user.get('full_name', 'Unknown')}.",
                data={
                    "host_id": owner_id,
                    "host_name": owner.get("full_name"),
                    "request_type": "host_verification"
                }
            )
    except Exception as n_err:
        logger.warning(f"Failed to notify admins of host verification: {n_err}")
        
    return {"message": "Verification documents submitted successfully"}

