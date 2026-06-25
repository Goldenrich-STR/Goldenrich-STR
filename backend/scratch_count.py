import asyncio
import os
from dotenv import load_dotenv
from utils.pg_adapter import PGAdapter

load_dotenv()

async def main():
    db = PGAdapter(os.environ['POSTGRES_URL'])
    await db.connect()
    
    users_count = await db.users.count_documents({})
    properties_count = await db.properties.count_documents({})
    cms_count = await db.cms_content.count_documents({})
    
    print(f"Users Count: {users_count}")
    print(f"Properties Count: {properties_count}")
    print(f"CMS Content Count: {cms_count}")
    
    pages = await db.cms_content.distinct("page")
    sections = await db.cms_content.distinct("section")
    print(f"Distinct Pages: {pages}")
    print(f"Distinct Sections: {sections}")
    
    await db.close()

if __name__ == "__main__":
    asyncio.run(main())
