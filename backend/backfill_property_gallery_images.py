"""Give every local property a three-photo gallery from bundled Maharashtra stay imagery.

The image paths are frontend public assets, so they work without external image hosts
or a separate upload server.  Run with --apply to write the local database.
"""

import argparse
import asyncio
import os

from dotenv import load_dotenv


RESIDENTIAL_GALLERY = [
    "/assets/hero/poolside-villa.webp",
    "/assets/hero/vineyard-retreat.webp",
    "/assets/hero/heritage-homestay.webp",
]
EVENT_GALLERY = [
    "/assets/hero/wedding-celebration.webp",
    "/assets/hero/group-stay.webp",
    "/assets/hero/lakeside-retreat.webp",
]
COMMERCIAL_GALLERY = [
    "/assets/hero/workamp-stay.avif",
    "/assets/hero/heritage-homestay.webp",
    "/assets/hero/vineyard-retreat.webp",
]


def gallery_for(property_doc: dict) -> list[str]:
    category = str(property_doc.get("category") or "").lower()
    property_type = str(property_doc.get("property_type") or property_doc.get("type") or "").lower()
    if category == "event_venue" or any(word in property_type for word in ("banquet", "lawn", "rooftop", "event", "party")):
        return EVENT_GALLERY
    if category == "commercial" or any(word in property_type for word in ("office", "workspace", "meeting", "cowork")):
        return COMMERCIAL_GALLERY
    return RESIDENTIAL_GALLERY


async def main(apply: bool) -> None:
    load_dotenv()
    if os.environ.get("DATABASE_TYPE", "mongo") != "postgres":
        raise RuntimeError("This local gallery backfill currently supports the configured PostgreSQL database only.")

    from utils.pg_adapter import PGAdapter

    db = PGAdapter(os.environ["POSTGRES_URL"])
    await db.connect()
    try:
        await db.ensure_table("properties")
        properties = await db.properties.find({}, {"property_id": 1, "title": 1, "category": 1, "property_type": 1, "type": 1}).to_list(length=2000)
        for property_doc in properties:
            images = gallery_for(property_doc)
            print(f"{property_doc.get('property_id')}: {property_doc.get('title')} -> {len(images)} images")
            if apply:
                await db.properties.update_one(
                    {"property_id": property_doc["property_id"]},
                    {"$set": {"images": images}},
                )
        print(f"{'Updated' if apply else 'Would update'} {len(properties)} properties.")
    finally:
        await db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Write image galleries to the local database")
    args = parser.parse_args()
    asyncio.run(main(args.apply))
