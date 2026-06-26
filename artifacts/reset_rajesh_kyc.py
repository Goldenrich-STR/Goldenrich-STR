import asyncio
import os
import sys
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(r'd:\FinalSTR\Goldenrich-STR\backend')
load_dotenv(ROOT_DIR / '.env')

sys.path.append(str(ROOT_DIR))

async def main():
    from utils.pg_adapter import PGAdapter
    db = PGAdapter(os.environ['POSTGRES_URL'])
    await db.connect()
    
    email = "rajesh.patel@xspace360.com"
    res = await db.users.update_one(
        {"email": email},
        {"$set": {"kyc_status": "unverified", "kyc_documents": []}}
    )
    print(f"Successfully reset Rajesh Patel's KYC status to unverified")
    
    # Let's verify by printing the user record
    user = await db.users.find_one({"email": email})
    print(f"User: {user['full_name']}, KYC Status: {user['kyc_status']}, Documents: {user.get('kyc_documents', [])}")
    
    if hasattr(db, 'pool') and db.pool:
        await db.pool.close()

if __name__ == '__main__':
    asyncio.run(main())
