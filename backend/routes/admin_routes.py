from fastapi import APIRouter, HTTPException, status, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import List, Optional
from models.user import User, UserRole, KYCStatus, UserCreate, UserUpdate
from models.property import PropertyStatus
from middleware.auth_middleware import get_current_user
from datetime import datetime, timezone
import logging
import asyncio

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["Admin"])


class AdminRejectRequest(BaseModel):
    reason: str


class AdminApproveRequest(BaseModel):
    checklist: Optional[dict] = None

async def get_db():
    from server import db_instance
    return db_instance

async def require_admin(current_user: dict = Depends(get_current_user)):
    """Dependency to check if user is admin."""
    if current_user["role"] != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

# ========== USER MANAGEMENT ==========

@router.get("/users")
async def get_all_users(
    role: Optional[UserRole] = None,
    search: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all users with filters."""
    try:
        query = {}
        
        if role:
            query["role"] = role.value
        
        if search:
            query["$or"] = [
                {"full_name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}}
            ]
        
        cursor = db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).skip(skip).limit(limit)
        users = await cursor.to_list(length=limit)
        total = await db.users.count_documents(query)
        
        return {
            "users": users,
            "total": total,
            "limit": limit,
            "skip": skip
        }
    
    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch users"
        )

@router.get("/users/{user_id}")
async def get_user_details(
    user_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get detailed user information."""
    try:
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get additional stats
        if user["role"] == "host":
            property_count = await db.properties.count_documents({"owner_id": user_id})
            booking_count = await db.bookings.count_documents({"host_id": user_id})
            user["stats"] = {
                "properties": property_count,
                "bookings": booking_count
            }
        elif user["role"] == "guest":
            booking_count = await db.bookings.count_documents({"guest_id": user_id})
            user["stats"] = {
                "bookings": booking_count
            }
        
        return user
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user details"
        )

