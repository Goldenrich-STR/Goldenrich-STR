import asyncio
import os
import re
from pathlib import Path
from urllib.parse import urlparse, urlunparse

import asyncpg
from dotenv import load_dotenv


_DATABASE_NAME_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


async def setup_db() -> bool:
    root_dir = Path(__file__).parent
    load_dotenv(root_dir / ".env")

    target_url = os.environ.get("POSTGRES_URL", "").strip()
    if not target_url:
        print("POSTGRES_URL is not configured.")
        return False

    parsed = urlparse(target_url)
    db_name = parsed.path.lstrip("/")
    if not _DATABASE_NAME_RE.fullmatch(db_name):
        print("POSTGRES_URL contains an invalid database name.")
        return False

    maintenance_url = urlunparse(parsed._replace(path="/postgres"))
    try:
        conn = await asyncpg.connect(maintenance_url)
        try:
            exists = await conn.fetchval(
                "SELECT 1 FROM pg_database WHERE datname = $1",
                db_name,
            )
            if not exists:
                # Database identifiers cannot be query parameters; db_name is regex-validated above.
                await conn.execute(f'CREATE DATABASE "{db_name}"')  # nosec B608
                print(f"Database '{db_name}' created successfully.")
            else:
                print(f"Database '{db_name}' already exists.")
        finally:
            await conn.close()
    except Exception as exc:
        print(f"Failed to set up database: {exc}")
        return False

    try:
        conn = await asyncpg.connect(target_url)
        await conn.close()
        print("Successfully connected to target database.")
        return True
    except Exception as exc:
        print(f"Failed to connect to target database: {exc}")
        return False


if __name__ == "__main__":
    asyncio.run(setup_db())
