"""Phase 18 — Reviews & Ratings backend tests."""
from __future__ import annotations

import os
import time
from datetime import date, timedelta
from typing import Optional

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
API = f"{BASE_URL}/api"


def _login(email: str, password: str) -> str:
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password})
    r.raise_for_status()
    return r.json()["access_token"]


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def tokens():
    return {
        "guest": _login("guest@propnest.com", "guest123"),
        "host": _login("host@propnest.com", "host123"),
        "admin": _login("admin@propnest.com", "admin123"),
    }


@pytest.fixture(scope="module")
def completed_booking(tokens):
    """Build (or find) a confirmed paid booking whose check-out is yesterday."""
    # Pull guest's bookings — pick any confirmed/paid one whose check_out is in past.
    r = requests.get(f"{API}/bookings/guest/my-bookings", headers=_h(tokens["guest"]))
    r.raise_for_status()
    bookings = r.json().get("bookings", [])
    today = date.today()
    candidate = None
    for b in bookings:
        if (
            b.get("booking_status") == "confirmed"
            and b.get("payment_status") == "paid"
            and b.get("check_out_date")
            and date.fromisoformat(b["check_out_date"]) < today
        ):
            # Verify the property still exists
            p_res = requests.get(f"{API}/properties/{b['property_id']}")
            if p_res.status_code == 200:
                candidate = b
                break

    if candidate is None:
        # Synthesize one — create a new booking, mock-pay it, then back-date check_out.
        # 1. Pick a property
        s = requests.get(f"{API}/properties/search", params={"city": "Manali", "limit": 1})
        s.raise_for_status()
        prop_id = s.json()["properties"][0]["property_id"]
        # 2. Book a far-future window (won't conflict with anything)
        ci = (today + timedelta(days=200)).isoformat()
        co = (today + timedelta(days=202)).isoformat()
        c = requests.post(
            f"{API}/bookings/",
            headers=_h(tokens["guest"]),
            json={
                "property_id": prop_id,
                "check_in_date": ci,
                "check_out_date": co,
                "number_of_guests": 1,
            },
        )
        c.raise_for_status()
        bid = c.json()["booking_id"]
        # 3. Mock-pay
        requests.post(f"{API}/bookings/{bid}/mock-pay", headers=_h(tokens["guest"])).raise_for_status()
        # 4. Direct-DB back-date so it is review-eligible. We do this via a tiny
        #    admin-only-style direct request — there's no public endpoint, so
        #    we use motor through a sub-process import, which the test harness
        #    runs from /app/backend.
        import asyncio
        from motor.motor_asyncio import AsyncIOMotorClient
        from dotenv import load_dotenv
        load_dotenv("/app/backend/.env")

        async def backdate():
            client = AsyncIOMotorClient(os.environ["MONGO_URL"])
            db = client[os.environ["DB_NAME"]]
            await db.bookings.update_one(
                {"booking_id": bid},
                {"$set": {
                    "check_in_date": (today - timedelta(days=3)).isoformat(),
                    "check_out_date": (today - timedelta(days=1)).isoformat(),
                }},
            )
            client.close()

        asyncio.run(backdate())

        # Reload
        r = requests.get(f"{API}/bookings/{bid}", headers=_h(tokens["guest"]))
        r.raise_for_status()
        candidate = r.json()

    # Ensure no leftover review from a prior run blocks our test
    import asyncio
    from motor.motor_asyncio import AsyncIOMotorClient
    from dotenv import load_dotenv
    load_dotenv("/app/backend/.env")

    async def cleanup():
        client = AsyncIOMotorClient(os.environ["MONGO_URL"])
        db = client[os.environ["DB_NAME"]]
        await db.reviews.delete_many({"booking_id": candidate["booking_id"]})
        client.close()

    asyncio.run(cleanup())
    return candidate


# ----- eligibility -----

def test_eligibility_says_yes(tokens, completed_booking):
    bid = completed_booking["booking_id"]
    r = requests.get(f"{API}/bookings/{bid}/review-eligibility", headers=_h(tokens["guest"]))
    assert r.status_code == 200
    body = r.json()
    assert body["eligible"] is True
    assert body["days_remaining"] >= 0


def test_eligibility_blocks_other_user(tokens, completed_booking):
    bid = completed_booking["booking_id"]
    r = requests.get(f"{API}/bookings/{bid}/review-eligibility", headers=_h(tokens["host"]))
    assert r.status_code == 403


# ----- create review -----

def test_create_review_validation(tokens, completed_booking):
    bid = completed_booking["booking_id"]
    r = requests.post(
        f"{API}/bookings/{bid}/review",
        headers=_h(tokens["guest"]),
        json={"overall_rating": 7},  # invalid
    )
    assert r.status_code == 422


def test_create_review_success(tokens, completed_booking):
    bid = completed_booking["booking_id"]
    r = requests.post(
        f"{API}/bookings/{bid}/review",
        headers=_h(tokens["guest"]),
        json={
            "overall_rating": 5,
            "cleanliness": 5,
            "communication": 4,
            "check_in": 5,
            "accuracy": 4,
            "location": 5,
            "value": 5,
            "comment": "Phase18 test stay was lovely",
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["review"]["overall_rating"] == 5
    assert body["summary"]["rating_count"] >= 1
    assert body["summary"]["rating_avg"] >= 1


def test_duplicate_review_blocked(tokens, completed_booking):
    bid = completed_booking["booking_id"]
    r = requests.post(
        f"{API}/bookings/{bid}/review",
        headers=_h(tokens["guest"]),
        json={"overall_rating": 4, "comment": "again"},
    )
    assert r.status_code == 400


def test_property_aggregate_persisted(tokens, completed_booking):
    pid = completed_booking["property_id"]
    r = requests.get(f"{API}/properties/{pid}/reviews")
    assert r.status_code == 200
    body = r.json()
    assert body["summary"]["rating_count"] >= 1
    assert any(rev["booking_id"] == completed_booking["booking_id"] for rev in body["reviews"])
    # Display name was stripped to first + last initial
    for rev in body["reviews"]:
        assert "guest_display_name" in rev
        assert "@" not in (rev.get("guest_display_name") or "")


# ----- host response -----

def test_host_response_only_by_host(tokens, completed_booking):
    bid = completed_booking["booking_id"]
    listing = requests.get(f"{API}/host/reviews", headers=_h(tokens["host"])).json()
    review = next((r for r in listing["reviews"] if r["booking_id"] == bid), None)
    assert review is not None, "host should see their property's review"

    # Wrong-user (guest) cannot respond
    r = requests.post(
        f"{API}/reviews/{review['review_id']}/host-response",
        headers=_h(tokens["guest"]),
        json={"response": "thanks"},
    )
    assert r.status_code == 403

    # Host responds
    r = requests.post(
        f"{API}/reviews/{review['review_id']}/host-response",
        headers=_h(tokens["host"]),
        json={"response": "Thanks for staying with us!"},
    )
    assert r.status_code == 200, r.text

    # Cannot respond twice
    r = requests.post(
        f"{API}/reviews/{review['review_id']}/host-response",
        headers=_h(tokens["host"]),
        json={"response": "again"},
    )
    assert r.status_code == 400
