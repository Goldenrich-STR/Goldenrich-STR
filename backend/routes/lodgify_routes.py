import asyncio
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from middleware.auth_middleware import get_current_user
from services.lodgify_client import (
    LodgifyAPIError,
    LodgifyClient,
    LodgifyConfigurationError,
)
from services.lodgify_sync_preview import build_manual_mapping_plan, build_preview
from services.lodgify_calendar_preview import build_calendar_preview

router = APIRouter(prefix="/admin/integrations/lodgify", tags=["Admin - Lodgify"])
_mapping_write_lock = asyncio.Lock()


class ManualPropertyMappingRequest(BaseModel):
    xspace_property_id: str = Field(min_length=1, max_length=120)


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    role = getattr(current_user.get("role"), "value", current_user.get("role"))
    if str(role or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def client() -> LodgifyClient:
    try:
        return LodgifyClient()
    except LodgifyConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


async def call(operation):
    try:
        return await operation
    except LodgifyAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


async def find_lodgify_property(lodgify_property_id: int) -> dict | None:
    page = 1
    while page <= 100:
        payload = await call(client().list_properties(page=page, size=50))
        items = payload.get("items", []) if isinstance(payload, dict) else []
        remote = next((item for item in items if int(item.get("id", -1)) == lodgify_property_id), None)
        if remote:
            return remote
        if len(items) < 50:
            return None
        page += 1
    return None


@router.get("/connection-test")
async def test_connection(_: dict = Depends(require_admin)):
    payload = await call(client().list_properties(page=1, size=1))
    items = payload.get("items", []) if isinstance(payload, dict) else []
    return {
        "connected": True,
        "provider": "lodgify",
        "api_version": "v2",
        "property_access": True,
        "property_count": payload.get("count") if isinstance(payload, dict) else None,
        "sample_property": (
            {"id": items[0].get("id"), "name": items[0].get("name")} if items else None
        ),
    }


@router.get("/properties")
async def properties(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=50),
    _: dict = Depends(require_admin),
):
    return await call(client().list_properties(page=page, size=size))


@router.get("/properties/{lodgify_property_id}/sync-preview")
async def property_sync_preview(
    lodgify_property_id: int,
    xspace_property_id: str | None = Query(None, min_length=1, max_length=120),
    _: dict = Depends(require_admin),
):
    """Preview a property mapping/import without performing any database write."""
    from server import db_instance

    remote = await find_lodgify_property(lodgify_property_id)
    if not remote:
        raise HTTPException(status_code=404, detail="Lodgify property not found")

    projection = {
        "_id": 0,
        "property_id": 1,
        "title": 1,
        "description": 1,
        "address": 1,
        "city": 1,
        "state": 1,
        "pin_code": 1,
        "latitude": 1,
        "longitude": 1,
        "status": 1,
        "external_channel_mappings": 1,
    }
    properties = await db_instance.properties.find({}, projection).to_list(length=10000)
    return build_preview(remote, properties, xspace_property_id)


@router.post("/properties/{lodgify_property_id}/mapping")
async def save_property_mapping(
    lodgify_property_id: int,
    payload: ManualPropertyMappingRequest,
    current_user: dict = Depends(require_admin),
):
    """Save only a manually approved Lodgify property mapping.

    This operation never imports or updates property fields, bookings, rates,
    availability, or OTA channel data.
    """
    from server import db_instance

    remote = await find_lodgify_property(lodgify_property_id)
    if not remote:
        raise HTTPException(status_code=404, detail="Lodgify property not found")

    async with _mapping_write_lock:
        properties = await db_instance.properties.find({}, {"_id": 0}).to_list(length=10000)
        plan = build_manual_mapping_plan(remote, properties, payload.xspace_property_id)
        if not plan["valid"]:
            raise HTTPException(status_code=plan["status_code"], detail=plan["error"])

        if plan["action"] == "insert":
            result = await db_instance.properties.update_one(
                {"property_id": payload.xspace_property_id},
                {"$set": {"external_channel_mappings.lodgify": plan["mapping"]}},
            )
            if getattr(result, "matched_count", int(result or 0)) != 1:
                raise HTTPException(status_code=409, detail="XSpace360 property changed before mapping could be saved")

        saved = await db_instance.properties.find_one(
            {"property_id": payload.xspace_property_id},
            {"_id": 0, "property_id": 1, "external_channel_mappings": 1},
        )
        saved_mapping = ((saved or {}).get("external_channel_mappings") or {}).get("lodgify")
        if saved_mapping != plan["mapping"]:
            raise HTTPException(status_code=500, detail="Lodgify mapping verification failed")

    return {
        "success": True,
        "provider": "lodgify",
        "created": plan["action"] == "insert",
        "idempotent": plan["idempotent"],
        "xspace_property_id": payload.xspace_property_id,
        "mapping": saved_mapping,
        "modified_fields": ["external_channel_mappings.lodgify"] if plan["action"] == "insert" else [],
        "synchronization_started": False,
    }


