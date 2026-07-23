"""Print recent bookings from the PostgreSQL JSONB bookings table."""
from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path

import asyncpg
from dotenv import load_dotenv


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")


async def main() -> None:
    dsn = os.environ.get("POSTGRES_URL")
    if not dsn:
        raise SystemExit("POSTGRES_URL is not configured in backend/.env")

    conn = await asyncpg.connect(dsn)
    try:
        rows = await conn.fetch(
            """
            SELECT id, data
            FROM bookings
            ORDER BY COALESCE(data->>'created_at', '') DESC, id DESC
            LIMIT 25
            """
        )
        if not rows:
            print("No bookings found in PostgreSQL.")
            return

        print("Recent bookings in PostgreSQL:")
        for row in rows:
            booking = json.loads(row["data"])
            print(
                " | ".join(
                    [
                        f"id={row['id']}",
                        f"booking_id={booking.get('booking_id')}",
                        f"host_id={booking.get('host_id')}",
                        f"property_id={booking.get('property_id')}",
                        f"payment_status={booking.get('payment_status')}",
                        f"booking_status={booking.get('booking_status')}",
                        f"check_out_date={booking.get('check_out_date')}",
                        f"total_amount={booking.get('total_amount')}",
                    ]
                )
            )
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
