from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from models.lead import Lead, LeadCreate, LeadUpdate, LeadStatus
from models.verification import PropertyVerification, VerificationSubmit, VerificationStatus, GeoTaggedPhoto
from models.commission import Commission
from models.user import UserRole
from middleware.auth_middleware import get_current_user
from datetime import datetime
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
        commissions = await commission_cursor.to_list(length=1000)
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
        
        update_data = {"updated_at": datetime.utcnow()}
        
        if lead_update.status:
            update_data["status"] = lead_update.status.value
            if lead_update.status == LeadStatus.CONTACTED:
                update_data["contacted_at"] = datetime.utcnow()
            elif lead_update.status == LeadStatus.CONVERTED:
                update_data["converted_at"] = datetime.utcnow()
        
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
                {"_id": 0, "title": 1, "address": 1, "city": 1, "images": 1}
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
                    "completed_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
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
                status=VerificationStatus.COMPLETED
            )
            
            verification_dict = verification.model_dump()
            await db.property_verifications.insert_one(verification_dict)
            verification_id = verification.verification_id
        
        # Update property status
        await db.properties.update_one(
            {"property_id": property_id},
            {"$set": {
                "status": "under_review",
                "updated_at": datetime.utcnow()
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
