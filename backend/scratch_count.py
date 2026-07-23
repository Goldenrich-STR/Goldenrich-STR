import asyncio
import os
from dotenv import load_dotenv
from utils.pg_adapter import PGAdapter

load_dotenv()

async def main():
    db = PGAdapter(os.environ['POSTGRES_URL'])
    await db.connect()
    
    properties = await db.properties.find({}).to_list(length=100)
    for p in properties:
        print(f"ID: {p.get('property_id')} | Status: {p.get('status')} | Title: {p.get('title')}")
        
    await db.close()

if __name__ == "__main__":
    asyncio.run(main())
