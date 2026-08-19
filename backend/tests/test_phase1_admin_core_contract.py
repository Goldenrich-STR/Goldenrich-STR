import asyncio
from datetime import datetime, timezone, timedelta
from pathlib import Path
import sys

import pytest
from fastapi import HTTPException

sys.path.append(str(Path(__file__).resolve().parents[1]))

from routes.admin_core_routes import (
    _analytics_export_config,
    _default_maintenance_settings,
    _default_security_settings,
    _escalation_status,
    _parse_date_end,
    _parse_date_start,
    _public_user,
    _validate_password_strength,
    api_response,
    require_admin,
)
from services.permission_service import STANDARD_MODULES, user_can


def test_phase1_api_response_contract():
    response = api_response("Loaded", {"items": []}, {"total": 0})
    assert response == {
        "success": True,
        "message": "Loaded",
        "data": {"items": []},
        "meta": {"total": 0},
    }


def test_public_user_masks_database_and_password_fields():
    user = {"_id": "mongo_id", "user_id": "user_1", "password_hash": "secret", "email": "a@example.com"}
    public = _public_user(user)
    assert public == {"user_id": "user_1", "email": "a@example.com"}
    assert "password_hash" not in public
    assert "_id" not in public


def test_password_strength_requires_length_case_and_number():
    _validate_password_strength("Xspace360")
    with pytest.raises(HTTPException):
        _validate_password_strength("short")
    with pytest.raises(HTTPException):
        _validate_password_strength("xspacepassword")
    with pytest.raises(HTTPException):
        _validate_password_strength("XSPACEPASSWORD")


@pytest.mark.parametrize(
    ("age_hours", "sla_hours", "expected"),
    [
        (1, 24, "within_sla"),
        (22, 24, "due_soon"),
        (24, 24, "level_1_escalated"),
        (48, 24, "level_2_escalated"),
        (72, 24, "level_3_escalated"),
        (96, 24, "critical"),
    ],
)
def test_escalation_status_boundaries(age_hours, sla_hours, expected):
    assert _escalation_status(age_hours, sla_hours) == expected


def test_audit_date_filter_bounds_are_timezone_aware():
    start = _parse_date_start("2026-07-25")
    end = _parse_date_end("2026-07-25")
    assert start == datetime(2026, 7, 24, 18, 30, tzinfo=timezone.utc)
    assert end == datetime(2026, 7, 25, 18, 29, 59, 999999, tzinfo=timezone.utc)
    assert end - start == timedelta(days=1, microseconds=-1)


def test_phase8_default_security_settings_are_enterprise_ready():
    settings = _default_security_settings()
    assert settings["min_password_length"] >= 8
    assert settings["password_max_length"] >= settings["min_password_length"]
    assert settings["require_uppercase"] is True
    assert settings["require_lowercase"] is True
    assert settings["require_number"] is True
    assert settings["require_special"] is True
    assert settings["admin_session_timeout_minutes"] <= settings["session_timeout_minutes"]
    assert settings["max_failed_login_attempts"] <= 5


def test_phase8_default_maintenance_settings_include_backup_checklist():
    settings = _default_maintenance_settings()
    keys = {item["key"] for item in settings["checklist"]}
    assert settings["maintenance_mode"] is False
    assert settings["backup_frequency"] == "daily"
    assert settings["retention_days"] >= 30
    assert {"database_backup", "media_backup", "env_snapshot", "rollback_plan"}.issubset(keys)


def test_phase9_analytics_export_config_has_supported_modules():
    config = _analytics_export_config()
    assert {"users", "properties", "bookings", "finance", "support", "crm", "cms", "subscriptions"} == set(config)
    assert config["users"][0] == "users"
    assert config["finance"][0] == "transactions"
    for _module, (_collection, date_field, fields) in config.items():
        assert date_field in fields
        assert len(fields) >= 6


def test_phase11_admin_guard_rejects_non_admin_roles():
    with pytest.raises(HTTPException) as exc:
        asyncio.run(require_admin({"user_id": "guest_1", "role": "guest"}))

    assert exc.value.status_code == 403


def test_phase11_admin_guard_accepts_admin_role():
    user = {"user_id": "admin_1", "role": "admin"}
    assert asyncio.run(require_admin(user)) == user


def test_phase11_user_can_allows_admin_and_explicit_permissions():
    assert asyncio.run(user_can({"role": "admin"}, "platform_settings.manage_settings")) is True
    assert asyncio.run(user_can({"role": "employee", "permissions": ["reports_analytics.view"]}, "reports_analytics.view")) is True
    assert asyncio.run(user_can({"role": "employee", "permissions": []}, "reports_analytics.export")) is False


def test_phase11_permission_matrix_covers_all_admin_modules():
    expected_modules = {
        "executive_dashboard",
        "user_organization_management",
        "roles_access_permissions",
        "reporting_hierarchy",
        "escalation_sla_matrix",
        "audit_activity_logs",
        "departments",
        "host_management",
        "property_operations",
        "subscription_management",
        "booking_operations",
        "finance_settlements",
        "sales_crm",
        "marketing_cms",
        "communication_center",
        "support_ticket_management",
        "approval_center",
        "reports_analytics",
        "platform_settings",
    }

    assert expected_modules.issubset(set(STANDARD_MODULES))
