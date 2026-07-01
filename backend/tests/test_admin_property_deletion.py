from datetime import datetime, timezone
from decimal import Decimal

import pytest
from fastapi import HTTPException

from models.property import PropertyStatus
from routes.admin_routes import (
    AdminPermanentDeleteRequest,
    get_deleted_properties,
    permanently_delete_property,
)
from routes.property_routes import DeletePropertyRequest, _delete_property_with_reason
from utils.pg_adapter import PGCollection


class FakeCursor:
    def __init__(self, documents):
        self.documents = list(documents)
        self.offset = 0
        self.maximum = None

    def sort(self, field, direction):
        self.documents.sort(
            key=lambda item: item.get(field) or datetime.min.replace(tzinfo=timezone.utc),
            reverse=direction < 0,
        )
        return self

    def skip(self, value):
        self.offset = value
        return self

    def limit(self, value):
        self.maximum = value
        return self

    async def to_list(self, length):
        end = self.offset + min(length, self.maximum or length)
        return self.documents[self.offset:end]


class FakeCollection:
    def __init__(self, documents):
        self.documents = list(documents)

    def find(self, query, projection=None):
        return FakeCursor(self.documents)

    async def find_one(self, query, projection=None):
        return next(
            (
                document
                for document in self.documents
                if all(document.get(key) == value for key, value in query.items())
            ),
            None,
        )

    async def count_documents(self, query):
        return len([document for document in self.documents if self._matches(document, query)])

    async def update_one(self, query, update, upsert=False):
        document = await self.find_one(query)
        if document:
            document.update(update.get("$set", {}))
            return True
        if upsert:
            new_document = dict(query)
            new_document.update(update.get("$set", {}))
            self.documents.append(new_document)
            return True
        return False

    async def delete_one(self, query):
        for index, document in enumerate(self.documents):
            if self._matches(document, query):
                self.documents.pop(index)
                return True
        return False

    async def delete_many(self, query):
        self.documents = [
            document
            for document in self.documents
            if not self._matches(document, query)
        ]

    @staticmethod
    def _matches(document, query):
        for key, value in query.items():
            actual = document.get(key)
            if isinstance(value, dict) and "$in" in value:
                if actual not in value["$in"]:
                    return False
            elif actual != value:
                return False
        return True


class FakeDB:
    def __init__(self, deleted_properties, properties=None):
        self.deleted_properties = FakeCollection(deleted_properties)
        self.properties = FakeCollection(properties or [])
        self.bookings = FakeCollection([])
        self.blocked_dates = FakeCollection([])
        self.external_calendars = FakeCollection([])
        self.calendar_sync_logs = FakeCollection([])
        self.property_verifications = FakeCollection([])
        self.reviews = FakeCollection([])
        self.coupons = FakeCollection([])


def archived_property():
    return {
        "property_id": "prop_delete_123",
        "owner_id": "host_1",
        "title": "Archived Villa",
        "status": "live",
        "reason": "Listing is no longer available",
        "deleted_by": "admin_1",
        "deleted_by_role": "admin",
        "deleted_at": datetime.now(timezone.utc),
        "property_snapshot": {
            "property_id": "prop_delete_123",
            "title": "Archived Villa",
            "city": "Nashik",
            "images": ["/api/uploads/villa.jpg"],
        },
    }


def test_pg_adapter_serializes_nested_database_values():
    collection = PGCollection("properties", pool=None)
    now = datetime.now(timezone.utc)

    prepared = collection._prepare_doc({
        "packages": [{"dates": [now]}],
        "status": PropertyStatus.LIVE,
        "price": Decimal("1250.50"),
    })

    assert prepared["packages"][0]["dates"] == [now.isoformat()]
    assert prepared["status"] == "live"
    assert prepared["price"] == 1250.5


@pytest.mark.asyncio
async def test_deleted_property_list_flattens_snapshot_and_metadata():
    db = FakeDB([archived_property()])

    response = await get_deleted_properties(
        current_user={"user_id": "admin_1", "role": "admin"},
        db=db,
    )

    assert response["total"] == 1
    assert response["properties"][0]["status"] == "deleted"
    assert response["properties"][0]["previous_status"] == "live"
    assert response["properties"][0]["deletion_reason"] == "Listing is no longer available"
    assert response["properties"][0]["city"] == "Nashik"


@pytest.mark.asyncio
async def test_permanent_delete_requires_exact_property_id():
    db = FakeDB([archived_property()])

    with pytest.raises(HTTPException) as exc:
        await permanently_delete_property(
            property_id="prop_delete_123",
            payload=AdminPermanentDeleteRequest(confirmation="DELETE"),
            current_user={"user_id": "admin_1", "role": "admin"},
            db=db,
        )

    assert exc.value.status_code == 400
    assert len(db.deleted_properties.documents) == 1


@pytest.mark.asyncio
async def test_permanent_delete_removes_archived_snapshot():
    db = FakeDB([archived_property()])

    response = await permanently_delete_property(
        property_id="prop_delete_123",
        payload=AdminPermanentDeleteRequest(confirmation="prop_delete_123"),
        current_user={"user_id": "admin_1", "role": "admin"},
        db=db,
    )

    assert response["property_id"] == "prop_delete_123"
    assert db.deleted_properties.documents == []


@pytest.mark.asyncio
async def test_restored_property_is_hidden_and_cannot_be_permanently_deleted():
    restored = {"property_id": "prop_delete_123", "title": "Restored Villa"}
    db = FakeDB([archived_property()], properties=[restored])

    response = await get_deleted_properties(
        current_user={"user_id": "admin_1", "role": "admin"},
        db=db,
    )
    assert response["properties"] == []

    with pytest.raises(HTTPException) as exc:
        await permanently_delete_property(
            property_id="prop_delete_123",
            payload=AdminPermanentDeleteRequest(confirmation="prop_delete_123"),
            current_user={"user_id": "admin_1", "role": "admin"},
            db=db,
        )

    assert exc.value.status_code == 409
    assert len(db.deleted_properties.documents) == 1


@pytest.mark.asyncio
async def test_admin_can_soft_delete_legacy_property_without_owner_id():
    legacy_property = {
        "property_id": "prop_legacy_123",
        "title": "Legacy Villa",
        "city": "Nashik",
        "status": "live",
    }
    db = FakeDB([], properties=[legacy_property])

    response = await _delete_property_with_reason(
        property_id="prop_legacy_123",
        payload=DeletePropertyRequest(reason="Duplicate legacy property listing"),
        current_user={"user_id": "admin_1", "role": "admin"},
        db=db,
    )

    assert response["property_id"] == "prop_legacy_123"
    assert db.properties.documents == []
    assert db.deleted_properties.documents[0]["property_snapshot"] == legacy_property
