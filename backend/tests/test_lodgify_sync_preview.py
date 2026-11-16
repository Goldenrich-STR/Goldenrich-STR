from services.lodgify_sync_preview import build_manual_mapping_plan, build_preview


REMOTE = {
    "id": 860024,
    "name": "XSpace360 Demo Property",
    "internal_name": "XSPACE360-TEST-001",
    "address": "4, Gangapur Rd",
    "city": "Nashik",
    "state": "Maharashtra",
    "zip": "422013",
    "latitude": 20.011974,
    "longitude": 73.7563732,
    "rooms": [{"id": 927213}],
}


def test_unmapped_preview_is_read_only_and_skips_without_target():
    result = build_preview(REMOTE, [{"property_id": "prop_other", "title": "Other"}])

    assert result["dry_run"] is True
    assert result["writes_performed"] == 0
    assert result["mapping"]["action"] == "skip"
    assert result["report"]["properties"] == {"insert": 0, "update": 0, "skip": 1}
    assert result["report"]["mappings"] == {"insert": 0, "update": 0, "skip": 1}


def test_explicit_target_previews_mapping_and_preserves_nonempty_values():
    properties = [{
        "property_id": "prop_demo",
        "title": "Host-owned title",
        "description": "",
        "address": "Host-owned address",
        "city": "Nashik",
        "state": "Maharashtra",
        "pin_code": "422013",
        "latitude": None,
        "longitude": None,
    }]

    result = build_preview(REMOTE, properties, "prop_demo")
    changes = {item["field"]: item for item in result["field_changes"]}

    assert result["validation"]["valid"] is True
    assert result["mapping"]["action"] == "insert"
    assert result["mapping"]["proposed_value"]["room_type_ids"] == ["927213"]
    assert changes["title"]["action"] == "skip"
    assert changes["title"]["reason"] == "existing_xspace_value_preserved"
    assert changes["latitude"]["action"] == "update"


def test_duplicate_mapping_blocks_preview():
    properties = [
        {"property_id": "prop_one", "external_channel_mappings": {"lodgify": {"property_id": "860024"}}},
        {"property_id": "prop_two", "external_channel_mappings": {"lodgify": {"property_id": "860024"}}},
    ]

    result = build_preview(REMOTE, properties, "prop_one")

    assert result["validation"]["valid"] is False
    assert result["duplicate_detection"]["duplicate"] is True
    assert result["writes_performed"] == 0


def test_manual_mapping_plan_is_idempotent():
    properties = [{
        "property_id": "prop_demo",
        "external_channel_mappings": {
            "lodgify": {"property_id": "860024", "room_type_ids": ["927213"]}
        },
    }]

    result = build_manual_mapping_plan(REMOTE, properties, "prop_demo")

    assert result["valid"] is True
    assert result["action"] == "skip"
    assert result["idempotent"] is True


def test_manual_mapping_plan_rejects_duplicate_remote_property():
    properties = [
        {"property_id": "prop_demo"},
        {
            "property_id": "prop_other",
            "external_channel_mappings": {
                "lodgify": {"property_id": "860024", "room_type_ids": ["927213"]}
            },
        },
    ]

    result = build_manual_mapping_plan(REMOTE, properties, "prop_demo")

    assert result["valid"] is False
    assert result["status_code"] == 409


def test_manual_mapping_plan_rejects_conflicting_target_mapping():
    properties = [{
        "property_id": "prop_demo",
        "external_channel_mappings": {
            "lodgify": {"property_id": "999999", "room_type_ids": ["111"]}
        },
    }]

    result = build_manual_mapping_plan(REMOTE, properties, "prop_demo")

    assert result["valid"] is False
    assert result["status_code"] == 409
