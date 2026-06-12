import asyncio
import os
from dotenv import load_dotenv
import asyncpg
from pathlib import Path

async def setup_db():
    ROOT_DIR = Path(__file__).parent
    load_dotenv(ROOT_DIR / '.env')
    
    # Try to connect to system 'postgres' db first to create our db
    sys_url = "postgresql://postgres:Pratik16@localhost:5432/postgres"
    db_name = "Goldenrich_STR"
    
    print(f"Connecting to system database to ensure '{db_name}' exists...")
    try:
        conn = await asyncpg.connect(sys_url)
        # Check if db exists
        exists = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", db_name)
        if not exists:
            print(f"Database '{db_name}' does not exist. Creating...")
            # create database cannot run inside a transaction block
            await conn.execute(f'CREATE DATABASE "{db_name}"')
            print(f"Database '{db_name}' created successfully.")
        else:
            print(f"Database '{db_name}' already exists.")
        await conn.close()
    except Exception as e:
        print(f"Failed to setup database: {e}")
        return False
    
    # Now test connection to our db
    target_url = os.environ.get('POSTGRES_URL')
    print(f"Testing connection to {target_url}...")
    try:
        conn = await asyncpg.connect(target_url)
        print("Successfully connected to target database!")
        await conn.close()
        return True
    except Exception as e:
        print(f"Failed to connect to target database: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(setup_db())
