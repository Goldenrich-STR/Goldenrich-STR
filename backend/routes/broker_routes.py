from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import List, Optional
from models.lead import Lead, LeadCreate, LeadUpdate, LeadStatus
from models.verification import PropertyVerification, VerificationSubmit, VerificationStatus, GeoTaggedPhoto
from models.commission import Commission
from models.user import UserRole
from middleware.auth_middleware import get_current_user
from datetime import datetime, timezone
import logging
import asyncio

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/broker", tags=["Broker"])

async def require_broker(current_user: dict = Depends(get_current_user)):
    """Dependency to check if user is broker."""
    if current_user["role"] != UserRole.BROKER.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Broker access required"
        )
    return current_user

async def get_db():
    from server import db_instance
    return db_instance

# ========== BROKER DASHBOARD ==========

@router.get("/dashboard/stats")
async def get_broker_dashboard_stats(
    current_user: dict = Depends(require_broker),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get broker dashboard statistics."""
    try:
        broker_id = current_user["user_id"]
        
        # Count assigned owners
        total_owners = await db.users.count_documents({
            "broker_id": broker_id,
            "role": "host"
        })
        
        # Count properties
        total_properties = await db.properties.count_documents({"broker_id": broker_id})
        live_properties = await db.properties.count_documents({
            "broker_id": broker_id,
            "status": "live"
        })
        
        # Pending verifications
        pending_verifications = await db.property_verifications.count_documents({
            "broker_id": broker_id,
            "status": {"$in": ["pending", "in_progress"]}
        })
        
        # Leads count
        total_leads = await db.leads.count_documents({"broker_id": broker_id})
        converted_leads = await db.leads.count_documents({
            "broker_id": broker_id,
            "status": "converted"
        })
        
        # Commission earnings
        commission_cursor = db.commissions.find({"broker_id": broker_id})
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
        
        cursor = db.users.find(
            {"broker_id": broker_id, "role": "host"},
            {"_id": 0, "password_hash": 0}
        )
        owners = await cursor.to_list(length=200)
        
        # Get property count for each owner
        for owner in owners:
            property_count = await db.properties.count_documents({"owner_id": owner["user_id"]})
            owner["property_count"] = property_count
        
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

# ========== STR PROPERTIES ==========

@router.get("/properties")
async def get_broker_properties(
    status_filter: Optional[str] = None,
    current_user: dict = Depends(require_broker),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all properties under this broker."""
    try:
        broker_id = current_user["user_id"]
        
        query = {"broker_id": broker_id}
        if status_filter:
            query["status"] = status_filter
        
        cursor = db.properties.find(query, {"_id": 0})
        properties = await cursor.to_list(length=200)
        
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

# ========== LEADS MANAGEMENT ==========

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
        broker_id = current_user["user_id"]
        
        query = {"broker_id": broker_id}
        if status_filter:
            query["status"] = status_filter.value
        
        cursor = db.property_verifications.find(query, {"_id": 0}).sort("created_at", -1)
        verifications = await cursor.to_list(length=100)
        
        # Enrich with property details
        for verification in verifications:
            property_data = await db.properties.find_one(
                {"property_id": verification["property_id"]},
                {"_id": 0}
            )
            if property_data:
                verification["property_details"] = property_data
        
        return {
            "verifications": verifications,
            "total": len(verifications)
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
        
        # Get property
        property_data = await db.properties.find_one({"property_id": property_id})
        if not property_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )
        
        # Resolve RM ID for this verification to keep it private/assigned to the correct employee
        owner_rm_id = None
        if property_data and property_data.get("owner_id"):
            owner = await db.users.find_one({"user_id": property_data["owner_id"]})
            if owner:
                owner_rm_id = owner.get("rm_id")
        if not owner_rm_id:
            broker_user = await db.users.find_one({"user_id": broker_id})
            if broker_user:
                owner_rm_id = broker_user.get("rm_id")

        # Check if verification already exists
        existing = await db.property_verifications.find_one({
            "property_id": property_id,
            "broker_id": broker_id
        })
        
        if existing:
            # Update existing verification
            await db.property_verifications.update_one(
                {"property_id": property_id, "broker_id": broker_id},
                {"$set": {
                    "checklist": verification_data.checklist.model_dump(),
                    "geo_tagged_photos": [p.model_dump() for p in verification_data.geo_tagged_photos],
                    "video_url": verification_data.video_url,
                    "broker_remarks": verification_data.broker_remarks,
                    "status": VerificationStatus.COMPLETED.value,
                    "rm_reviewed": False,
                    "rm_approved": None,
                    "rm_remarks": None,
                    "rm_id": owner_rm_id,
                    "reviewed_at": None,
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
                broker_id=broker_id,
                owner_id=property_data["owner_id"],
                checklist=verification_data.checklist,
                geo_tagged_photos=verification_data.geo_tagged_photos,
                video_url=verification_data.video_url,
                broker_remarks=verification_data.broker_remarks,
                status=VerificationStatus.COMPLETED,
                rm_id=owner_rm_id
            )
            
            verification_dict = verification.model_dump()
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
    """Get all commissions for this broker (view only)."""
    try:
        broker_id = current_user["user_id"]
        
        query = {"broker_id": broker_id}
        if payment_status:
            query["payment_status"] = payment_status
        
        cursor = db.commissions.find(query, {"_id": 0}).sort("created_at", -1)
        commissions = await cursor.to_list(length=200)
        
        # Calculate totals
        total_earned = sum(c.get("commission_amount", 0) for c in commissions)
        paid = sum(c.get("commission_amount", 0) for c in commissions if c.get("payment_status") == "paid")
        pending = total_earned - paid
        
        return {
            "commissions": commissions,
            "total": len(commissions),
            "summary": {
                "total_earned": total_earned,
                "paid": paid,
                "pending": pending
            }
        }
    
    except Exception as e:
        logger.error(f"Error fetching commissions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch commissions"
        )

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

async def get_assigned_owner(owner_id: str, broker_id: str, db):
    owner = await db.users.find_one({"user_id": owner_id, "broker_id": broker_id, "role": "host"})
    if not owner:
        raise HTTPException(
            status_code=404,
            detail="Owner not found or not assigned to this broker"
        )
    return owner

class BrokerDraftDocumentUpload(BaseModel):
    document_type: str
    document_url: str

class BrokerDraftAgreementUpdate(BaseModel):
    agreement_owner_name: Optional[str] = None
    agreement_owner_address: Optional[str] = None
    agreement_signature: Optional[str] = None

from routes.host_account_routes import HostVerificationSubmit

@router.get("/owner/{owner_id}/kyc")
async def get_owner_kyc(
    owner_id: str,
    current_user: dict = Depends(require_broker),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get KYC details and documents for an assigned owner."""
    owner = await get_assigned_owner(owner_id, current_user["user_id"], db)
    return {
        "kyc_status": owner.get("kyc_status", "unverified"),
        "kyc_documents": owner.get("kyc_documents") or [],
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
    owner = await get_assigned_owner(owner_id, current_user["user_id"], db)
    accepted_at = datetime.now(timezone.utc)
    doc_type = payload.document_type
    mapping = {
        "aadhar": "aadhar_card",
        "property": "property_proof",
        "cheque": "cancelled_cheque",
        "society": "society_noc",
        "shop_act": "shop_act",
        "gst": "gst_certificate"
    }
    mapped_type = mapping.get(doc_type, doc_type)
    
    current_docs = owner.get("kyc_documents") or []
    if not isinstance(current_docs, list):
        current_docs = list(current_docs)
        
    updated = False
    for doc in current_docs:
        if doc.get("document_type") == mapped_type:
            doc["document_url"] = payload.document_url
            doc["status"] = "pending"
            doc["rejection_reason"] = None
            doc["uploaded_at"] = accepted_at.isoformat()
            updated = True
            break
            
    if not updated:
        current_docs.append({
            "document_type": mapped_type,
            "document_url": payload.document_url,
            "status": "pending",
            "rejection_reason": None,
            "uploaded_at": accepted_at.isoformat()
        })
        
    await db.users.update_one(
        {"user_id": owner_id},
        {"$set": {"kyc_documents": current_docs, "updated_at": accepted_at}}
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
    owner = await get_assigned_owner(owner_id, current_user["user_id"], db)
    mapping = {
        "aadhar": "aadhar_card",
        "property": "property_proof",
        "cheque": "cancelled_cheque",
        "society": "society_noc",
        "shop_act": "shop_act",
        "gst": "gst_certificate"
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
    await db.users.update_one(
        {"user_id": owner_id},
        {"$set": {"kyc_documents": remaining_docs, "updated_at": updated_at}}
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
    await get_assigned_owner(owner_id, current_user["user_id"], db)
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
    owner = await get_assigned_owner(owner_id, current_user["user_id"], db)
    if not payload.terms_accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Terms & Conditions consent is required",
        )
        
    accepted_at = datetime.now(timezone.utc)
    docs = [
        {"document_type": "aadhar_card", "document_url": payload.aadhar_card, "status": "pending", "uploaded_at": accepted_at.isoformat()},
        {"document_type": "property_proof", "document_url": payload.property_proof, "status": "pending", "uploaded_at": accepted_at.isoformat()},
        {"document_type": "cancelled_cheque", "document_url": payload.cancelled_cheque, "status": "pending", "uploaded_at": accepted_at.isoformat()},
        {"document_type": "shop_act", "document_url": payload.shop_act, "status": "pending", "uploaded_at": accepted_at.isoformat()},
    ]
    if payload.society_noc:
        docs.append({"document_type": "society_noc", "document_url": payload.society_noc, "status": "pending", "uploaded_at": accepted_at.isoformat()})
    if payload.gst_certificate:
        docs.append({"document_type": "gst_certificate", "document_url": payload.gst_certificate, "status": "pending", "uploaded_at": accepted_at.isoformat()})
    if payload.gst_number:
        docs.append({"document_type": "gst_number", "document_url": payload.gst_number, "status": "pending", "uploaded_at": accepted_at.isoformat()})
        
    await db.users.update_one(
        {"user_id": owner_id},
        {
            "$set": {
                "kyc_status": "pending",
                "kyc_documents": docs,
                "agreement_owner_name": payload.agreement_owner_name,
                "agreement_owner_address": payload.agreement_owner_address,
                "agreement_signature": payload.agreement_signature,
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

