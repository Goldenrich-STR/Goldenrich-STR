# -*- coding: utf-8 -*-
"""
clear_test_data.py
------------------
Clears ALL test/fake data from Goldenrich-STR PostgreSQL database.
KEEPS : users where data->>'role' = 'admin'
DELETES: everything else - properties, bookings, non-admin users, etc.

Run from backend directory:
    .\\venv\\Scripts\\python.exe clear_test_data.py
"""

import asyncio
import asyncpg
import os
import sys
from dotenv import load_dotenv

load_dotenv('.env', override=True)

POSTGRES_URL = os.environ['POSTGRES_URL']

# Tables to fully truncate (no rows kept)
TABLES_FULL_CLEAR = [
    "bookings",
    "blocked_dates",
    "external_calendars",
    "property_verifications",
    "properties",
    "contact_messages",
    "search_logs",
    "ai_calls",
    "subscriptions",
]

# Optional tables - clear if they exist
TABLES_OPTIONAL = [
    "payout_ledger",
    "review_reminders",
    "soft_locks",
    "otp_sessions",
    "push_tokens",
]

async def main():
    conn = await asyncpg.connect(POSTGRES_URL)
    print("")
    print("=" * 55)
    print("  GOLDENRICH-STR  DATABASE CLEANUP")
    print("=" * 55)
    print("")

    # --- 1. Preview counts ---
    print("Current row counts:\n")

    for table in TABLES_FULL_CLEAR:
        try:
            n = await conn.fetchval(f'SELECT COUNT(*) FROM "{table}"')
            print(f"  {table:35s} {n} rows")
        except Exception:
            print(f"  {table:35s} (not found, will skip)")

    for table in TABLES_OPTIONAL:
        try:
            n = await conn.fetchval(f'SELECT COUNT(*) FROM "{table}"')
            print(f"  {table:35s} {n} rows  [optional]")
        except Exception:
            pass  # silently skip missing optional tables

    # Non-admin users
    try:
        non_admin = await conn.fetchval(
            "SELECT COUNT(*) FROM users WHERE data->>'role' != 'admin'"
        )
        admins = await conn.fetchval(
            "SELECT COUNT(*) FROM users WHERE data->>'role' = 'admin'"
        )
        print(f"\n  {'users (non-admin - will DELETE)':35s} {non_admin} rows")
        print(f"  {'users (admin    - will KEEP)':35s} {admins} rows")
    except Exception as e:
        print(f"  users: could not read - {e}")

    # --- 2. Confirm ---
    print("")
    print("WARNING: This will permanently delete all test data!")
    print("         Only admin account(s) will remain.")
    print("")
    confirm = input("Type YES to proceed: ").strip()
    if confirm != "YES":
        print("\nAborted. No changes made.")
        await conn.close()
        return

    print("\nClearing...\n")
    total_deleted = 0

    # --- 3. Clear main tables ---
    for table in TABLES_FULL_CLEAR:
        try:
            result = await conn.execute(f'DELETE FROM "{table}"')
            n = int(result.split()[-1])
            total_deleted += n
            print(f"  DELETED {n:5d} rows  from  {table}")
        except Exception as e:
            print(f"  SKIPPED {table}: {e}")

    # --- 4. Clear optional tables ---
    for table in TABLES_OPTIONAL:
        try:
            result = await conn.execute(f'DELETE FROM "{table}"')
            n = int(result.split()[-1])
            total_deleted += n
            print(f"  DELETED {n:5d} rows  from  {table}  [optional]")
        except Exception:
            pass  # table does not exist - fine

    # --- 5. Delete non-admin users ---
    try:
        result = await conn.execute(
            "DELETE FROM users WHERE data->>'role' != 'admin'"
        )
        n = int(result.split()[-1])
        total_deleted += n
        print(f"  DELETED {n:5d} rows  from  users (non-admin)")
    except Exception as e:
        print(f"  ERROR deleting non-admin users: {e}")

    # --- 6. Summary ---
    print("")
    print("=" * 55)
    print(f"  Total rows deleted: {total_deleted}")
    print("=" * 55)
    print("")

    try:
        admin_rows = await conn.fetch(
            "SELECT data->>'email' AS email, data->>'full_name' AS name, data->>'role' AS role "
            "FROM users WHERE data->>'role' = 'admin'"
        )
        print(f"Remaining admin users ({len(admin_rows)}):\n")
        for a in admin_rows:
            print(f"  - {a['name']}  ({a['email']})  role={a['role']}")
    except Exception as e:
        print(f"Could not list admins: {e}")

    print("")
    print("Done! Database is clean. Only admin account(s) remain.")
    print("")
    await conn.close()


asyncio.run(main())