@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    is_active: bool,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Activate or deactivate user account."""
    try:
        result = await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "is_active": is_active,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        logger.info(f"User {user_id} status updated to {is_active} by admin {current_user['user_id']}")
        return {"message": "User status updated successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user status"
        )

@router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Admin creates a new user."""
    try:
        # Check if user already exists
        existing_user = await db.users.find_one({"$or": [{"email": user_data.email}, {"phone": user_data.phone}]})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email or phone already exists"
            )
        
        from utils.auth import hash_password
        import uuid
        
        # Determine the user_id (UID) to save
        uid_val = user_data.uid or f"user_{uuid.uuid4().hex[:8]}"
        
        # If user is a broker, set their lg_code to their UID
        lg_code_val = uid_val if user_data.role.value == "broker" else user_data.lg_code
        
        new_user_args = {
            "user_id": uid_val,
            "email": user_data.email,
            "phone": user_data.phone,
            "password_hash": hash_password(user_data.password),
            "full_name": user_data.full_name,
            "role": user_data.role,
            "city": user_data.city,
            "state": user_data.state,
            "franchise": user_data.franchise,
            "branch": user_data.branch,
            "birthdate": user_data.birthdate,
            "uid": uid_val,
            "lg_code": lg_code_val,
            "terms_accepted": True,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        if user_data.profile_image:
            new_user_args["profile_image"] = user_data.profile_image
            
        new_user = User(**new_user_args)
        
        await db.users.insert_one(new_user.model_dump())
        logger.info(f"Admin {current_user['user_id']} created user {new_user.user_id}")
        return {"message": "User created successfully", "user_id": new_user.user_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )

@router.patch("/users/{user_id}", response_model=dict)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Admin updates an existing user's information."""
    try:
        # Find existing user
        user = await db.users.find_one({"user_id": user_id})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
            
        update_fields = {}
        
        # Check if email is updated and is unique
        if user_data.email is not None and user_data.email != user["email"]:
            existing_email = await db.users.find_one({"email": user_data.email})
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered by another user"
                )
            update_fields["email"] = user_data.email
            
        # Check if phone is updated and is unique
        if user_data.phone is not None and user_data.phone != user["phone"]:
            existing_phone = await db.users.find_one({"phone": user_data.phone})
            if existing_phone:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Phone number already registered by another user"
                )
            update_fields["phone"] = user_data.phone

        # Optional password update (if admin wants to reset password)
        if user_data.password is not None and user_data.password.strip():
            from utils.auth import hash_password
            update_fields["password_hash"] = hash_password(user_data.password)

        # Other profile fields
        for field in ["full_name", "role", "city", "state", "franchise", "branch", "birthdate", "profile_image", "is_active"]:
            val = getattr(user_data, field)
            if val is not None:
                # If role changed, set lg_code appropriately
                if field == "role":
                    update_fields["role"] = val.value if hasattr(val, "value") else str(val)
                else:
                    update_fields[field] = val
                    
        # Update host lg_code
        if user_data.lg_code is not None:
            update_fields["lg_code"] = user_data.lg_code
            
        # Update broker_id
        if user_data.broker_id is not None:
            update_fields["broker_id"] = user_data.broker_id

        # Update rm_id
        if user_data.rm_id is not None:
            update_fields["rm_id"] = user_data.rm_id
            
        # Add updated_at timestamp
        if update_fields:
            update_fields["updated_at"] = datetime.now(timezone.utc)
            
            # Execute update
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": update_fields}
            )
            
        logger.info(f"Admin {current_user['user_id']} updated user {user_id}")
        return {"message": "User updated successfully", "user_id": user_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user"
        )

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Permanently delete a user."""
    try:
        # Prevent admin from deleting themselves
        if user_id == current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot delete your own account"
            )
            
        result = await db.users.delete_one({"user_id": user_id})
        
        # Also cleanup properties/bookings if needed, but for now just the user
        # In a real app, you might want to soft delete or cascade
        
        logger.info(f"Admin {current_user['user_id']} deleted user {user_id}")
        return {"message": "User deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user"
        )

@router.patch("/users/{user_id}/kyc")
async def update_kyc_status(
    user_id: str,
    kyc_status: KYCStatus,
    remarks: Optional[str] = None,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Approve or reject user KYC."""
    try:
        update_data = {
            "kyc_status": kyc_status.value,
            "updated_at": datetime.now(timezone.utc)
        }
        
        if remarks:
            update_data["kyc_remarks"] = remarks
        
        result = await db.users.update_one(
            {"user_id": user_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        logger.info(f"KYC status for user {user_id} updated to {kyc_status.value}")
        return {"message": "KYC status updated successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating KYC status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update KYC status"
        )

class KYCDocumentStatusUpdate(BaseModel):
    document_type: str
    status: str
    rejection_reason: Optional[str] = None

@router.patch("/users/{user_id}/kyc/documents")
async def update_kyc_document_status(
    user_id: str,
    payload: KYCDocumentStatusUpdate,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Approve or reject a specific KYC document for a user."""
    try:
        user = await db.users.find_one({"user_id": user_id})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        docs = user.get("kyc_documents", [])
        updated = False
        for doc in docs:
            if doc.get("document_type") == payload.document_type:
                doc["status"] = payload.status
                if payload.status == "rejected":
                    doc["rejection_reason"] = payload.rejection_reason
                else:
                    doc["rejection_reason"] = None
                updated = True
                break
                
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document of type {payload.document_type} not found"
            )
            
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"kyc_documents": docs, "updated_at": datetime.now(timezone.utc)}}
        )
        
        logger.info(f"KYC Document {payload.document_type} status for user {user_id} updated to {payload.status}")
        return {"message": "Document status updated successfully", "kyc_documents": docs}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update document status"
        )

# ========== PROPERTY MODERATION ==========

@router.get("/properties")
async def get_all_properties(
    status_filter: Optional[PropertyStatus] = None,
    category: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all properties with filters."""
    try:
        query = {}
        
        if status_filter:
            query["status"] = status_filter.value
        
        if category:
            query["category"] = category
        
        cursor = db.properties.find(query, {"_id": 0}).skip(skip).limit(limit)
        properties = await cursor.to_list(length=limit)
        total = await db.properties.count_documents(query)
        
        return {
            "properties": properties,
            "total": total,
            "limit": limit,
            "skip": skip
        }
    
    except Exception as e:
        logger.error(f"Error fetching properties: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch properties"
        )

@router.get("/properties/pending-verification")
async def get_pending_verifications(
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all properties pending verification."""
    try:
        cursor = db.properties.find(
            {"status": {"$in": [PropertyStatus.PENDING_VERIFICATION.value, PropertyStatus.UNDER_REVIEW.value]}},
            {"_id": 0}
        )
        properties = await cursor.to_list(length=100)
        
        return {
            "properties": properties,
            "total": len(properties)
        }
    
    except Exception as e:
        logger.error(f"Error fetching pending verifications: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch pending verifications"
        )

@router.get("/properties/awaiting-final-approval")
async def get_awaiting_final_approval(
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Properties already approved by RM and awaiting admin's final call."""
    try:
        # 1. Find all verifications that are RM-approved but not yet admin-finalized
        cursor_v = db.property_verifications.find(
            {"rm_approved": True, "admin_reviewed": {"$ne": True}}, 
            {"_id": 0}
        )
        verifications = await cursor_v.to_list(length=200)
        
        if not verifications:
            return {"properties": [], "total": 0}

        # 2. Get the properties corresponding to these verifications
        property_ids = [v["property_id"] for v in verifications]
        cursor_p = db.properties.find(
            {
                "property_id": {"$in": property_ids},
                "status": PropertyStatus.UNDER_REVIEW.value,
            },
            {"_id": 0},
        )
        properties = await cursor_p.to_list(length=200)

        # 3. Enrich properties with RM remarks and checklist from verification record
        v_map = {v["property_id"]: v for v in verifications}
        for prop in properties:
            v_data = v_map.get(prop["property_id"])
            if v_data:
                prop["rm_remarks"] = v_data.get("rm_remarks")
                prop["rm_id"] = v_data.get("rm_id")
                prop["rm_reviewed_at"] = v_data.get("reviewed_at")
                prop["checklist"] = v_data.get("checklist")
                prop["geo_tagged_photos"] = v_data.get("geo_tagged_photos")
                prop["video_url"] = v_data.get("video_url")
                prop["broker_remarks"] = v_data.get("broker_remarks")
                prop["broker_id"] = v_data.get("broker_id")
                prop["verification_id"] = v_data.get("verification_id")

        return {"properties": properties, "total": len(properties)}

    except Exception as e:
        logger.error(f"Error fetching awaiting-final-approval list: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch list",
        )


@router.post("/properties/{property_id}/approve")
async def approve_property(
    property_id: str,
    payload: Optional[AdminApproveRequest] = None,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Approve property listing (final approval). Property must have RM approval first."""
    try:
        property_data = await db.properties.find_one({"property_id": property_id}, {"_id": 0})
        if not property_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )

        # Idempotency guard: don't re-fire approval notifications on already-LIVE listings
        if property_data.get("status") == PropertyStatus.LIVE.value:
            return {"message": "Property is already live", "property_id": property_id}

        verification = await db.property_verifications.find_one({"property_id": property_id})
        if not verification or not verification.get("rm_approved"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Property must be approved by RM before admin final approval",
            )

        await db.properties.update_one(
            {"property_id": property_id},
            {"$set": {
                "status": PropertyStatus.LIVE.value,
                "approved_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }}
        )

        v_update = {
            "admin_reviewed": True,
            "admin_approved": True,
            "admin_id": current_user["user_id"],
            "admin_reviewed_at": datetime.now(timezone.utc),
            "status": "approved",
            "updated_at": datetime.now(timezone.utc),
        }
        if payload and payload.checklist:
            v_update["checklist"] = payload.checklist

        await db.property_verifications.update_one(
            {"property_id": property_id},
            {"$set": v_update},
        )

        # Notify host
        try:
            from services.verification_workflow import on_admin_decision
            asyncio.create_task(on_admin_decision(db, property_data, approved=True))
        except Exception as wf_err:
            logger.warning(f"on_admin_decision (approve) trigger failed: {wf_err}")

        logger.info(f"Property {property_id} approved by admin {current_user['user_id']}")
        return {"message": "Property approved successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving property: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to approve property"
        )


@router.post("/properties/{property_id}/reject")
async def reject_property(
    property_id: str,
    payload: AdminRejectRequest,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Reject property listing (final)."""
    try:
        property_data = await db.properties.find_one({"property_id": property_id}, {"_id": 0})
        if not property_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )

        await db.properties.update_one(
            {"property_id": property_id},
            {"$set": {
                "status": PropertyStatus.REJECTED.value,
                "verification_remarks": payload.reason,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        await db.property_verifications.update_one(
            {"property_id": property_id},
            {"$set": {
                "admin_reviewed": True,
                "admin_approved": False,
                "admin_remarks": payload.reason,
                "admin_id": current_user["user_id"],
                "admin_reviewed_at": datetime.now(timezone.utc),
                "status": "rejected",
                "updated_at": datetime.now(timezone.utc),
            }},
        )

        # Notify host
        try:
            from services.verification_workflow import on_admin_decision
            asyncio.create_task(on_admin_decision(db, property_data, approved=False, reason=payload.reason))
        except Exception as wf_err:
            logger.warning(f"on_admin_decision (reject) trigger failed: {wf_err}")

        logger.info(f"Property {property_id} rejected by admin {current_user['user_id']}")
        return {"message": "Property rejected successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting property: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reject property"
        )

# ========== DASHBOARD ANALYTICS ==========

@router.get("/dashboard/stats")
async def get_dashboard_stats(
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get dashboard statistics."""
    try:
        # User stats
        total_users = await db.users.count_documents({"role": {"$in": ["host", "guest"]}})
        total_hosts = await db.users.count_documents({"role": "host"})
        total_guests = await db.users.count_documents({"role": "guest"})
        pending_kyc = await db.users.count_documents({"role": "host", "kyc_status": "pending"})
        
        # Property stats
        total_properties = await db.properties.count_documents({})
        live_properties = await db.properties.count_documents({"status": PropertyStatus.LIVE.value})
        pending_verification = await db.properties.count_documents(
            {"status": {"$in": [PropertyStatus.PENDING_VERIFICATION.value, PropertyStatus.UNDER_REVIEW.value]}}
        )
        
        # Booking stats
        total_bookings = await db.bookings.count_documents({})
        confirmed_bookings = await db.bookings.count_documents({"booking_status": "confirmed"})
        
        # Revenue calculation
        booking_cursor = db.bookings.find({"payment_status": "paid"}, {"total_amount": 1})
        bookings = await booking_cursor.to_list(length=None)
        total_revenue = int(sum(b.get("total_amount", 0) for b in bookings) * 100)
        
        return {
            "users": {
                "total": total_users,
                "hosts": total_hosts,
                "guests": total_guests,
                "pending_kyc": pending_kyc
            },
            "properties": {
                "total": total_properties,
                "live": live_properties,
                "pending_verification": pending_verification
            },
            "bookings": {
                "total": total_bookings,
                "confirmed": confirmed_bookings
            },
            "revenue": {
                "total": total_revenue,
                "currency": "INR"
            }
        }
    
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch dashboard stats"
        )

# ========== BOOKING MANAGEMENT ==========

@router.get("/bookings")
async def get_all_bookings(
    status_filter: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all bookings with filters."""
    try:
        query = {}
        
        if status_filter:
            query["booking_status"] = status_filter
        
        cursor = db.bookings.find(query, {"_id": 0}).skip(skip).limit(limit).sort("created_at", -1)
        bookings = await cursor.to_list(length=limit)
        total = await db.bookings.count_documents(query)
        
        # Enrich bookings with Property, Host, and Guest details
        property_ids = list({b.get("property_id") for b in bookings if b.get("property_id")})
        guest_ids = list({b.get("guest_id") for b in bookings if b.get("guest_id")})
        host_ids = list({b.get("host_id") for b in bookings if b.get("host_id")})
        
        properties_map = {}
        if property_ids:
            props = await db.properties.find(
                {"property_id": {"$in": property_ids}},
                {"_id": 0, "property_id": 1, "title": 1, "city": 1, "images": 1, "price_per_night": 1, "bhk_type": 1, "category": 1}
            ).to_list(length=len(property_ids))
            properties_map = {p["property_id"]: p for p in props}
            
        users_map = {}
        all_user_ids = list(set(guest_ids + host_ids))
        if all_user_ids:
            users = await db.users.find(
                {"user_id": {"$in": all_user_ids}},
                {"_id": 0, "user_id": 1, "full_name": 1, "email": 1, "phone": 1}
            ).to_list(length=len(all_user_ids))
            users_map = {u["user_id"]: u for u in users}
            
        for b in bookings:
            b["property"] = properties_map.get(b.get("property_id"))
            b["guest"] = users_map.get(b.get("guest_id"))
            b["host"] = users_map.get(b.get("host_id"))
            
        return {
            "bookings": bookings,
            "total": total,
            "limit": limit,
            "skip": skip
        }
    
    except Exception as e:
        logger.error(f"Error fetching bookings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch bookings"
        )


@router.get("/search-logs")
async def get_search_logs(
    city: Optional[str] = None,
    has_results: Optional[bool] = None,
    limit: int = 50,
    skip: int = 0,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get search logs from landing page (Admin only)."""
    try:
        query = {}
        if city:
            query["city"] = {"$regex": city, "$options": "i"}
            
        if has_results is not None:
            if has_results:
                query["results_count"] = {"$gt": 0}
            else:
                query["results_count"] = 0
                
        cursor = db.search_logs.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit)
        logs = await cursor.to_list(length=limit)
        total = await db.search_logs.count_documents(query)
        
        return {
            "logs": logs,
            "total": total,
            "limit": limit,
            "skip": skip
        }
    except Exception as e:
        logger.error(f"Error fetching search logs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch search logs"
        )

