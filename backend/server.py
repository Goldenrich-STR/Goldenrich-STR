from fastapi import FastAPI, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import os
import logging
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db_instance = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(
    title="PropNest STR API",
    description="Short Term Renting Platform API",
    version="1.0.0"
)

# Dependency to get database
async def get_db() -> AsyncIOMotorDatabase:
    return db_instance

# Import routes
from routes.auth_routes import router as auth_router
from routes.property_routes import router as property_router
from routes.booking_routes import router as booking_router
from routes.admin_routes import router as admin_router
from routes.cms_routes import router as cms_router
from routes.subscription_routes import router as subscription_router
from routes.broker_routes import router as broker_router
from routes.employee_routes import router as employee_router
from routes.notification_routes import router as notification_router
from routes.calendar_routes import router as calendar_router

# Include routers with /api prefix
app.include_router(auth_router, prefix="/api")
app.include_router(property_router, prefix="/api")
app.include_router(booking_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(cms_router, prefix="/api")
app.include_router(subscription_router, prefix="/api")
app.include_router(broker_router, prefix="/api")
app.include_router(employee_router, prefix="/api")
app.include_router(notification_router, prefix="/api")
app.include_router(calendar_router, prefix="/api")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_db_indexes():
    """Ensure critical unique indexes exist."""
    try:
        await db_instance.bookings.create_index("booking_id", unique=True)
        await db_instance.properties.create_index("property_id", unique=True)
        await db_instance.users.create_index("user_id", unique=True)
        await db_instance.users.create_index("email", unique=True)
        await db_instance.blocked_dates.create_index("blocked_date_id", unique=True)
        await db_instance.external_calendars.create_index("calendar_id", unique=True)
        # Compound index for availability queries
        await db_instance.bookings.create_index([("property_id", 1), ("check_in_date", 1), ("check_out_date", 1)])
        await db_instance.blocked_dates.create_index([("property_id", 1), ("start_date", 1), ("end_date", 1)])
        # Reaper-friendly index
        await db_instance.bookings.create_index([("booking_status", 1), ("soft_lock_expires_at", 1)])
        logger.info("MongoDB indexes ensured")
    except Exception as e:
        logger.error(f"Failed to create indexes: {e}")


@app.on_event("startup")
async def startup_background_jobs():
    """Start the soft-lock reaper and recover any pending soft-lock reminders."""
    try:
        from services.soft_lock_reaper import (
            start_soft_lock_reaper,
            recover_pending_reminders,
        )
        # Recover dropped reminders from a previous worker restart
        await recover_pending_reminders(db_instance)
        # Start periodic reaper
        reaper_interval = int(os.environ.get("SOFT_LOCK_REAPER_INTERVAL", "30"))
        start_soft_lock_reaper(db_instance, interval_seconds=reaper_interval)
    except Exception as e:
        logger.error(f"Failed to start background jobs: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "PropNest STR API",
        "version": "1.0.0"
    }

@app.get("/api/")
async def root():
    """Root API endpoint."""
    return {
        "message": "PropNest STR API",
        "version": "1.0.0",
        "docs": "/docs"
    }
