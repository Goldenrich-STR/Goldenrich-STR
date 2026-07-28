import asyncio
import logging
from datetime import datetime, timezone
from routes.pricing_routes import calculate_dynamic_price

logger = logging.getLogger(__name__)

async def start_pricing_scheduler(db):
    """
    Background job to run daily (or periodically) to recalculate price_per_night 
    for properties that have active rules status.
    """
    await asyncio.sleep(15)  # Wait for startup sequences to finalize
    while True:
        try:
            logger.info("Pricing Scheduler: Starting periodic dynamic rate sync...")
            properties = await db.properties.find({"status": "live", "rules_status": "active"}).to_list(length=1000)
            
            updated_count = 0
            for p in properties:
                p_rules = p.get("pricing_rules")
                if p_rules:
                    new_price = await calculate_dynamic_price(p, p_rules, db)
                    if new_price != p.get("price_per_night"):
                        await db.properties.update_one(
                            {"property_id": p["property_id"]},
                            {"$set": {
                                "price_per_night": new_price,
                                "updated_at": datetime.now(timezone.utc)
                            }}
                        )
                        updated_count += 1
                        
            logger.info(f"Pricing Scheduler: Dynamic rate sync completed. Updated {updated_count} properties.")
        except Exception as e:
            logger.error(f"Pricing Scheduler Error: {e}")
            
        # Run every 6 hours
        await asyncio.sleep(21600)

def register_pricing_scheduler(db):
    asyncio.create_task(start_pricing_scheduler(db))
