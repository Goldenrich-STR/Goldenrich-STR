from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from models.user import UserRole
from models.verification import VerificationStatus
from middleware.auth_middleware import get_current_user
from datetime import datetime, date, timedelta
import logging
import io
import csv

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/employee", tags=["Employee"])

async def require_employee(current_user: dict = Depends(get_current_user)):
    """Dependency to check if user is employee."""
    if current_user["role"] != UserRole.EMPLOYEE.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee access required"
        )
    return current_user

async def get_db():
    from server import db_instance
    return db_instance

# ========== EMPLOYEE DASHBOARD ==========

@router.get("/dashboard/stats")
async def get_employee_dashboard_stats(
    current_user: dict = Depends(require_employee),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get employee dashboard statistics."""
    try:
        # Get brokers in this RM's region (for now, show all brokers)
        total_brokers = await db.users.count_documents({"role": "broker"})
        
        # Pending verifications (all verifications waiting for RM review)
        pending_verifications = await db.property_verifications.count_documents({
            "status": VerificationStatus.COMPLETED.value,
            "rm_reviewed": False
        })
        
        # Total properties under review
        properties_under_review = await db.properties.count_documents({
            "status": "under_review"
        })
        
        # Subscription alerts
        from datetime import date
        today = date.today()
        expiring_soon_date = (today + timedelta(days=5)).isoformat()
        
        expiring_subscriptions = await db.subscriptions.count_documents({
            "status": {"$in": ["trial", "active"]},
            "end_date": {"$lte": expiring_soon_date}
        })
        
        return {
            "brokers": {
                "total": total_brokers
            },
            "verifications": {
                "pending_review": pending_verifications,
                "under_review": properties_under_review
            },
            "subscriptions": {
                "expiring_soon": expiring_subscriptions
            }
        }
    
    except Exception as e:
        logger.error(f"Error fetching employee dashboard stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch dashboard stats"
        )

# ========== VERIFICATION REVIEW ==========

@router.get("/verifications/pending")
async def get_pending_verifications(
    current_user: dict = Depends(require_employee),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all verifications pending RM review."""
    try:
        cursor = db.property_verifications.find(
            {
                "status": VerificationStatus.COMPLETED.value,
                "rm_reviewed": False
            },
            {"_id": 0}
        ).sort("completed_at", -1)
        
        verifications = await cursor.to_list(length=100)
        
        # Enrich with property and broker details
        for verification in verifications:
            # Get property details
            property_data = await db.properties.find_one(
                {"property_id": verification["property_id"]},
                {"_id": 0, "title": 1, "address": 1, "city": 1, "images": 1, "bhk_type": 1}
            )
            if property_data:
                verification["property_details"] = property_data
            
            # Get broker details
            broker_data = await db.users.find_one(
                {"user_id": verification["broker_id"]},
                {"_id": 0, "full_name": 1, "lg_code": 1, "phone": 1}
            )
            if broker_data:
                verification["broker_details"] = broker_data
        
        return {
            "verifications": verifications,
            "total": len(verifications)
        }
    
    except Exception as e:
        logger.error(f"Error fetching pending verifications: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch pending verifications"
        )

@router.get("/verifications/{verification_id}")
async def get_verification_details(
    verification_id: str,
    current_user: dict = Depends(require_employee),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get detailed verification report for review."""
    try:
        verification = await db.property_verifications.find_one(
            {"verification_id": verification_id},
            {"_id": 0}
        )
        
        if not verification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Verification not found"
            )
        
        # Get full property details
        property_data = await db.properties.find_one(
            {"property_id": verification["property_id"]},
            {"_id": 0}
        )
        verification["property_details"] = property_data
        
        # Get broker details
        broker_data = await db.users.find_one(
            {"user_id": verification["broker_id"]},
            {"_id": 0, "full_name": 1, "lg_code": 1, "phone": 1, "email": 1}
        )
        verification["broker_details"] = broker_data
        
        # Get owner details
        owner_data = await db.users.find_one(
            {"user_id": verification["owner_id"]},
            {"_id": 0, "full_name": 1, "phone": 1, "email": 1}
        )
        verification["owner_details"] = owner_data
        
        return verification
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching verification details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch verification details"
        )

@router.post("/verifications/{verification_id}/approve")
async def approve_verification(
    verification_id: str,
    remarks: Optional[str] = None,
    current_user: dict = Depends(require_employee),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Approve verification and forward to admin."""
    try:
        verification = await db.property_verifications.find_one(
            {"verification_id": verification_id}
        )
        
        if not verification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Verification not found"
            )
        
        # Update verification with RM approval
        await db.property_verifications.update_one(
            {"verification_id": verification_id},
            {"$set": {
                "rm_reviewed": True,
                "rm_approved": True,
                "rm_remarks": remarks,
                "rm_id": current_user["user_id"],
                "reviewed_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
        
        # Property stays in under_review - awaiting admin final approval
        
        logger.info(f"Verification {verification_id} approved by RM {current_user['user_id']}")
        return {
            "message": "Verification approved. Forwarded to admin for final approval.",
            "verification_id": verification_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving verification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to approve verification"
        )

@router.post("/verifications/{verification_id}/reject")
async def reject_verification(
    verification_id: str,
    reason: str,
    current_user: dict = Depends(require_employee),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Reject verification and send back to host."""
    try:
        verification = await db.property_verifications.find_one(
            {"verification_id": verification_id}
        )
        
        if not verification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Verification not found"
            )
        
        # Update verification with RM rejection
        await db.property_verifications.update_one(
            {"verification_id": verification_id},
            {"$set": {
                "rm_reviewed": True,
                "rm_approved": False,
                "rm_remarks": reason,
                "rm_id": current_user["user_id"],
                "status": VerificationStatus.REJECTED.value,
                "reviewed_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
        
        # Update property status back to needs resubmission
        await db.properties.update_one(
            {"property_id": verification["property_id"]},
            {"$set": {
                "status": "draft",
                "verification_remarks": reason,
                "updated_at": datetime.utcnow()
            }}
        )
        
        logger.info(f"Verification {verification_id} rejected by RM {current_user['user_id']}")
        return {
            "message": "Verification rejected. Host will be notified to resubmit.",
            "verification_id": verification_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting verification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reject verification"
        )

# ========== BROKER OVERSIGHT ==========

@router.get("/brokers")
async def get_all_brokers(
    current_user: dict = Depends(require_employee),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all brokers under this RM."""
    try:
        # For now, show all brokers (in production, filter by region)
        cursor = db.users.find(
            {"role": "broker"},
            {"_id": 0, "password_hash": 0}
        )
        brokers = await cursor.to_list(length=200)
        
        # Get stats for each broker
        for broker in brokers:
            broker_id = broker["user_id"]
            
            # Count owners
            owner_count = await db.users.count_documents({
                "broker_id": broker_id,
                "role": "host"
            })
            
            # Count properties
            property_count = await db.properties.count_documents({"broker_id": broker_id})
            live_properties = await db.properties.count_documents({
                "broker_id": broker_id,
                "status": "live"
            })
            
            # Pending verifications
            pending_verifications = await db.property_verifications.count_documents({
                "broker_id": broker_id,
                "status": {"$in": ["pending", "in_progress"]}
            })
            
            broker["stats"] = {
                "owners": owner_count,
                "properties": property_count,
                "live_properties": live_properties,
                "pending_verifications": pending_verifications
            }
        
        return {
            "brokers": brokers,
            "total": len(brokers)
        }
    
    except Exception as e:
        logger.error(f"Error fetching brokers: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch brokers"
        )

@router.get("/brokers/{broker_id}/portfolio")
async def get_broker_portfolio(
    broker_id: str,
    current_user: dict = Depends(require_employee),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get detailed portfolio for a specific broker."""
    try:
        # Get broker details
        broker = await db.users.find_one(
            {"user_id": broker_id, "role": "broker"},
            {"_id": 0, "password_hash": 0}
        )
        
        if not broker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Broker not found"
            )
        
        # Get all properties
        property_cursor = db.properties.find({"broker_id": broker_id}, {"_id": 0})
        properties = await property_cursor.to_list(length=200)
        
        # Get all owners
        owner_cursor = db.users.find(
            {"broker_id": broker_id, "role": "host"},
            {"_id": 0, "password_hash": 0}
        )
        owners = await owner_cursor.to_list(length=200)
        
        return {
            "broker": broker,
            "properties": properties,
            "owners": owners
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching broker portfolio: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch broker portfolio"
        )

# ========== REPORTS ==========

@router.get("/reports/properties-not-booked")
async def get_properties_not_booked_report(
    broker_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(require_employee),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get report of active properties with zero bookings."""
    try:
        # Build property query
        property_query = {"status": "live"}
        if broker_id:
            property_query["broker_id"] = broker_id
        
        # Get all live properties
        property_cursor = db.properties.find(property_query, {"_id": 0})
        properties = await property_cursor.to_list(length=500)
        
        # For each property, check if it has bookings
        properties_not_booked = []
        
        for property in properties:
            booking_count = await db.bookings.count_documents({
                "property_id": property["property_id"],
                "booking_status": "confirmed"
            })
            
            if booking_count == 0:
                # Get broker details
                if property.get("broker_id"):
                    broker = await db.users.find_one(
                        {"user_id": property["broker_id"]},
                        {"_id": 0, "full_name": 1, "lg_code": 1}
                    )
                    property["broker_name"] = broker.get("full_name") if broker else "N/A"
                    property["broker_lg_code"] = broker.get("lg_code") if broker else "N/A"
                
                properties_not_booked.append(property)
        
        return {
            "report_type": "properties_not_booked",
            "generated_at": datetime.utcnow().isoformat(),
            "filters": {
                "broker_id": broker_id,
                "start_date": start_date,
                "end_date": end_date
            },
            "properties": properties_not_booked,
            "total": len(properties_not_booked)
        }
    
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate report"
        )

@router.get("/reports/properties-not-booked/export-csv")
async def export_properties_not_booked_csv(
    broker_id: Optional[str] = None,
    current_user: dict = Depends(require_employee),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Export properties not booked report as CSV."""
    try:
        # Get report data
        property_query = {"status": "live"}
        if broker_id:
            property_query["broker_id"] = broker_id
        
        property_cursor = db.properties.find(property_query, {"_id": 0})
        properties = await property_cursor.to_list(length=500)
        
        properties_not_booked = []
        
        for property in properties:
            booking_count = await db.bookings.count_documents({
                "property_id": property["property_id"],
                "booking_status": "confirmed"
            })
            
            if booking_count == 0:
                if property.get("broker_id"):
                    broker = await db.users.find_one(
                        {"user_id": property["broker_id"]},
                        {"_id": 0, "full_name": 1, "lg_code": 1}
                    )
                    broker_name = broker.get("full_name") if broker else "N/A"
                    broker_lg_code = broker.get("lg_code") if broker else "N/A"
                else:
                    broker_name = "N/A"
                    broker_lg_code = "N/A"
                
                properties_not_booked.append({
                    "Property ID": property["property_id"],
                    "Title": property["title"],
                    "City": property["city"],
                    "BHK Type": property["bhk_type"],
                    "Category": property["category"],
                    "Price per Night": property.get("price_per_night", 0),
                    "Broker Name": broker_name,
                    "Broker LG Code": broker_lg_code,
                    "Created At": property["created_at"].isoformat() if isinstance(property["created_at"], datetime) else property["created_at"]
                })
        
        # Create CSV
        output = io.StringIO()
        if properties_not_booked:
            fieldnames = properties_not_booked[0].keys()
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(properties_not_booked)
        
        # Return as streaming response
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=properties_not_booked_{datetime.utcnow().strftime('%Y%m%d')}.csv"
            }
        )
    
    except Exception as e:
        logger.error(f"Error exporting CSV: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export CSV"
        )

@router.get("/reports/broker-portfolio-summary")
async def get_broker_portfolio_summary(
    current_user: dict = Depends(require_employee),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get summary report of all brokers' portfolios."""
    try:
        broker_cursor = db.users.find({"role": "broker"}, {"_id": 0})
        brokers = await broker_cursor.to_list(length=200)
        
        summary = []
        
        for broker in brokers:
            broker_id = broker["user_id"]
            
            total_properties = await db.properties.count_documents({"broker_id": broker_id})
            live_properties = await db.properties.count_documents({"broker_id": broker_id, "status": "live"})
            pending_verification = await db.property_verifications.count_documents({
                "broker_id": broker_id,
                "status": {"$in": ["pending", "in_progress"]}
            })
            
            summary.append({
                "broker_name": broker["full_name"],
                "lg_code": broker.get("lg_code", "N/A"),
                "total_properties": total_properties,
                "live_properties": live_properties,
                "pending_verification": pending_verification
            })
        
        return {
            "report_type": "broker_portfolio_summary",
            "generated_at": datetime.utcnow().isoformat(),
            "brokers": summary,
            "total": len(summary)
        }
    
    except Exception as e:
        logger.error(f"Error generating broker portfolio summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate report"
        )
