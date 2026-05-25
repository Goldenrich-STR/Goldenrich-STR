import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def _env_bool(name: str, default: bool = False) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}

async def create_missing_users(db=None):
    db_was_none = (db is None)
    if db is None:
        db_type = os.environ.get('DATABASE_TYPE', 'mongo')
        if db_type == 'postgres':
            from utils.pg_adapter import PGAdapter
            db = PGAdapter(os.environ['POSTGRES_URL'])
            await db.connect()
            # Ensure tables exist for script usage
            await db.ensure_table("users")
            client = None
        else:
            mongo_url = os.environ['MONGO_URL']
            client = AsyncIOMotorClient(mongo_url)
            db = client[os.environ['DB_NAME']]
    else:
        client = None
    
    from datetime import timezone
    now = datetime.now(timezone.utc)
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@golden-x-host")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin@123")
    admin_name = os.environ.get("ADMIN_NAME", "Goldensky Admin")
    
    users = [
        {
            "user_id": "user_admin_priya",
            "email": admin_email,
            "phone": "+919845010234",
            "password_hash": pwd_context.hash(admin_password),
            "full_name": admin_name,
            "role": "admin",
            "city": "Mumbai",
            "kyc_status": "approved",
            "is_active": True,
            "is_email_verified": True,
            "is_phone_verified": True,
            "registration_fee_paid": True,
            "terms_accepted": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "user_id": "user_host_rajesh",
            "email": "rajesh.patel@golden-x-host.com",
            "phone": "+919820061122",
            "password_hash": pwd_context.hash("Host@2026!"),
            "full_name": "Rajesh Patel",
            "role": "host",
            "city": "Mumbai",
            "kyc_status": "approved",
            "is_active": True,
            "is_email_verified": True,
            "is_phone_verified": True,
            "registration_fee_paid": True,
            "terms_accepted": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "user_id": "user_guest_ananya",
            "email": "ananya.iyer@gmail.com",
            "phone": "+919008873445",
            "password_hash": pwd_context.hash("Guest@2026!"),
            "full_name": "Ananya Iyer",
            "role": "guest",
            "city": "Bangalore",
            "kyc_status": "approved",
            "is_active": True,
            "is_email_verified": True,
            "is_phone_verified": True,
            "registration_fee_paid": False,
            "terms_accepted": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "user_id": "user_broker_vikram",
            "email": "vikram.singh@goldenrich.in",
            "phone": "+919712334456",
            "password_hash": pwd_context.hash("Broker@2026!"),
            "full_name": "Vikram Singh",
            "role": "broker",
            "city": "Mumbai",
            "lg_code": "LG001",
            "kyc_status": "approved",
            "is_active": True,
            "is_email_verified": True,
            "is_phone_verified": True,
            "terms_accepted": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "user_id": "user_rm_neha",
            "email": "neha.kapoor@golden-x-host.com",
            "phone": "+919901223344",
            "password_hash": pwd_context.hash("Rm@2026!"),
            "full_name": "Neha Kapoor",
            "role": "employee",
            "city": "Mumbai",
            "kyc_status": "approved",
            "is_active": True,
            "is_email_verified": True,
            "is_phone_verified": True,
            "terms_accepted": True,
            "created_at": now,
            "updated_at": now
        }
    ]
    
    for user in users:
        existing = await db.users.find_one({"email": user["email"]})
        if not existing:
            await db.users.insert_one(user)
            # logger.info(f"Created demo user: {user['email']}")
        elif user["role"] == "admin" and _env_bool("ADMIN_RESET_PASSWORD"):
            await db.users.update_one(
                {"email": user["email"]},
                {
                    "$set": {
                        "password_hash": pwd_context.hash(admin_password),
                        "full_name": admin_name,
                        "is_active": True,
                        "updated_at": now,
                    }
                },
            )
            
    if client:
        client.close()
    # Only close the PG pool if WE created it locally in this function
    if db_was_none and hasattr(db, 'pool') and db.pool:
        await db.pool.close()

if __name__ == "__main__":
    asyncio.run(create_missing_users())
