from routes.property_routes import _supports_guest_count


def test_guest_capacity_is_compared_numerically():
    assert _supports_guest_count({"max_guests": 2}, 2)
    assert _supports_guest_count({"max_guests": "10"}, 2)
    assert _supports_guest_count({"max_guests": 100}, 2)
    assert _supports_guest_count({"max_guests": "1000"}, 2)


def test_guest_capacity_rejects_over_capacity_and_invalid_values():
    assert not _supports_guest_count({"max_guests": 2}, 3)
    assert not _supports_guest_count({"max_guests": None}, 2)
    assert not _supports_guest_count({"max_guests": "unknown"}, 2)