@router.get("/mapped-properties/{xspace_property_id}/calendar-preview")
async def mapped_calendar_preview(
    xspace_property_id: str,
    start: date,
    end: date,
    _: dict = Depends(require_admin),
):
    """Return mapped Lodgify availability and rates without persisting them."""
    from server import db_instance

    if end < start:
        raise HTTPException(status_code=422, detail="end must be on or after start")
    if (end - start).days > 366:
        raise HTTPException(status_code=422, detail="Date range cannot exceed 367 inclusive days")

    prop = await db_instance.properties.find_one(
        {"property_id": xspace_property_id},
        {"_id": 0, "property_id": 1, "external_channel_mappings": 1},
    )
    if not prop:
        raise HTTPException(status_code=404, detail="XSpace360 property not found")
    mapping = ((prop.get("external_channel_mappings") or {}).get("lodgify") or {})
    lodgify_property_id = mapping.get("property_id")
    room_ids = mapping.get("room_type_ids") or []
    if not lodgify_property_id:
        raise HTTPException(status_code=409, detail="XSpace360 property has no Lodgify mapping")
    if len(room_ids) != 1:
        raise HTTPException(status_code=409, detail="Exactly one Lodgify room type mapping is required for this preview")
    try:
        external_property_id = int(lodgify_property_id)
        room_type_id = int(room_ids[0])
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=409, detail="Saved Lodgify mapping contains invalid identifiers") from exc

    lodgify = client()
    availability_data, rates_data = await asyncio.gather(
        call(lodgify.get_availability(external_property_id, start=start.isoformat(), end=end.isoformat())),
        call(
            lodgify.get_rates(
                property_id=external_property_id,
                room_type_id=room_type_id,
                start_date=start.isoformat(),
                end_date=end.isoformat(),
            )
        ),
    )
    return build_calendar_preview(
        xspace_property_id=xspace_property_id,
        lodgify_property_id=external_property_id,
        room_type_id=room_type_id,
        start=start,
        end=end,
        availability=availability_data,
        rates=rates_data,
    )


@router.get("/bookings")
async def bookings(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=50),
    stay_filter: Literal["Upcoming", "Current", "Historic", "All"] = "All",
    updated_since: str | None = None,
    _: dict = Depends(require_admin),
):
    return await call(
        client().list_bookings(
            page=page,
            size=size,
            stay_filter=stay_filter,
            updated_since=updated_since,
        )
    )


@router.get("/properties/{property_id}/availability")
async def availability(
    property_id: int,
    start: date,
    end: date,
    _: dict = Depends(require_admin),
):
    if end < start:
        raise HTTPException(status_code=422, detail="end must be on or after start")
    return await call(client().get_availability(property_id, start=start.isoformat(), end=end.isoformat()))


@router.get("/properties/{property_id}/rooms/{room_type_id}/rates")
async def rates(
    property_id: int,
    room_type_id: int,
    start: date,
    end: date,
    _: dict = Depends(require_admin),
):
    if end < start:
        raise HTTPException(status_code=422, detail="end must be on or after start")
    return await call(
        client().get_rates(
            property_id=property_id,
            room_type_id=room_type_id,
            start_date=start.isoformat(),
            end_date=end.isoformat(),
        )
    )
