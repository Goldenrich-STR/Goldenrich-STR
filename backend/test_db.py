import asyncio
import os
from dotenv import load_dotenv
from utils.pg_adapter import PGAdapter

async def main():
    load_dotenv()
    pg = PGAdapter(os.environ['POSTGRES_URL'])
    await pg.connect()
    
    cursor = pg.properties.find({})
    res = await cursor.to_list(100)
    print(f"Total properties in DB: {len(res)}")
    stats = {}
    cats = {}
    for r in res:
        status = r.get('status')
        category = r.get('category')
        stats[status] = stats.get(status, 0) + 1
        cats[category] = cats.get(category, 0) + 1
        
    print("Status counts:", stats)
    print("Category counts:", cats)
    
    await pg.close()

if __name__ == '__main__':
    asyncio.run(main())
