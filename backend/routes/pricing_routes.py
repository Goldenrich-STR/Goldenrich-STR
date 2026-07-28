from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import logging
import uuid
from models.user import UserRole
from middleware.auth_middleware import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/pricing", tags=["Pricing"])

async def get_db():
    from server import db_instance
    return db_instance

# Pydantic schemas
class WeekendRules(BaseModel):
    is_enabled: bool = False
    saturday_pct: float = 0.0
    sunday_pct: float = 0.0

class FestivalRuleItem(BaseModel):
    name: str
    start_date: str
    end_date: str
    increase_pct: float

class FestivalRules(BaseModel):
    is_enabled: bool = False
    festivals: List[FestivalRuleItem] = []

class SeasonalRules(BaseModel):
    is_enabled: bool = False
    summer_pct: float = 0.0
    winter_pct: float = 0.0
    monsoon_pct: float = 0.0

class OccupancyRules(BaseModel):
    is_enabled: bool = False
    bracket_0_30: float = 0.0
    bracket_31_60: float = 0.0
    bracket_61_80: float = 0.0
    bracket_81_100: float = 0.0

class PromotionalRules(BaseModel):
    is_enabled: bool = False
    campaign_name: str = ""
    pct_change: float = 0.0

class GlobalPricingRules(BaseModel):
    rule_id: str = "global"
    calculation_mode: str = "highest"  # "highest" or "cumulative"
    weekend: WeekendRules = Field(default_factory=WeekendRules)
    festival: FestivalRules = Field(default_factory=FestivalRules)
    seasonal: SeasonalRules = Field(default_factory=SeasonalRules)
    occupancy: OccupancyRules = Field(default_factory=OccupancyRules)
    promotional: PromotionalRules = Field(default_factory=PromotionalRules)

class ApplyPricingRequest(BaseModel):
    property_ids: List[str]
    rules: GlobalPricingRules
    target_types: Optional[List[str]] = None

class ToggleRulesStatusRequest(BaseModel):
    property_id: str
    status: str  # "active" or "stopped"

class ToggleBatchStatusRequest(BaseModel):
    property_ids: List[str]
    status: str

class ManualOverrideRequest(BaseModel):
    property_id: str
    base_price: float

async def calculate_dynamic_price(property_dict: dict, rules: dict, db) -> float:
    base_price = float(property_dict.get("base_price") or property_dict.get("price_per_night") or 0)
    if not base_price:
        return 0.0
        
    calculation_mode = rules.get("calculation_mode", "highest")
    adjustments = []
    
    today = datetime.now(timezone.utc).date()
    
    # 1. Weekend Pricing
    weekend = rules.get("weekend", {})
    if weekend.get("is_enabled"):
        weekday = today.weekday()  # 5 is Saturday, 6 is Sunday
        if weekday == 5:
            adjustments.append(float(weekend.get("saturday_pct", 0.0)))
        elif weekday == 6:
            adjustments.append(float(weekend.get("sunday_pct", 0.0)))
            
    # 2. Festival Pricing
    festival = rules.get("festival", {})
    if festival.get("is_enabled"):
        for fest in festival.get("festivals", []):
            try:
                start = datetime.strptime(fest["start_date"].split('T')[0], "%Y-%m-%d").date()
                end = datetime.strptime(fest["end_date"].split('T')[0], "%Y-%m-%d").date()
                if start <= today <= end:
                    adjustments.append(float(fest.get("increase_pct", 0.0)))
                    break
            except Exception:
                pass
                
    # 3. Seasonal Pricing
    seasonal = rules.get("seasonal", {})
    if seasonal.get("is_enabled"):
        month = today.month
        if month in [3, 4, 5]:  # Summer (March, April, May)
            adjustments.append(float(seasonal.get("summer_pct", 0.0)))
        elif month in [6, 7, 8, 9]:  # Monsoon (June, July, August, September)
            adjustments.append(float(seasonal.get("monsoon_pct", 0.0)))
        elif month in [10, 11, 12, 1, 2]:  # Winter (October, November, December, January, February)
            adjustments.append(float(seasonal.get("winter_pct", 0.0)))
            
    # 4. Occupancy Pricing
    occupancy = rules.get("occupancy", {})
    if occupancy.get("is_enabled"):
        from datetime import timedelta
        end_date = today + timedelta(days=30)
        today_str = today.isoformat()
        end_date_str = end_date.isoformat()
        
        booked_nights = 0
        try:
            bookings = await db.bookings.find({
                "property_id": property_dict["property_id"],
                "booking_status": "confirmed",
                "check_in_date": {"$lt": end_date_str},
                "check_out_date": {"$gt": today_str}
            }).to_list(length=100)
            
            for b in bookings:
                try:
                    cin = datetime.strptime(b["check_in_date"].split('T')[0], "%Y-%m-%d").date()
                    cout = datetime.strptime(b["check_out_date"].split('T')[0], "%Y-%m-%d").date()
                    overlap_start = max(today, cin)
                    overlap_end = min(end_date, cout)
                    if overlap_end > overlap_start:
                        booked_nights += (overlap_end - overlap_start).days
                except Exception:
                    pass
        except Exception:
            pass
            
        occupancy_pct = (booked_nights / 30.0) * 100.0
        if occupancy_pct <= 30.0:
            adjustments.append(float(occupancy.get("bracket_0_30", 0.0)))
        elif occupancy_pct <= 60.0:
            adjustments.append(float(occupancy.get("bracket_31_60", 0.0)))
        elif occupancy_pct <= 80.0:
            adjustments.append(float(occupancy.get("bracket_61_80", 0.0)))
        else:
            adjustments.append(float(occupancy.get("bracket_81_100", 0.0)))
            
    # 5. Promotional Campaign
    promotional = rules.get("promotional", {})
    if promotional.get("is_enabled"):
        adjustments.append(float(promotional.get("pct_change", 0.0)))
        
    # Calculate total pct change based on calculation mode
    if not adjustments:
        total_pct_change = 0.0
    elif calculation_mode == "highest":
        # Find adjustment with highest absolute influence, keeping positive/negative sign
        total_pct_change = max(adjustments, key=abs)
    else:
        total_pct_change = sum(adjustments)
        
    new_price = base_price * (1.0 + total_pct_change / 100.0)
    return round(new_price, 2)

