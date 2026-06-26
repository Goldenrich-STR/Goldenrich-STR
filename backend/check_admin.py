import asyncio
import os
from dotenv import load_dotenv
load_dotenv('.env', override=True)

async def check():
    db_type = os.environ.get('DATABASE_TYPE', 'mongo')
    print(f'Database type: {db_type}')
    if db_type == 'postgres':
        from utils.pg_adapter import PGAdapter
        db = PGAdapter(os.environ['POSTGRES_URL'])
        await db.connect()
    else:
        from motor.motor_asyncio import AsyncIOMotorClient
        client = AsyncIOMotorClient(os.environ['MONGO_URL'])
        db = client[os.environ['DB_NAME']]

    email = 'admin@goldenrichstay.com'
    user = await db.users.find_one({'email': email})
    if user:
        print(f'User found! Role: {user.get("role")}, Active: {user.get("is_active")}')
        from utils.auth import verify_password
        pwd_ok = verify_password('admin@123', user['password_hash'])
        print(f'Password verified: {pwd_ok}')
    else:
        print('User not found!')

asyncio.run(check())
