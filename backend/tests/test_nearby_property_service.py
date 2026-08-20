import pytest
import sys
from fastapi import HTTPException
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.nearby_property_service import (
    MAX_RADIUS_METERS,
    haversine_distance_meters,
    validate_nearby_coordinates,
)


def test_validate_nearby_coordinates_accepts_valid_5km_request():
    validate_nearby_coordinates(15.4909, 73.8278, 5000)


@pytest.mark.parametrize(
    "lat,lng,radius",
    [
        (-91, 73.8278, 5000),
        (91, 73.8278, 5000),
        (15.4909, -181, 5000),
        (15.4909, 181, 5000),
        (15.4909, 73.8278, 0),
        (15.4909, 73.8278, MAX_RADIUS_METERS + 1),
    ],
)
def test_validate_nearby_coordinates_rejects_invalid_request(lat, lng, radius):
    with pytest.raises(HTTPException):
        validate_nearby_coordinates(lat, lng, radius)


def test_haversine_distance_is_zero_for_same_point():
    assert haversine_distance_meters(19.9975, 73.7898, 19.9975, 73.7898) == 0


def test_haversine_distance_matches_expected_city_scale():
    # Roughly 1.1 KM north/south for 0.01 latitude degrees.
    distance = haversine_distance_meters(19.9975, 73.7898, 20.0075, 73.7898)
    assert 1100 <= distance <= 1120
