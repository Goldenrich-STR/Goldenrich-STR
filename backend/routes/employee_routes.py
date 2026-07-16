from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import List, Optional
from models.user import UserRole
from models.verification import VerificationStatus
from middleware.auth_middleware import get_current_user
from datetime import datetime, date, timedelta, timezone
import logging
import io
import csv
import asyncio
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/employee", tags=["Employee"])


class RMReviewRequest(BaseModel):
    remarks: Optional[str] = None


class RMRejectRequest(BaseModel):
    reason: str

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
            "rm_reviewed": False,
            "$or": [
                {"rm_id": current_user["user_id"]},
                {"rm_id": None},
                {"rm_id": {"$exists": False}}
            ]
        })
        
        # Total properties under review (pending RM review)
        pending_reviews = await db.property_verifications.find({
            "status": VerificationStatus.COMPLETED.value,
            "rm_reviewed": False,
            "$or": [
                {"rm_id": current_user["user_id"]},
                {"rm_id": None},
                {"rm_id": {"$exists": False}}
            ]
        }).to_list()
        
        pending_property_ids = list(set([v["property_id"] for v in pending_reviews if "property_id" in v]))
        
        properties_under_review = await db.properties.count_documents({
            "status": "under_review",
            "property_id": {"$in": pending_property_ids}
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
                "rm_reviewed": False,
                "$or": [
                    {"rm_id": current_user["user_id"]},
                    {"rm_id": None},
                    {"rm_id": {"$exists": False}}
                ]
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

@router.get("/verifications/history")
async def get_verification_history(
    current_user: dict = Depends(require_employee),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all verifications reviewed by this RM or rejected by admin."""
    try:
        # Get all verifications where this RM reviewed it, or where status is rejected
        cursor = db.property_verifications.find(
            {
                "$or": [
                    {"rm_id": current_user["user_id"]},
                    {"status": "rejected"},
                    {"status": "approved"}
                ]
            },
            {"_id": 0}
        ).sort("updated_at", -1)
        
        verifications = await cursor.to_list(length=100)
        
        # Enrich with property and broker details
        for verification in verifications:
            property_data = await db.properties.find_one(
                {"property_id": verification["property_id"]},
                {"_id": 0}
            )
            if property_data:
                verification["property_details"] = property_data
            
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
        logger.error(f"Error fetching verification history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch verification history"
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

@router.get("/verifications/{verification_id}/export-report")
async def export_verification_report_xlsx(
    verification_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Export a single verification report as a Luxury Premium XLSX."""
    if current_user["role"] not in (UserRole.EMPLOYEE.value, "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee or Admin access required"
        )
    print(f"DEBUG: Generating Luxury Report for {verification_id}")
    try:
        # Get full verification details
        verification = await db.property_verifications.find_one(
            {"verification_id": verification_id},
            {"_id": 0}
        )
        
        if not verification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Verification not found"
            )
        
        # Enrich with property, broker and owner
        property_data = await db.properties.find_one({"property_id": verification["property_id"]}, {"_id": 0})
        broker_data = await db.users.find_one({"user_id": verification["broker_id"]}, {"_id": 0, "full_name": 1, "lg_code": 1})
        owner_data = await db.users.find_one({"user_id": verification["owner_id"]}, {"_id": 0, "full_name": 1})

        # Create Styled Excel Workbook
        wb = Workbook()
        ws = wb.active
        ws.title = "Executive Audit"
        ws.sheet_view.showGridLines = False

        # Luxury Noir Palette (Black & Gold)
        noir = "1A1A1A"
        gold = "D4AF37"
        platinum = "E5E4E2"
        white = "FFFFFF"
        
        # Styles
        title_font = Font(name='Georgia', size=24, bold=True, color=gold)
        header_font = Font(name='Georgia', size=14, bold=True, color=gold)
        label_font = Font(name='Arial', size=11, bold=True, color=platinum)
        value_font = Font(name='Arial', size=11, color=white)
        
        bg_fill = PatternFill(start_color=noir, end_color=noir, fill_type="solid")
        
        gold_side = Side(style='thin', color=gold)
        gold_border = Border(left=gold_side, right=gold_side, top=gold_side, bottom=gold_side)
        
        # Fill background
        for r in range(1, 100):
            for c in range(1, 10):
                ws.cell(row=r, column=c).fill = bg_fill

        # Set Column Widths
        ws.column_dimensions['A'].width = 40
        ws.column_dimensions['B'].width = 60
        ws.column_dimensions['C'].width = 30

        # 1. Luxury Header
        ws.merge_cells('A1:C3')
        cell = ws['A1']
        cell.value = "X-SPACE360 | ELITE AUDIT"
        cell.font = title_font
        cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border = Border(left=gold_side, right=gold_side, top=gold_side, bottom=gold_side)

        curr_row = 5
        
        # 2. Property Hero
        ws.merge_cells(f'A{curr_row}:C{curr_row+1}')
        hero = ws[f'A{curr_row}']
        hero.value = property_data.get("title", "N/A").upper()
        hero.font = Font(name='Arial', size=16, bold=True, color=white)
        hero.alignment = Alignment(horizontal='center', vertical='center')
        hero.border = gold_border
        curr_row += 4

        # 3. Status Badge
        ws[f'A{curr_row}'] = "AUDIT STATUS"
        ws[f'B{curr_row}'] = "CERTIFIED" if verification.get("rm_approved") else "UNDER REVIEW"
        ws[f'A{curr_row}'].font = label_font
        ws[f'B{curr_row}'].font = Font(name='Arial', size=12, bold=True, color=noir)
        ws[f'B{curr_row}'].fill = PatternFill(start_color=gold, end_color=gold, fill_type="solid")
        ws[f'B{curr_row}'].alignment = Alignment(horizontal='center')
        ws[f'A{curr_row}'].border = gold_border
        ws[f'B{curr_row}'].border = gold_border
        curr_row += 3

        # 4. Details Section
        ws.merge_cells(f'A{curr_row}:C{curr_row}')
        ws[f'A{curr_row}'] = "I. METADATA & AUTHENTICATION"
        ws[f'A{curr_row}'].font = header_font
        ws[f'A{curr_row}'].fill = PatternFill(start_color="333333", end_color="333333", fill_type="solid")
        curr_row += 1

        details = [
            ("Verification ID", verification["verification_id"]),
            ("Audit Reference", datetime.now(timezone.utc).strftime('%d %B %Y')),
            ("Lead Auditor", current_user.get("full_name", "N/A")),
            ("Field Intelligence", broker_data.get("full_name", "N/A"))
        ]

        for label, val in details:
            ws[f'A{curr_row}'] = label
            ws[f'B{curr_row}'] = val
            ws[f'A{curr_row}'].font = label_font
            ws[f'B{curr_row}'].font = value_font
            ws[f'A{curr_row}'].border = gold_border
            ws[f'B{curr_row}'].border = gold_border
            curr_row += 1
        
        curr_row += 2

        # 5. Checklist Section
        ws.merge_cells(f'A{curr_row}:C{curr_row}')
        cell = ws[f'A{curr_row}']
        cell.value = "II. COMPLIANCE CHECKLIST"
        cell.font = header_font
        cell.fill = PatternFill(start_color="333333", end_color="333333", fill_type="solid")
        curr_row += 1

        checklist = verification.get("checklist", {})
        for key, value in checklist.items():
            ws[f'A{curr_row}'] = key.replace("_", " ").title()
            ws[f'B{curr_row}'] = "✔ COMPLIANT" if value else "✘ DEFICIENT"
            ws[f'A{curr_row}'].font = value_font
            ws[f'B{curr_row}'].font = Font(name='Arial', size=11, bold=True, color="27AE60" if value else "C0392B")
            ws[f'A{curr_row}'].border = gold_border
            ws[f'B{curr_row}'].border = gold_border
            curr_row += 1

        # Footer
        curr_row += 3
        ws[f'A{curr_row}'] = "OFFICIAL ELECTRONIC RECORD"
        ws[f'A{curr_row}'].font = Font(size=8, color=gold)
        ws[f'C{curr_row}'] = "SECURE DOCUMENT"
        ws[f'C{curr_row}'].font = Font(size=8, italic=True, color=gold)
        ws[f'C{curr_row}'].alignment = Alignment(horizontal='right')

        # Save to IO
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        # Use a timestamp to prevent browser caching
        ts = datetime.now().strftime('%H%M%S')
        filename = f"Elite_Report_{verification_id}_{ts}.xlsx"
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

        # Save to IO
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        filename = f"Verification_Report_{verification_id}.xlsx"
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

    except Exception as e:
        logger.error(f"Error exporting verification XLSX: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export report: {str(e)}"
        )

@router.post("/verifications/{verification_id}/approve")
async def approve_verification(
    verification_id: str,
    payload: Optional[RMReviewRequest] = None,
    current_user: dict = Depends(require_employee),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Approve verification and forward to admin."""
    try:
        remarks = payload.remarks if payload else None
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
                "reviewed_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        # Property stays in under_review - awaiting admin final approval

        # Notify admins + host
        try:
            from services.verification_workflow import on_rm_decision
            verification_doc = await db.property_verifications.find_one(
                {"verification_id": verification_id}, {"_id": 0}
            )
            asyncio.create_task(on_rm_decision(db, verification_doc, approved=True, remarks=remarks or ""))
        except Exception as wf_err:
            logger.warning(f"on_rm_decision (approve) trigger failed: {wf_err}")

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
    payload: RMRejectRequest,
    current_user: dict = Depends(require_employee),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Reject verification and send back to host."""
    try:
        reason = payload.reason
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
                "reviewed_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        # Update property status back to needs resubmission
        await db.properties.update_one(
            {"property_id": verification["property_id"]},
            {"$set": {
                "status": "draft",
                "verification_remarks": reason,
                "updated_at": datetime.now(timezone.utc)
            }}
        )

        # Notify host that the listing needs revision
        try:
            from services.verification_workflow import on_rm_decision
            verification_doc = await db.property_verifications.find_one(
                {"verification_id": verification_id}, {"_id": 0}
            )
            asyncio.create_task(on_rm_decision(db, verification_doc, approved=False, remarks=reason))
        except Exception as wf_err:
            logger.warning(f"on_rm_decision (reject) trigger failed: {wf_err}")

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
            "generated_at": datetime.now(timezone.utc).isoformat(),
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
                "Content-Disposition": f"attachment; filename=properties_not_booked_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
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
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "brokers": summary,
            "total": len(summary)
        }
    
    except Exception as e:
        logger.error(f"Error generating broker portfolio summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate report"
        )
