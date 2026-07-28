from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]


def _source(relative_path: str) -> str:
    return (BACKEND_ROOT / relative_path).read_text(encoding="utf-8")


def test_phase11_admin_core_sensitive_actions_have_audit_markers():
    source = _source("routes/admin_core_routes.py")

    required_markers = {
        "bootstrap_admin_core",
        "analytics_exported",
        "user_created",
        "user_updated",
        "user_deactivated",
        "password_reset",
        "role_created",
        "role_updated",
        "user_access_assigned",
        "reporting_manager_changed",
        "employee_transferred",
        "escalation_rule_created",
        "sla_policy_created",
        "audit_logs_exported",
        "host_kyc_",
        "host_team_assigned",
        "property_team_assigned",
        "property_status_changed",
        "subscription_status_changed",
        "booking_status_changed",
        "lead_updated",
        "lead_assigned",
        "test_notification_sent",
        "security_settings_updated",
        "maintenance_settings_updated",
        "ticket_assigned",
    }

    for marker in required_markers:
        assert marker in source


def test_phase11_cross_module_sensitive_actions_have_audit_markers():
    files = {
        "routes/booking_routes.py": ["payment_config_updated"],
        "routes/cms_routes.py": ["cms_content_created", "cms_content_updated", "cms_content_deleted"],
        "routes/support_ticket_routes.py": ["ticket_status_updated"],
    }

    for relative_path, markers in files.items():
        source = _source(relative_path)
        assert "write_audit_log" in source
        for marker in markers:
            assert marker in source


def test_phase11_audit_log_schema_is_immutable_and_traceable():
    source = _source("services/audit_service.py")

    required_fields = [
        "audit_id",
        "user_id",
        "role",
        "module",
        "action",
        "record_id",
        "old_value",
        "new_value",
        "reason",
        "status",
        "created_at",
        "immutable",
    ]

    for field in required_fields:
        assert field in source
