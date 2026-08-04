from pathlib import Path


def test_tds_service_supports_role_wise_configurations():
    repo_root = Path(__file__).resolve().parents[1]
    source = (repo_root / "services" / "tds_service.py").read_text(encoding="utf-8")

    assert 'TDS_ROLES = {"host", "broker", "employee"}' in source
    assert '"role": "host"' in source
    assert '"role_label": "Host"' in source
    assert "def _normalize_tds_configurations" in source
    assert "def _config_for_role" in source
    assert "configurations" in source


def test_platform_settings_exposes_add_configuration_and_role_dropdown():
    repo_root = Path(__file__).resolve().parents[2]
    source = (repo_root / "frontend" / "src" / "pages" / "admin" / "PlatformSettings.js").read_text(encoding="utf-8")

    assert "Add Configuration" in source
    assert "Apply To Role" in source
    assert "tdsRoleOptions" in source
    assert "host', 'Host" in source
    assert "broker', 'Broker" in source
    assert "employee', 'Employee" in source
    assert "configurations" in source
