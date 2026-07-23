"""Make a booking payout-eligible for local PostgreSQL testing.

This script is for development only. By default it updates the latest booking.
Pass a booking id to update a specific booking:

    python make_latest_booking_payout_eligible.py BK8570A00B83A748

It updates the selected booking to:
- payment_status = paid
- booking_status = confirmed
- check_out_date = yesterday
- host payout preference = UPI host@upi, daily cycle

Then the automatic payout engine can pick it up within PAYOUT_SWEEP_INTERVAL.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
from datetime import date, timedelta
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
        target_booking_id = sys.argv[1].strip() if len(sys.argv) > 1 else ""
        if target_booking_id:
            booking_row = await conn.fetchrow(
                """
                SELECT id, data
                FROM bookings
                WHERE data->>'booking_id' = $1
                LIMIT 1
                """,
                target_booking_id,
            )
        else:
            booking_row = await conn.fetchrow(
                """
                SELECT id, data
                FROM bookings
                ORDER BY COALESCE(data->>'created_at', '') DESC, id DESC
                LIMIT 1
                """
            )
        if not booking_row:
            if target_booking_id:
                raise SystemExit(f"No booking found for booking_id={target_booking_id}")
            raise SystemExit("No booking found. Create one guest booking first.")

        booking = json.loads(booking_row["data"])
        booking_id = booking.get("booking_id")
        host_id = booking.get("host_id")
        if not booking_id or not host_id:
            raise SystemExit("Selected booking is missing booking_id or host_id.")

        yesterday = (date.today() - timedelta(days=1)).isoformat()
        booking.update(
            {
                "payment_status": "paid",
                "booking_status": "confirmed",
                "check_out_date": yesterday,
                "payout_status": None,
                "payout_id": None,
            }
        )
        await conn.execute(
            "UPDATE bookings SET data = $1::jsonb WHERE id = $2",
            json.dumps(booking),
            booking_row["id"],
        )

        host_row = await conn.fetchrow(
            "SELECT id, data FROM users WHERE data->>'user_id' = $1 LIMIT 1",
            host_id,
        )
        if not host_row:
            raise SystemExit(f"Host not found for host_id={host_id}")

        host = json.loads(host_row["data"])
        host["payout_preference"] = {
            "preferred": "upi",
            "upi_vpa": "host@upi",
            "bank_account_holder": "",
            "bank_account_number": "",
            "bank_ifsc": "",
            "payout_cycle": "daily",
        }
        await conn.execute(
            "UPDATE users SET data = $1::jsonb WHERE id = $2",
            json.dumps(host),
            host_row["id"],
        )

        await conn.execute(
            "DELETE FROM payouts WHERE data->>'booking_id' = $1",
            booking_id,
        )

        print("Ready for auto payout test:")
        print(f"booking_id={booking_id}")
        print(f"host_id={host_id}")
        print(f"check_out_date={yesterday}")
        print("host payout preference=UPI host@upi, daily")
        print("Existing payout rows for this booking were removed.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
