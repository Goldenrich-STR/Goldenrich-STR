import argparse
import asyncio
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

from create_missing_users import create_missing_users
from server import db_instance
from utils.auth import hash_password, verify_password

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env", override=True)


async def reset_admin_password(email: str, password: str):
    if hasattr(db_instance, "connect") and db_instance.pool is None:
        await db_instance.connect()
        await db_instance.ensure_table("users")

    await create_missing_users(db_instance)

    user = await db_instance.users.find_one({"email": email})
    if not user:
        raise SystemExit(f"Admin not found: {email}")
    if user.get("role") != "admin":
        raise SystemExit(f"User exists but is not admin: {email}")

    await db_instance.users.update_one(
        {"email": email},
        {
            "$set": {
                "password_hash": hash_password(password),
                "is_active": True,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    updated = await db_instance.users.find_one({"email": email})
    if not verify_password(password, updated["password_hash"]):
        raise SystemExit("Password reset verification failed")

    print(f"Admin password reset successfully for {email}")

    if hasattr(db_instance, "pool") and db_instance.pool:
        await db_instance.pool.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Reset an admin user's password.")
    parser.add_argument("--email", default=os.getenv("ADMIN_EMAIL", "admin@golden-x-host"))
    parser.add_argument("--password", default=os.getenv("ADMIN_PASSWORD"))
    args = parser.parse_args()
    if not args.password:
        raise SystemExit("Password is required. Pass --password or set ADMIN_PASSWORD in .env.")

    asyncio.run(reset_admin_password(args.email, args.password))
