"""Read-only Lodgify-to-XSpace360 property matching and preview rules."""

from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import Any


PROVIDER = "lodgify"
MAPPING_FIELD = "external_channel_mappings.lodgify"

FIELD_MAP = {
    "name": "title",
    "description": "description",
    "address": "address",
    "city": "city",
    "state": "state",
    "zip": "pin_code",
    "latitude": "latitude",
    "longitude": "longitude",
}


def _normalized(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").casefold()).strip()


def _same(left: Any, right: Any) -> bool:
    if left in (None, "") or right in (None, ""):
        return left in (None, "") and right in (None, "")
    if isinstance(left, (int, float)) and isinstance(right, (int, float)):
        return abs(float(left) - float(right)) < 0.000001
    return _normalized(left) == _normalized(right)


def _similarity(left: Any, right: Any) -> float:
    a, b = _normalized(left), _normalized(right)
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


def mapping_for(prop: dict) -> dict | None:
    mappings = prop.get("external_channel_mappings") or {}
    value = mappings.get(PROVIDER) if isinstance(mappings, dict) else None
    return value if isinstance(value, dict) else None


def property_candidates(remote: dict, properties: list[dict], *, limit: int = 5) -> list[dict]:
    candidates = []
    remote_id = str(remote.get("id") or "")
    for prop in properties:
        existing_mapping = mapping_for(prop)
        exact_external_id = str((existing_mapping or {}).get("property_id") or "") == remote_id
        title_score = max(
            _similarity(remote.get("name"), prop.get("title")),
            _similarity(remote.get("internal_name"), prop.get("title")),
        )
        address_score = _similarity(remote.get("address"), prop.get("address"))
        city_score = _similarity(remote.get("city"), prop.get("city"))
        pin_match = bool(remote.get("zip") and str(remote.get("zip")) == str(prop.get("pin_code") or ""))
        score = min(1.0, title_score * 0.55 + address_score * 0.20 + city_score * 0.10 + (0.15 if pin_match else 0))
        if exact_external_id:
            confidence = "exact"
            score = 1.0
        elif score >= 0.82 and pin_match:
            confidence = "high"
        elif score >= 0.62:
            confidence = "medium"
        else:
            confidence = "low"
        candidates.append(
            {
                "xspace_property_id": prop.get("property_id"),
                "title": prop.get("title"),
                "city": prop.get("city"),
                "pin_code": prop.get("pin_code"),
                "status": prop.get("status"),
                "match_score": round(score, 3),
                "confidence": confidence,
                "signals": {
                    "external_id": exact_external_id,
                    "title": round(title_score, 3),
                    "address": round(address_score, 3),
                    "city": round(city_score, 3),
                    "pin_code": pin_match,
                },
            }
        )
    candidates.sort(key=lambda item: item["match_score"], reverse=True)
    return candidates[:limit]


def duplicate_mappings(properties: list[dict], lodgify_property_id: int) -> list[str]:
    expected = str(lodgify_property_id)
    return [
        str(prop.get("property_id"))
        for prop in properties
        if str((mapping_for(prop) or {}).get("property_id") or "") == expected
    ]


def build_manual_mapping_plan(remote: dict, properties: list[dict], target_property_id: str) -> dict:
    """Validate a manual mapping without mutating either input."""
    remote_id = str(remote.get("id") or "")
    room_type_ids = sorted(
        str(room.get("id"))
        for room in remote.get("rooms") or []
        if room.get("id") is not None
    )
    target = next((prop for prop in properties if prop.get("property_id") == target_property_id), None)
    if not target:
        return {"valid": False, "status_code": 404, "error": "XSpace360 property not found"}

    mapped_targets = duplicate_mappings(properties, int(remote_id))
    conflicts = [property_id for property_id in mapped_targets if property_id != target_property_id]
    if conflicts:
        return {
            "valid": False,
            "status_code": 409,
            "error": "Lodgify property is already mapped to another XSpace360 property",
            "conflicting_xspace_property_ids": conflicts,
        }

    current = mapping_for(target)
    proposed = {"property_id": remote_id, "room_type_ids": room_type_ids}
    if current:
        current_property_id = str(current.get("property_id") or "")
        current_rooms = sorted(str(value) for value in current.get("room_type_ids") or [])
        if current_property_id != remote_id:
            return {
                "valid": False,
                "status_code": 409,
                "error": "XSpace360 property is already mapped to a different Lodgify property",
            }
        if current_rooms != room_type_ids:
            return {
                "valid": False,
                "status_code": 409,
                "error": "Existing Lodgify room mapping conflicts with the current Lodgify property",
            }
        return {"valid": True, "action": "skip", "idempotent": True, "mapping": proposed}

    return {"valid": True, "action": "insert", "idempotent": False, "mapping": proposed}


def build_preview(remote: dict, properties: list[dict], target_property_id: str | None = None) -> dict:
    remote_id = int(remote["id"])
    duplicates = duplicate_mappings(properties, remote_id)
    candidates = property_candidates(remote, properties)
    target = next((prop for prop in properties if prop.get("property_id") == target_property_id), None)
    validation_errors = []

    if target_property_id and not target:
        validation_errors.append("Requested XSpace360 property does not exist")
    if len(duplicates) > 1:
        validation_errors.append("Lodgify property is mapped to multiple XSpace360 properties")
    if duplicates and target_property_id and target_property_id not in duplicates:
        validation_errors.append("Lodgify property is already mapped to another XSpace360 property")

    field_changes = []
    counts = {"insert": 0, "update": 0, "skip": 0}
    mapping_action = "skip"

    if target and not validation_errors:
        current_mapping = mapping_for(target)
        mapping_action = "skip" if current_mapping and str(current_mapping.get("property_id")) == str(remote_id) else "insert"
        for remote_field, local_field in FIELD_MAP.items():
            incoming = remote.get(remote_field)
            current = target.get(local_field)
            if incoming in (None, ""):
                action, reason = "skip", "missing_in_lodgify"
            elif _same(current, incoming):
                action, reason = "skip", "already_equal"
            elif current in (None, ""):
                action, reason = "update", "fill_empty_xspace_field"
            else:
                action, reason = "skip", "existing_xspace_value_preserved"
            counts[action] += 1
            field_changes.append(
                {
                    "field": local_field,
                    "action": action,
                    "reason": reason,
                    "current": current,
                    "incoming": incoming,
                }
            )
    else:
        counts["skip"] = len(FIELD_MAP)

    mapping_counts = {"insert": 0, "update": 0, "skip": 0}
    mapping_counts[mapping_action] = 1
    property_counts = {
        "insert": 0,
        "update": 1 if counts["update"] else 0,
        "skip": 0 if counts["update"] else 1,
    }

    return {
        "dry_run": True,
        "writes_performed": 0,
        "provider": PROVIDER,
        "lodgify_property": {
            "id": remote_id,
            "room_type_ids": [room.get("id") for room in remote.get("rooms") or [] if room.get("id") is not None],
            "name": remote.get("name"),
            "address": remote.get("address"),
            "city": remote.get("city"),
            "state": remote.get("state"),
            "pin_code": remote.get("zip"),
        },
        "target_xspace_property_id": target_property_id,
        "mapping": {
            "action": mapping_action,
            "storage_design": MAPPING_FIELD,
            "proposed_value": (
                {"property_id": str(remote_id), "room_type_ids": [str(room.get("id")) for room in remote.get("rooms") or []]}
                if target and not validation_errors
                else None
            ),
        },
        "duplicate_detection": {
            "duplicate": len(duplicates) > 1,
            "mapped_xspace_property_ids": duplicates,
        },
        "validation": {"valid": not validation_errors, "errors": validation_errors},
        "candidates": candidates,
        "field_changes": field_changes,
        "report": {
            "properties": property_counts,
            "mappings": mapping_counts,
            "fields": counts,
        },
        "next_action": (
            "Select or create an XSpace360 property, then rerun with xspace_property_id"
            if not target_property_id
            else "Review this preview; no changes were saved"
        ),
    }
