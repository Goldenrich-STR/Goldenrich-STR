import asyncio
import os
import uuid
from datetime import datetime, timezone
from dotenv import load_dotenv
from passlib.context import CryptContext

load_dotenv('.env', override=True)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create():
    db_type = os.environ.get('DATABASE_TYPE', 'mongo')
    print(f'Database type: {db_type}')
    if db_type == 'postgres':
        from utils.pg_adapter import PGAdapter
        db = PGAdapter(os.environ['POSTGRES_URL'])
        await db.connect()
        await db.ensure_table("users")
    else:
        from motor.motor_asyncio import AsyncIOMotorClient
        client = AsyncIOMotorClient(os.environ['MONGO_URL'])
        db = client[os.environ['DB_NAME']]

    email = 'admin2@goldenrichstay.com'
    password = 'admin@123'
    
    # Check if exists
    existing = await db.users.find_one({'email': email})
    if existing:
        print(f"User {email} already exists. Updating password...")
        await db.users.update_one(
            {"email": email},
            {"$set": {
                "password_hash": pwd_context.hash(password),
                "is_active": True,
                "role": "admin"
            }}
        )
        print("Updated!")
    else:
        now = datetime.now(timezone.utc)
        user = {
            "user_id": f"user_admin_{uuid.uuid4().hex[:8]}",
            "email": email,
            "phone": "+919845010299",
            "password_hash": pwd_context.hash(password),
            "full_name": "Second Admin",
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
        }
        await db.users.insert_one(user)
        print(f"Created new admin user: {email} / {password}")

    if db_type == 'postgres' and hasattr(db, 'pool') and db.pool:
        await db.pool.close()

asyncio.run(create())
