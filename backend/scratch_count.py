import asyncio
import os
from dotenv import load_dotenv
from utils.pg_adapter import PGAdapter

load_dotenv()

async def main():
    db = PGAdapter(os.environ['POSTGRES_URL'])
    await db.connect()
    
    # Check users count
    users_count = await db.users.count_documents({})
    # Check properties count
    properties_count = await db.properties.count_documents({})
    # Check landing-page cms count
    cms_count = await db.cms.count_documents({})
    
    print(f"Users Count: {users_count}")
    print(f"Properties Count: {properties_count}")
    print(f"CMS Count: {cms_count}")
    
    # Get a list of properties to verify status
    props = await db.properties.find({}, limit=3).to_list(3)
    for p in props:
        print(f"Prop ID: {p.get('property_id')}, Title: {p.get('title')}, Status: {p.get('status')}")
        
    await db.close()

if __name__ == "__main__":
    asyncio.run(main())
