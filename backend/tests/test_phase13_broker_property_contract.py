import os
import sys
from pathlib import Path

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "xspace360_phase13_broker_contract_test")

sys.path.append(str(Path(__file__).resolve().parents[1]))

from server import app


def _registered_routes():
    return {
        (method, route.path)
        for route in app.routes
        for method in getattr(route, "methods", set())
    }


def test_phase13_broker_property_routes_are_registered():
    routes = _registered_routes()

    required_routes = {
        ("GET", "/api/broker/properties"),
        ("POST", "/api/broker/properties"),
        ("PATCH", "/api/broker/properties/{property_id}"),
        ("POST", "/api/broker/properties/{property_id}/submit-verification"),
        ("POST", "/api/broker/properties/{property_id}/start-rework"),
        ("GET", "/api/broker/verifications"),
        ("POST", "/api/broker/verifications/{property_id}/submit"),
    }

    assert required_routes.issubset(routes)
