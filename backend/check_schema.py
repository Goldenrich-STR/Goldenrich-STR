"""Check users table columns in PostgreSQL"""
import asyncio, asyncpg, os
from dotenv import load_dotenv
load_dotenv('.env', override=True)

async def main():
    conn = await asyncpg.connect(os.environ['POSTGRES_URL'])
    rows = await conn.fetch(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position"
    )
    print("users table columns:")
    for r in rows:
        print(f"  {r['column_name']} ({r['data_type']})")
    await conn.close()

asyncio.run(main())