@router.get("/rules", response_model=GlobalPricingRules)
async def get_pricing_rules(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    rules = await db.pricing_rules.find_one({"rule_id": "global"})
    if not rules:
        default_rules = GlobalPricingRules().model_dump()
        await db.pricing_rules.insert_one(default_rules)
        return default_rules
    return rules

@router.post("/rules")
async def save_pricing_rules(
    rules_data: GlobalPricingRules,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    rules_dict = rules_data.model_dump()
    rules_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.pricing_rules.update_one(
        {"rule_id": "global"},
        {"$set": rules_dict},
        upsert=True
    )
    return {"message": "Rules updated successfully", "rules": rules_dict}

@router.get("/properties")
async def get_pricing_properties(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    properties = await db.properties.find({"status": "live"}, {
        "property_id": 1,
        "title": 1,
        "city": 1,
        "price_per_night": 1,
        "base_price": 1,
        "pricing_rules": 1,
        "rules_status": 1,
        "status": 1,
        "property_type": 1,
        "category": 1,
        "updated_at": 1
    }).to_list(length=200)
    
    results = []
    for p in properties:
        if "base_price" not in p or p["base_price"] is None:
            p["base_price"] = p.get("price_per_night") or 0.0
            
        p_rules = p.get("pricing_rules")
        p_status = p.get("rules_status") or "stopped"
        
        new_price = p["price_per_night"]
        if p_rules and p_status == "active":
            new_price = await calculate_dynamic_price(p, p_rules, db)
            
        results.append({
            "property_id": p["property_id"],
            "title": p["title"],
            "city": p["city"],
            "price_per_night": p.get("price_per_night") or 0.0,
            "base_price": p["base_price"],
            "new_price": new_price,
            "pricing_rules": p_rules,
            "rules_status": p_status,
            "property_type": p.get("property_type") or "villa",
            "category": p.get("category") or "residential",
            "status": p["status"],
            "updated_at": p.get("updated_at")
        })
    return results

@router.post("/preview")
async def preview_pricing(
    req: ApplyPricingRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    properties = await db.properties.find({"property_id": {"$in": req.property_ids}}).to_list(length=500)
    
    previews = []
    rules_dict = req.rules.model_dump()
    for p in properties:
        if "base_price" not in p or p["base_price"] is None:
            p["base_price"] = p.get("price_per_night") or 0.0
            
        # Check target type filter
        if req.target_types and p.get("property_type") not in req.target_types:
            continue
            
        new_price = await calculate_dynamic_price(p, rules_dict, db)
        previews.append({
            "property_id": p["property_id"],
            "title": p["title"],
            "old_price": p.get("price_per_night") or 0.0,
            "new_price": new_price
        })
    return previews

@router.post("/apply")
async def apply_pricing(
    req: ApplyPricingRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    properties = await db.properties.find({"property_id": {"$in": req.property_ids}}).to_list(length=500)
    
    applied_count = 0
    history_records = []
    rules_dict = req.rules.model_dump()
    
    for p in properties:
        if "base_price" not in p or p["base_price"] is None:
            p["base_price"] = p.get("price_per_night") or 0.0
            
        # Check target type filter
        if req.target_types and p.get("property_type") not in req.target_types:
            continue
            
        old_price = p.get("price_per_night") or 0.0
        new_price = await calculate_dynamic_price(p, rules_dict, db)
        
        await db.properties.update_one(
            {"property_id": p["property_id"]},
            {"$set": {
                "price_per_night": new_price,
                "base_price": p["base_price"],
                "pricing_rules": rules_dict,
                "rules_status": "active",
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        history_records.append({
            "history_id": f"hist_{uuid.uuid4().hex[:12]}",
            "property_id": p["property_id"],
            "property_title": p["title"],
            "old_price": old_price,
            "new_price": new_price,
            "updated_by": current_user.get("full_name") or current_user.get("email") or "Admin",
            "reason": "Dynamic pricing rules applied & activated",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        applied_count += 1
            
    if history_records:
        await db.price_history.insert_many(history_records)
        
    return {"message": f"Successfully applied pricing rules to {applied_count} properties", "updated_count": applied_count}

@router.post("/toggle-status")
async def toggle_rules_status(
    req: ToggleRulesStatusRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    p = await db.properties.find_one({"property_id": req.property_id})
    if not p:
        raise HTTPException(status_code=404, detail="Property not found")
        
    old_price = p.get("price_per_night") or 0.0
    base_price = p.get("base_price") or old_price
    
    if req.status == "stopped":
        new_price = base_price
        await db.properties.update_one(
            {"property_id": req.property_id},
            {"$set": {
                "price_per_night": new_price,
                "rules_status": "stopped",
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        reason = "Dynamic pricing rules stopped. Reverted to base price."
    else:
        p_rules = p.get("pricing_rules") or GlobalPricingRules().model_dump()
        new_price = await calculate_dynamic_price(p, p_rules, db)
        await db.properties.update_one(
            {"property_id": req.property_id},
            {"$set": {
                "price_per_night": new_price,
                "rules_status": "active",
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        reason = "Dynamic pricing rules resumed/activated."
        
    history_record = {
        "history_id": f"hist_{uuid.uuid4().hex[:12]}",
        "property_id": p["property_id"],
        "property_title": p["title"],
        "old_price": old_price,
        "new_price": new_price,
        "updated_by": current_user.get("full_name") or current_user.get("email") or "Admin",
        "reason": reason,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.price_history.insert_one(history_record)
    
    return {"message": "Rules status updated successfully", "new_price": new_price, "status": req.status}

@router.post("/toggle-status-batch")
async def toggle_rules_status_batch(
    req: ToggleBatchStatusRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    properties = await db.properties.find({"property_id": {"$in": req.property_ids}}).to_list(length=500)
    
    updated_count = 0
    history_records = []
    for p in properties:
        old_price = p.get("price_per_night") or 0.0
        base_price = p.get("base_price") or old_price
        
        if req.status == "stopped":
            new_price = base_price
            await db.properties.update_one(
                {"property_id": p["property_id"]},
                {"$set": {
                    "price_per_night": new_price,
                    "rules_status": "stopped",
                    "updated_at": datetime.now(timezone.utc)
                }}
            )
            reason = "Dynamic pricing rules stopped (Batch)"
        else:
            p_rules = p.get("pricing_rules") or GlobalPricingRules().model_dump()
            new_price = await calculate_dynamic_price(p, p_rules, db)
            await db.properties.update_one(
                {"property_id": p["property_id"]},
                {"$set": {
                    "price_per_night": new_price,
                    "rules_status": "active",
                    "updated_at": datetime.now(timezone.utc)
                }}
            )
            reason = "Dynamic pricing rules resumed (Batch)"
            
        history_records.append({
            "history_id": f"hist_{uuid.uuid4().hex[:12]}",
            "property_id": p["property_id"],
            "property_title": p["title"],
            "old_price": old_price,
            "new_price": new_price,
            "updated_by": current_user.get("full_name") or current_user.get("email") or "Admin",
            "reason": reason,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        updated_count += 1
        
    if history_records:
        await db.price_history.insert_many(history_records)
        
    return {"message": f"Successfully toggled status to {req.status} for {updated_count} properties", "updated_count": updated_count}

@router.post("/manual-override")
async def manual_override(
    req: ManualOverrideRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    p = await db.properties.find_one({"property_id": req.property_id})
    if not p:
        raise HTTPException(status_code=404, detail="Property not found")
        
    old_price = p.get("price_per_night") or 0.0
    new_price = req.base_price
    
    await db.properties.update_one(
        {"property_id": req.property_id},
        {"$set": {
            "price_per_night": new_price,
            "base_price": req.base_price,
            "rules_status": "stopped",
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    history_record = {
        "history_id": f"hist_{uuid.uuid4().hex[:12]}",
        "property_id": req.property_id,
        "property_title": p["title"],
        "old_price": old_price,
        "new_price": new_price,
        "updated_by": current_user.get("full_name") or current_user.get("email") or "Admin",
        "reason": f"Manual Override to {new_price} (Rules stopped)",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.price_history.insert_one(history_record)
    
    return {"message": f"Successfully overrode base price for {p['title']}", "new_price": new_price}

@router.get("/history")
async def get_price_history(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    history = await db.price_history.find({}).sort("created_at", -1).to_list(length=100)
    return history
