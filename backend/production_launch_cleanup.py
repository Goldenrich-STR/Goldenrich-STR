"""Safely clear pre-launch booking and revenue data.

Dry run:
    python production_launch_cleanup.py --show-deleted

Apply:
    python production_launch_cleanup.py --apply \
        --confirm RESET-LAUNCH-DATA \
        --backup-file /backups/launch-cleanup.json \
        --include-notifications \
        --include-analytics
"""

import argparse
import asyncio
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

from utils.pg_adapter import PGAdapter


ROOT_DIR = Path(__file__).parent
CONFIRMATION = "RESET-LAUNCH-DATA"
TRANSACTION_TABLES = (
    "bookings",
    "transactions",
    "payouts",
    "refunds",
    "commissions",
    "reviews",
    "ai_calls",
)
PROTECTED_TABLES = (
    "users",
    "properties",
    "deleted_properties",
    "subscriptions",
    "subscription_plans",
    "coupons",
    "cms_content",
    "property_verifications",
    "external_calendars",
)
BOOKING_BLOCK_WHERE = (
    "WHERE data->>'source' = 'booking' "
    "OR data->>'blocked_date_id' LIKE 'booking_%'"
)


def cleanup_tables(include_notifications=False, include_analytics=False):
    tables = list(TRANSACTION_TABLES)
    if include_notifications:
        tables.append("notifications")
    if include_analytics:
        tables.extend(("search_logs", "calendar_sync_logs"))
    return tuple(tables)


async def _rows(conn, table, where=""):
    records = await conn.fetch(f"SELECT data FROM {table} {where}")
    return [json.loads(record["data"]) for record in records]


async def _count(conn, table, where="", *params):
    return await conn.fetchval(f"SELECT COUNT(*) FROM {table} {where}", *params)


def _write_backup(path, payload):
    backup_path = Path(path).expanduser().resolve()
    backup_path.parent.mkdir(parents=True, exist_ok=True)
    if backup_path.exists():
        raise RuntimeError(f"Backup file already exists: {backup_path}")
    backup_path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=True, default=str),
        encoding="utf-8",
    )
    try:
        backup_path.chmod(0o600)
    except OSError:
        pass
    return backup_path


async def run(args):
    load_dotenv(ROOT_DIR / ".env")
    if os.environ.get("DATABASE_TYPE", "postgres") != "postgres":
        raise RuntimeError("This cleanup supports DATABASE_TYPE=postgres only")

    postgres_url = os.environ.get("POSTGRES_URL")
    if not postgres_url:
        raise RuntimeError("POSTGRES_URL is missing")

    if args.apply:
        if args.confirm != CONFIRMATION:
            raise RuntimeError(f"Apply requires --confirm {CONFIRMATION}")
        if not args.backup_file:
            raise RuntimeError("Apply requires --backup-file")

    db = PGAdapter(postgres_url)
    await db.connect()
    selected_tables = cleanup_tables(
        include_notifications=args.include_notifications,
        include_analytics=args.include_analytics,
    )

    try:
        async with db.pool.acquire() as conn:
            selected_counts = {
                table: await _count(conn, table)
                for table in selected_tables
            }
            booking_blocks = await _count(conn, "blocked_dates", BOOKING_BLOCK_WHERE)
            protected_counts = {
                table: await _count(conn, table)
                for table in PROTECTED_TABLES
            }

            print("\nWill clear:")
            for table, count in selected_counts.items():
                print(f"  {table}: {count}")
            print(f"  booking-created blocked_dates: {booking_blocks}")

            print("\nWill preserve:")
            for table, count in protected_counts.items():
                print(f"  {table}: {count}")
            print("  manual/external blocked_dates")

            if args.property_id:
                live_count = await _count(
                    conn,
                    "properties",
                    "WHERE data->>'property_id' = $1",
                    args.property_id,
                )
                archived_count = await _count(
                    conn,
                    "deleted_properties",
                    "WHERE data->>'property_id' = $1",
                    args.property_id,
                )
                print(f"\nProperty check: {args.property_id}")
                print(f"  live properties record: {live_count}")
                print(f"  deleted archive record: {archived_count}")

            if args.show_deleted:
                deleted = await conn.fetch(
                    "SELECT data FROM deleted_properties "
                    "ORDER BY data->>'deleted_at' DESC LIMIT 20"
                )
                print("\nDeleted property archive:")
                if not deleted:
                    print("  (empty)")
                for record in deleted:
                    item = json.loads(record["data"])
                    print(
                        "  {property_id} | {title} | {deleted_at} | {reason}".format(
                            property_id=item.get("property_id", "N/A"),
                            title=item.get("title", "Untitled"),
                            deleted_at=item.get("deleted_at", "N/A"),
                            reason=item.get("reason", "No reason"),
                        )
                    )

            if not args.apply:
                print("\nDRY RUN ONLY. No database records were changed.")
                return

            backup_payload = {
                "created_at": datetime.now(timezone.utc).isoformat(),
                "scope": {
                    "include_notifications": args.include_notifications,
                    "include_analytics": args.include_analytics,
                },
                "tables": {
                    table: await _rows(conn, table)
                    for table in selected_tables
                },
                "booking_blocked_dates": await _rows(
                    conn,
                    "blocked_dates",
                    BOOKING_BLOCK_WHERE,
                ),
                "properties_before_rating_reset": await _rows(conn, "properties"),
            }
            backup_path = _write_backup(args.backup_file, backup_payload)
            print(f"\nBackup written: {backup_path}")

            async with conn.transaction():
                for table in selected_tables:
                    await conn.execute(f"DELETE FROM {table}")
                await conn.execute(f"DELETE FROM blocked_dates {BOOKING_BLOCK_WHERE}")
                await conn.execute(
                    "UPDATE properties SET data = "
                    "jsonb_set("
                    "jsonb_set(data, '{rating}', '0'::jsonb, true), "
                    "'{review_count}', '0'::jsonb, true"
                    ")"
                )

            remaining = {
                table: await _count(conn, table)
                for table in selected_tables
            }
            remaining_blocks = await _count(conn, "blocked_dates", BOOKING_BLOCK_WHERE)
            if any(remaining.values()) or remaining_blocks:
                raise RuntimeError(
                    f"Cleanup verification failed: {remaining}, "
                    f"booking_blocks={remaining_blocks}"
                )

            print("\nCleanup completed and verified.")
            print("Bookings and booking revenue are now zero.")
            print("Users, properties, configuration, subscriptions, and deleted archives were preserved.")
    finally:
        await db.close()


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--confirm")
    parser.add_argument("--backup-file")
    parser.add_argument("--include-notifications", action="store_true")
    parser.add_argument("--include-analytics", action="store_true")
    parser.add_argument("--show-deleted", action="store_true")
    parser.add_argument("--property-id")
    return parser.parse_args()


if __name__ == "__main__":
    asyncio.run(run(parse_args()))
