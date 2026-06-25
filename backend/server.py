from fastapi import FastAPI, Depends, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import os
import logging
import asyncio
from pathlib import Path
from create_missing_users import create_missing_users
from collections import defaultdict, deque
import time

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Database connection
db_type = os.environ.get('DATABASE_TYPE', 'mongo')
if db_type == 'postgres':
    from utils.pg_adapter import PGAdapter
    db_instance = PGAdapter(os.environ['POSTGRES_URL'])
    client = None
else:
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url, tz_aware=True)
    db_instance = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(
    title="X-Space360 STR API",
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
from routes.upload_routes import router as upload_router
from routes.admin_account_routes import router as admin_account_router
from routes.host_account_routes import router as host_account_router
from routes.review_routes import router as review_router
from routes.webhook_routes import router as webhook_router
from routes.coupon_routes import router as coupon_router
from routes.ai_agent_routes import router as ai_agent_router

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
app.include_router(upload_router, prefix="/api")
app.include_router(admin_account_router, prefix="/api")
app.include_router(host_account_router, prefix="/api")
app.include_router(review_router, prefix="/api")
app.include_router(webhook_router, prefix="/api")
app.include_router(coupon_router, prefix="/api")
app.include_router(ai_agent_router, prefix="/api")
from routes.seo_routes import router as seo_router
app.include_router(seo_router)

# Backward-compatible auth aliases. Some deployed/cached frontend bundles may
# still call /auth/*; keep those working while the canonical API remains /api/auth/*.
app.include_router(auth_router)

# Custom StaticFiles subclass to enforce browser caching headers dynamically
class DynamicCacheStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        filename = path.lower()
        if filename.endswith(('.css', '.js')):
            response.headers["Cache-Control"] = "public, max-age=2592000"  # 30 Days
        elif filename.endswith(('.webp', '.jpg', '.jpeg', '.png', '.svg', '.gif', '.woff', '.woff2', '.ttf', '.otf', '.eot', '.mp4', '.webm')):
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"  # 1 Year
        else:
            response.headers["Cache-Control"] = "public, max-age=86400"  # 1 Day default
        return response

# Static files: serve uploaded property images
_uploads_dir = ROOT_DIR / "uploads"
_uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads", DynamicCacheStaticFiles(directory=str(_uploads_dir)), name="uploads")

@app.get("/download-apk")
async def download_apk():
    release_apk = r"d:\FinalSTR\Goldenrich-STR\mobile\build\app\outputs\flutter-apk\app-release.apk"
    debug_apk = r"d:\FinalSTR\Goldenrich-STR\mobile\build\app\outputs\flutter-apk\app-debug.apk"
    
    selected_apk = release_apk if os.path.exists(release_apk) else debug_apk
    
    if os.path.exists(selected_apk):
        return FileResponse(
            selected_apk,
            media_type="application/vnd.android.package-archive",
            filename="GoldenrichSTR.apk"
        )
    return {"error": "APK file not found. Please build the mobile application first."}

# CORS middleware
_cors_origins = os.environ.get('CORS_ORIGINS', '*').split(',')
if "*" in _cors_origins:
    # Browsers block '*' origins when allow_credentials=True.
    # For development, we allow common local origins.
    _cors_origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:8001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:8001",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from services.razorpay_service import request_user_agent_var

_rate_buckets = defaultdict(deque)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()
    return request.client.host if request.client else "unknown"


def _rate_limit_for_path(path: str) -> tuple[int, int]:
    if path.startswith("/api/auth"):
        return 30, 60
    if path.startswith("/api/upload"):
        return 20, 60
    return 240, 60


@app.middleware("http")
async def security_headers_and_rate_limit(request: Request, call_next):
    path = request.url.path
    if path.startswith("/api"):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > 10 * 1024 * 1024:
            from fastapi.responses import JSONResponse
            return JSONResponse(
                {"detail": "Request body too large"},
                status_code=413,
                headers={"Retry-After": "60"},
            )

        limit, window = _rate_limit_for_path(path)
        key = (_client_ip(request), path.split("/", 3)[1:3][1] if len(path.split("/", 3)) > 2 else path)
        now = time.monotonic()
        bucket = _rate_buckets[key]
        while bucket and bucket[0] <= now - window:
            bucket.popleft()
        if len(bucket) >= limit:
            from fastapi.responses import JSONResponse
            return JSONResponse(
                {"detail": "Too many requests"},
                status_code=429,
                headers={"Retry-After": str(window)},
            )
        bucket.append(now)

    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=(self), payment=(self)")
    response.headers.setdefault("Cross-Origin-Resource-Policy", "same-site")
    if request.url.scheme == "https":
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response


@app.middleware("http")
async def set_user_agent_context(request: Request, call_next):
    user_agent = request.headers.get("user-agent", "")
    token = request_user_agent_var.set(user_agent)
    try:
        response = await call_next(request)
        return response
    finally:
        request_user_agent_var.reset(token)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(str(ROOT_DIR.parent / "backend_server.log"), encoding="utf-8")
    ]
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_sequence():
    """Consolidated startup sequence to ensure correct order of initialization."""
    # 1. Initialize database connection and tables
    if os.environ.get('DATABASE_TYPE') == 'postgres':
        await db_instance.connect()
        tables = [
            "users", "properties", "bookings", "blocked_dates", 
            "external_calendars", "property_verifications", 
            "transactions", "payouts", "refunds", "reviews", 
            "notifications", "subscription_plans", "subscriptions", "cms_content", "leads", "coupons",
            "deleted_properties", "search_logs", "ai_calls", "ai_agents", "calendar_sync_logs"
        ]
        for table in tables:
            await db_instance.ensure_table(table)
        logger.info("PostgreSQL tables ensured")
    
    try:
        # 2. Create indexes (Mocked for PG, real for Mongo)
        await db_instance.bookings.create_index("booking_id", unique=True)
        await db_instance.properties.create_index("property_id", unique=True)
        await db_instance.users.create_index("user_id", unique=True)
        await db_instance.users.create_index("email", unique=True)
        await db_instance.blocked_dates.create_index("blocked_date_id", unique=True)
        await db_instance.external_calendars.create_index("calendar_id", unique=True)
        await db_instance.property_verifications.create_index("verification_id", unique=True)
        await db_instance.property_verifications.create_index("property_id")
        await db_instance.transactions.create_index("transaction_id", unique=True)
        await db_instance.transactions.create_index([("type", 1), ("created_at", -1)])
        await db_instance.transactions.create_index("booking_id")
        await db_instance.transactions.create_index("host_id")
        await db_instance.payouts.create_index("payout_id", unique=True)
        await db_instance.payouts.create_index("booking_id", unique=True)
        await db_instance.payouts.create_index([("status", 1), ("eligible_at", -1)])
        await db_instance.refunds.create_index("refund_id", unique=True)
        await db_instance.refunds.create_index("booking_id")
        await db_instance.reviews.create_index("review_id", unique=True)
        await db_instance.reviews.create_index("booking_id", unique=True)
        await db_instance.reviews.create_index([("property_id", 1), ("created_at", -1)])
        await db_instance.reviews.create_index("host_id")
        await db_instance.reviews.create_index("guest_id")
        await db_instance.password_reset_tokens.create_index("token", unique=True)
        await db_instance.password_reset_tokens.create_index("expires_at")
        await db_instance.bookings.create_index([("property_id", 1), ("check_in_date", 1), ("check_out_date", 1)])
        await db_instance.blocked_dates.create_index([("property_id", 1), ("start_date", 1), ("end_date", 1)])
        await db_instance.blocked_dates.create_index([("property_id", 1), ("source_id", 1), ("external_uid", 1)])
        await db_instance.calendar_sync_logs.create_index([("property_id", 1), ("synced_at", -1)])
        await db_instance.bookings.create_index([("booking_status", 1), ("soft_lock_expires_at", 1)])
        await db_instance.ai_agents.create_index("agent_id", unique=True)
        
        # 3. Ensure demo users exist
        await create_missing_users(db_instance)
        
        db_type_log = "PostgreSQL" if os.environ.get('DATABASE_TYPE') == 'postgres' else "MongoDB"
        logger.info(f"{db_type_log} indexes ensured and demo users seeded")
    except Exception as e:
        logger.error(f"Failed to create indexes or seed users: {e}")

    # 4. Start background jobs
    try:
        from services.soft_lock_reaper import (
            start_soft_lock_reaper,
            recover_pending_reminders,
        )
        await recover_pending_reminders(db_instance)
        reaper_interval = int(os.environ.get("SOFT_LOCK_REAPER_INTERVAL", "30"))
        start_soft_lock_reaper(db_instance, interval_seconds=reaper_interval)
    except Exception as e:
        logger.error(f"Failed to start soft-lock reaper: {e}")

    # 5. Start review reminders
    try:
        from services.review_reminder import start_review_reminder
        start_review_reminder(db_instance)
    except Exception as e:
        logger.error(f"Failed to start review reminder: {e}")

    # 6. Start iCal scheduler
    try:
        from services.calendar_scheduler import start_calendar_scheduler

        start_calendar_scheduler(db_instance)
    except Exception as e:
        logger.error(f"Failed to start calendar scheduler: {e}")

    # 7. Start payout sweeper
    try:
        from services.account_service import sweep_payout_eligibility
        payout_interval = int(os.environ.get("PAYOUT_SWEEP_INTERVAL", "3600"))
        async def _payout_loop():
            await asyncio.sleep(10)
            while True:
                try:
                    await sweep_payout_eligibility(db_instance)
                except Exception as e:
                    logger.warning(f"payout sweep failed: {e}")
                await asyncio.sleep(payout_interval)
        asyncio.create_task(_payout_loop())
        logger.info(f"Payout eligibility sweeper started (interval={payout_interval}s)")
    except Exception as e:
        logger.error(f"Failed to start payout sweeper: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    try:
        from services.calendar_scheduler import shutdown_calendar_scheduler

        shutdown_calendar_scheduler()
    except Exception as e:
        logger.warning(f"Failed to stop calendar scheduler: {e}")

    if client:
        client.close()
    if hasattr(db_instance, 'pool') and db_instance.pool:
        await db_instance.pool.close()

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "X-Space360 STR API",
        "version": "1.0.0"
    }

@app.get("/api/")
async def root():
    """Root API endpoint."""
    return {
        "message": "X-Space360 STR API",
        "version": "1.0.0",
        "docs": "/docs"
    }


# Serve the production React build from the same localhost as the API.
_frontend_build_dir = ROOT_DIR.parent / "frontend" / "build"
if _frontend_build_dir.exists():
    app.mount(
        "/static",
        DynamicCacheStaticFiles(directory=str(_frontend_build_dir / "static")),
        name="frontend-static",
    )

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        requested_file = _frontend_build_dir / full_path
        if requested_file.is_file():
            filename = full_path.lower()
            response = FileResponse(str(requested_file))
            if filename == "index.html" or filename == "service-worker.js":
                response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
                response.headers["Pragma"] = "no-cache"
                response.headers["Expires"] = "0"
            elif filename.endswith(('.webp', '.jpg', '.jpeg', '.png', '.svg', '.ico')):
                response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
            elif filename.endswith(('.js', '.css')):
                response.headers["Cache-Control"] = "public, max-age=2592000"
            return response
        
        index_response = FileResponse(str(_frontend_build_dir / "index.html"))
        index_response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        index_response.headers["Pragma"] = "no-cache"
        index_response.headers["Expires"] = "0"
        return index_response
