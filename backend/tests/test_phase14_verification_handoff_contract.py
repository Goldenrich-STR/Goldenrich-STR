import os
import sys
from pathlib import Path

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "xspace360_phase14_handoff_contract_test")

sys.path.append(str(Path(__file__).resolve().parents[1]))

from server import app
from models.verification import VerificationStatus


def _registered_routes():
    return {
        (method, route.path)
        for route in app.routes
        for method in getattr(route, "methods", set())
    }


def test_phase14_rm_and_admin_verification_handoff_routes_are_registered():
    routes = _registered_routes()

    required_routes = {
        ("GET", "/api/employee/verifications/pending"),
        ("GET", "/api/employee/verifications/history"),
        ("GET", "/api/employee/verifications/{verification_id}"),
        ("POST", "/api/employee/verifications/{verification_id}/approve"),
        ("POST", "/api/employee/verifications/{verification_id}/reject"),
        ("GET", "/api/admin/properties/awaiting-final-approval"),
        ("POST", "/api/admin/properties/{property_id}/approve"),
        ("POST", "/api/admin/properties/{property_id}/reject"),
    }

    assert required_routes.issubset(routes)


def test_phase14_final_verification_status_values_are_modelled():
    assert VerificationStatus.APPROVED.value == "approved"
    assert VerificationStatus.REJECTED.value == "rejected"


def test_phase14_verification_audit_actions_are_present():
    repo_root = Path(__file__).resolve().parents[1]
    broker_routes = (repo_root / "routes" / "broker_routes.py").read_text()
    employee_routes = (repo_root / "routes" / "employee_routes.py").read_text()
    admin_routes = (repo_root / "routes" / "admin_routes.py").read_text()

    assert "broker_site_visit_submitted" in broker_routes
    assert "rm_verification_approved" in employee_routes
    assert "rm_verification_rejected" in employee_routes
    assert "admin_property_approved" in admin_routes
    assert "admin_property_rejected" in admin_routes
