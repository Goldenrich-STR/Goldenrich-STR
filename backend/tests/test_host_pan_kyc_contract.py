from pathlib import Path


def test_host_and_broker_kyc_require_pan_number_contract():
    repo_root = Path(__file__).resolve().parents[1]
    host_routes = (repo_root / "routes" / "host_account_routes.py").read_text(encoding="utf-8")
    broker_routes = (repo_root / "routes" / "broker_routes.py").read_text(encoding="utf-8")
    user_model = (repo_root / "models" / "user.py").read_text(encoding="utf-8")

    for source in (host_routes, broker_routes):
        assert '"document_type": "pan_number"' in source
        assert '"pan_number": pan_number' in source
        assert "normalize_pan_number(payload.pan_number)" in source
        assert '"pan_number": "pan_number"' in source
        assert '"pan": "pan_number"' in source
        assert '"pan_number"' in source

    assert "pan_number: str" in host_routes
    assert "PAN_NOT_APPLICABLE" in host_routes
    assert "[A-Z]{5}[0-9]{4}[A-Z]" in host_routes
    assert "pan_number: Optional[str] = None" in user_model


def test_pan_number_is_available_to_admin_host_and_broker_ui():
    repo_root = Path(__file__).resolve().parents[2]
    host_page = (repo_root / "frontend" / "src" / "pages" / "HostDashboard.js").read_text(encoding="utf-8")
    broker_page = (repo_root / "frontend" / "src" / "pages" / "BrokerDashboard.js").read_text(encoding="utf-8")
    admin_core = (repo_root / "backend" / "routes" / "admin_core_routes.py").read_text(encoding="utf-8")
    admin_dashboard = (repo_root / "frontend" / "src" / "pages" / "AdminDashboard.js").read_text(encoding="utf-8")

    for page in (host_page, broker_page):
        assert "PAN Card Number" in page
        assert "Not Applicable" in page
        assert "pan_number" in page
        assert "ABCDE1234F" in page
        assert "NOT_APPLICABLE" in page
        assert "isValidPanNumber" in page

    assert '("pan_number", "PAN Card Number", True)' in admin_core
    assert 'doc.document_type === \'gst_number\' || doc.document_type === \'pan_number\'' in admin_dashboard
