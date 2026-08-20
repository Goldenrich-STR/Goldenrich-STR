"""Backfill live properties with existing uploaded images.

This script does not add sample/stock URLs. It only uses files already present
in backend/uploads and assigns them to live property records that currently have
no valid production image.
"""

import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
UPLOADS_DIR = ROOT / "uploads"
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}
BLOCKED_MEDIA_MARKERS = (
    "example.com",
    "images.unsplash.com",
    "source.unsplash.com",
    "unsplash.com",
    "images.pexels.com",
    "pexels.com",
    "picsum.photos",
    "placeholder.com",
    "placehold.co",
    "dummyimage",
    "localhost",
    "127.0.0.1",
    "10.0.2.2",
    "0.0.0.0",
)


def is_valid_property_image(value: object) -> bool:
    raw = str(value or "").strip()
    if not raw:
        return False
    lower = raw.lower()
    return not any(marker in lower for marker in BLOCKED_MEDIA_MARKERS)


def uploaded_image_paths() -> list[str]:
    if not UPLOADS_DIR.exists():
        return []
    files = [
        item
        for item in UPLOADS_DIR.iterdir()
        if item.is_file() and item.suffix.lower() in IMAGE_SUFFIXES
    ]
    files.sort(key=lambda item: item.stat().st_mtime, reverse=True)
    return [f"/uploads/{item.name}" for item in files]


async def get_database():
    load_dotenv(ROOT / ".env")
    db_type = os.environ.get("DATABASE_TYPE", "mongo")
    if db_type == "postgres":
        from utils.pg_adapter import PGAdapter

        db = PGAdapter(os.environ["POSTGRES_URL"])
        await db.connect()
        await db.ensure_table("properties")
        return db, db.close

    from motor.motor_asyncio import AsyncIOMotorClient

    client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
    return client[os.environ["DB_NAME"]], client.close


async def main() -> None:
    images = uploaded_image_paths()
    if not images:
        raise RuntimeError("No uploaded images found in backend/uploads.")

    db, close = await get_database()
    updated = 0
    inspected = 0
    try:
        properties = await db.properties.find(
            {"status": "live"},
            {"property_id": 1, "title": 1, "images": 1},
        ).to_list(length=2000)

        for prop in properties:
            inspected += 1
            current_images = prop.get("images") or []
            valid_images = [img for img in current_images if is_valid_property_image(img)]
            if valid_images:
                continue

            assigned = images[updated % len(images)]
            await db.properties.update_one(
                {"property_id": prop.get("property_id")},
                {"$set": {"images": [assigned]}},
            )
            updated += 1

        print(
            f"Backfill complete. Inspected {inspected} live properties, "
            f"updated {updated}, uploads available {len(images)}."
        )
    finally:
        result = close()
        if asyncio.iscoroutine(result):
            await result


if __name__ == "__main__":
    asyncio.run(main())
