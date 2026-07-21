"""Clear Goldenrich/X-Space360 PostgreSQL app data for a fresh test run.

Deletes all business/demo/test rows from app tables and keeps only admin users
so the admin panel remains accessible.

Run from backend:
    python clear_all_website_data.py
"""
from __future__ import annotations

import asyncio
import os
import sys

import asyncpg
from dotenv import load_dotenv


load_dotenv(".env", override=True)

POSTGRES_URL = os.environ.get("POSTGRES_URL")

TABLES_TO_CLEAR = [
    "properties",
    "bookings",
    "blocked_dates",
    "external_calendars",
    "property_verifications",
    "transactions",
    "payouts",
    "refunds",
    "reviews",
    "notifications",
    "subscriptions",
    "cms_content",
    "leads",
    "coupons",
    "deleted_properties",
    "search_logs",
    "ai_calls",
    "ai_agents",
    "calendar_sync_logs",
    "contact_messages",
    "support_tickets",
    "commissions",
    "password_reset_tokens",
    "platform_settings",
    "payout_job_runs",
]


async def table_exists(conn: asyncpg.Connection, table: str) -> bool:
    return bool(
        await conn.fetchval(
            """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = $1
            )
            """,
            table,
        )
    )


async def main() -> None:
    if not POSTGRES_URL:
        raise SystemExit("POSTGRES_URL is missing in backend/.env")

    conn = await asyncpg.connect(POSTGRES_URL)
    try:
        print("")
        print("=" * 64)
        print("  X-SPACE360 DATABASE CLEANUP")
        print("=" * 64)
        print("Target:", POSTGRES_URL.rsplit("@", 1)[-1])
        print("")
        print("This will DELETE website/app data and KEEP only admin users.")
        print("")

        print("Current counts:")
        total_before = 0
        for table in TABLES_TO_CLEAR:
            if await table_exists(conn, table):
                count = await conn.fetchval(f'SELECT COUNT(*) FROM "{table}"')
                total_before += int(count or 0)
                print(f"  {table:32s} {count} rows")

        if await table_exists(conn, "users"):
            admins = await conn.fetchval("SELECT COUNT(*) FROM users WHERE data->>'role' = 'admin'")
            non_admins = await conn.fetchval("SELECT COUNT(*) FROM users WHERE COALESCE(data->>'role', '') <> 'admin'")
            print(f"  {'users admin kept':32s} {admins} rows")
            print(f"  {'users non-admin delete':32s} {non_admins} rows")

        print("")
        if "--yes" not in sys.argv:
            confirm = input("Type CLEAR to permanently delete this data: ").strip()
            if confirm != "CLEAR":
                print("Aborted. No changes made.")
                return

        print("")
        print("Deleting...")
        total_deleted = 0

        for table in TABLES_TO_CLEAR:
            if not await table_exists(conn, table):
                continue
            result = await conn.execute(f'DELETE FROM "{table}"')
            deleted = int(result.split()[-1])
            total_deleted += deleted
            print(f"  deleted {deleted:5d} from {table}")

        if await table_exists(conn, "users"):
            result = await conn.execute("DELETE FROM users WHERE COALESCE(data->>'role', '') <> 'admin'")
            deleted = int(result.split()[-1])
            total_deleted += deleted
            print(f"  deleted {deleted:5d} from users non-admin")

        print("")
        print("=" * 64)
        print(f"Total deleted: {total_deleted}")
        print("=" * 64)

        if await table_exists(conn, "users"):
            admins = await conn.fetch(
                """
                SELECT data->>'email' AS email,
                       data->>'full_name' AS full_name,
                       data->>'role' AS role
                FROM users
                WHERE data->>'role' = 'admin'
                ORDER BY id
                """
            )
            print("")
            print("Remaining admin users:")
            for admin in admins:
                print(f"  - {admin['full_name']} <{admin['email']}> role={admin['role']}")
        print("")
        print("Database is clean for fresh website testing.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
