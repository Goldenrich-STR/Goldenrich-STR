"""Restore properties archived in deleted_properties.

Usage:
  python restore_deleted_properties.py          # dry-run
  python restore_deleted_properties.py --apply  # restore snapshots
"""

import argparse
import asyncio
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from server import db_instance  # noqa: E402


async def restore_deleted_properties(apply: bool = False):
    if hasattr(db_instance, "connect") and db_instance.pool is None:
        await db_instance.connect()
        await db_instance.ensure_table("properties")
        await db_instance.ensure_table("deleted_properties")

    deleted = await db_instance.deleted_properties.find({}, {"_id": 0}).to_list(length=500)
    if not deleted:
        print("No deleted property snapshots found in deleted_properties.")
        return

    restored = 0
    skipped = 0

    print(f"Found {len(deleted)} deleted property snapshot(s).")
    for item in deleted:
        snapshot = item.get("property_snapshot") or {}
        property_id = snapshot.get("property_id") or item.get("property_id")
        title = snapshot.get("title") or item.get("title") or "(untitled)"
        status = snapshot.get("status") or item.get("status") or "draft"

        if not property_id or not snapshot:
            skipped += 1
            print(f"SKIP missing snapshot/property_id: {title}")
            continue

        existing = await db_instance.properties.find_one({"property_id": property_id}, {"_id": 0})
        if existing:
            skipped += 1
            print(f"SKIP already exists: {property_id} | {title} | status={existing.get('status')}")
            continue

        snapshot.pop("_id", None)
        if apply:
            await db_instance.properties.insert_one(snapshot)
            restored += 1
            print(f"RESTORED {property_id} | {title} | status={status}")
        else:
            print(f"DRY-RUN would restore {property_id} | {title} | status={status}")

    if not apply:
        print("\nDry-run only. Run with --apply to restore these properties.")
    print(f"Done. restored={restored} skipped={skipped}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Actually restore snapshots")
    args = parser.parse_args()
    asyncio.run(restore_deleted_properties(apply=args.apply))
