import os
import sys
from pathlib import Path

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "xspace360_route_registration_test")

sys.path.append(str(Path(__file__).resolve().parents[1]))

from server import app


def _registered_routes():
    return {
        (method, route.path)
        for route in app.routes
        for method in getattr(route, "methods", set())
    }


def test_phase11_admin_core_routes_are_registered_for_deployment():
    routes = _registered_routes()

    required_routes = {
        ("POST", "/api/admin/core/bootstrap"),
        ("GET", "/api/admin/core/dashboard"),
        ("GET", "/api/admin/core/users"),
        ("GET", "/api/admin/core/roles"),
        ("GET", "/api/admin/core/permissions"),
        ("GET", "/api/admin/core/reporting-hierarchy"),
        ("GET", "/api/admin/core/escalation-rules"),
        ("GET", "/api/admin/core/audit-logs"),
        ("GET", "/api/admin/core/hosts"),
        ("GET", "/api/admin/core/properties-operations"),
        ("GET", "/api/admin/core/subscriptions"),
        ("GET", "/api/admin/core/bookings"),
        ("GET", "/api/admin/core/crm/dashboard"),
        ("GET", "/api/admin/core/communication/overview"),
        ("GET", "/api/admin/core/support/overview"),
        ("GET", "/api/admin/core/settings/overview"),
        ("GET", "/api/admin/core/analytics/overview"),
        ("GET", "/api/admin/core/analytics/export-csv"),
    }

    assert required_routes.issubset(routes)


def test_phase11_cross_module_admin_routes_are_registered_for_deployment():
    routes = _registered_routes()

    required_routes = {
        ("GET", "/api/admin/account/overview"),
        ("GET", "/api/admin/account/transactions"),
        ("GET", "/api/admin/account/transactions/export-csv"),
        ("GET", "/api/admin/account/payouts"),
        ("GET", "/api/admin/account/refunds"),
        ("GET", "/api/bookings/payment/config"),
        ("PUT", "/api/bookings/admin/payment/config"),
        ("GET", "/api/cms/admin/content"),
        ("GET", "/api/cms/admin/contact-messages"),
        ("GET", "/api/support-tickets/admin"),
    }

    assert required_routes.issubset(routes)
