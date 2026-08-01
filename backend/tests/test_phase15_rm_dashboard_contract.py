from pathlib import Path


def test_phase15_employee_dashboard_stats_exposes_enterprise_kpi_groups():
    repo_root = Path(__file__).resolve().parents[1]
    routes = (repo_root / "routes" / "employee_routes.py").read_text()

    assert '@router.get("/dashboard/stats")' in routes
    assert '"brokers"' in routes
    assert '"hosts"' in routes
    assert '"properties"' in routes
    assert '"bookings"' in routes
    assert '"finance"' in routes
    assert '"performance"' in routes
    assert '"pending_escalations"' in routes
    assert '"sla_breaches"' in routes


def test_phase15_employee_dashboard_renders_rm_executive_cards():
    repo_root = Path(__file__).resolve().parents[2]
    page = (repo_root / "frontend" / "src" / "pages" / "EmployeeDashboard.js").read_text()

    expected_labels = [
        "Total Assigned Brokers",
        "Active Brokers",
        "Inactive Brokers",
        "Total Assigned Hosts",
        "Pending Host Verification",
        "Total Properties",
        "Live Properties",
        "Pending Property Verification",
        "Rejected Properties",
        "Draft Properties",
        "Bookings Today",
        "Bookings This Month",
        "Upcoming Check-ins",
        "Upcoming Check-outs",
        "Revenue Generated",
        "Broker Commission Generated",
        "Average Occupancy",
        "Average Property Rating",
        "Pending Escalations",
        "SLA Breaches",
    ]

    for label in expected_labels:
        assert label in page


def test_phase15_rm_broker_management_exposes_enterprise_metrics():
    repo_root = Path(__file__).resolve().parents[1]
    routes = (repo_root / "routes" / "employee_routes.py").read_text()

    expected_backend_fields = [
        '"hosts"',
        '"bookings"',
        '"revenue_generated"',
        '"commission_earned"',
        '"pending_escalations"',
        '"performance_rating"',
        '"last_activity"',
        '"audit_logs"',
        '"summary"',
    ]

    for field in expected_backend_fields:
        assert field in routes


def test_phase15_rm_scope_derives_brokers_hosts_properties_from_mixed_assignments():
    repo_root = Path(__file__).resolve().parents[1]
    routes = (repo_root / "routes" / "employee_routes.py").read_text()

    expected_scope_terms = [
        "async def _get_rm_identifiers",
        "async def _get_rm_scope",
        "direct_hosts",
        "direct_properties",
        "derived_broker_ids",
        "_field_matches_identifiers(\"rm_id\", identifiers)",
        "\"owner_id\": {\"$in\": direct_host_ids}",
        "\"broker_id\": {\"$in\": broker_ids}",
        "\"property_id\": {\"$in\": property_ids}",
        "\"user_broker_id\": {\"$in\": broker_ids}",
        "\"user_rm_id\"",
        "\"assigned_rm_id\"",
    ]

    for term in expected_scope_terms:
        assert term in routes


def test_phase15_rm_broker_management_ui_uses_host_terminology_and_drilldown_metrics():
    repo_root = Path(__file__).resolve().parents[2]
    page = (repo_root / "frontend" / "src" / "pages" / "EmployeeDashboard.js").read_text()

    expected_labels = [
        "Broker Management",
        "Assigned Hosts",
        "Fetching host network",
        "No Hosts assigned",
        "Commission",
        "Escalations",
        "Last Activity",
        "View Details",
    ]

    for label in expected_labels:
        assert label in page


def test_phase15_rm_host_management_routes_are_registered():
    repo_root = Path(__file__).resolve().parents[1]
    routes = (repo_root / "routes" / "employee_routes.py").read_text()

    assert '@router.get("/hosts")' in routes
    assert '@router.get("/hosts/{host_id}/details")' in routes
    assert "This host is not assigned to you" in routes
    assert '"properties"' in routes
    assert '"bookings"' in routes
    assert '"payments"' in routes
    assert '"verifications"' in routes
    assert '"audit_events"' in routes


def test_phase15_rm_host_management_ui_replaces_placeholder_with_real_section():
    repo_root = Path(__file__).resolve().parents[2]
    page = (repo_root / "frontend" / "src" / "pages" / "EmployeeDashboard.js").read_text()

    expected = [
        "<RMHostsSection />",
        "const RMHostsSection",
        "RM Host CRM",
        "Host Management",
        "/employee/hosts",
        "/employee/hosts/${host.user_id}/details",
        "RMHostDetailsModal",
        "Host Details",
    ]

    for value in expected:
        assert value in page


def test_phase15_rm_host_verification_tracker_is_rendered_in_host_details():
    repo_root = Path(__file__).resolve().parents[2]
    page = (repo_root / "frontend" / "src" / "pages" / "EmployeeDashboard.js").read_text()

    expected = [
        "buildRMHostVerificationStages",
        "RMVerificationTracker",
        "Host Verification Tracker",
        "Host Registration",
        "KYC Uploaded",
        "Document Verification",
        "Broker Verification",
        "RM Verification",
        "Finance Approval",
        "Admin Approval",
        "Property Live",
        "SLA remaining",
        "SLA breached",
    ]

    for value in expected:
        assert value in page


def test_phase15_rm_document_verification_review_panel_exists():
    repo_root = Path(__file__).resolve().parents[2]
    page = (repo_root / "frontend" / "src" / "pages" / "EmployeeDashboard.js").read_text()

    expected = [
        "RMDocumentReviewPanel",
        "Document Verification Review",
        "Aadhaar",
        "PAN",
        "Cancelled Cheque",
        "Ownership Documents",
        "Property Tax",
        "Water Tax",
        "Electricity Bill",
        "Society NOC",
        "GST",
        "Shop Act",
        "Agreement",
        "Preview",
        "Download document",
        "Verified By",
        "Expiry",
        "Remarks",
        "Version",
    ]

    for value in expected:
        assert value in page


def test_phase15_rm_property_management_routes_are_registered():
    repo_root = Path(__file__).resolve().parents[1]
    routes = (repo_root / "routes" / "employee_routes.py").read_text()

    expected = [
        '@router.get("/properties")',
        '@router.get("/properties/{property_id}/details")',
        "_get_rm_property_query",
        "_property_verification_stage",
        '"verification_stage"',
        '"host_summary"',
        '"broker_summary"',
        "Property not found or not assigned to you",
    ]

    for value in expected:
        assert value in routes


def test_phase15_rm_property_management_ui_replaces_placeholder_with_real_section():
    repo_root = Path(__file__).resolve().parents[2]
    page = (repo_root / "frontend" / "src" / "pages" / "EmployeeDashboard.js").read_text()

    expected = [
        "<RMPropertiesSection />",
        "const RMPropertiesSection",
        "RM Property Operations",
        "Property Management",
        "/employee/properties",
        "/employee/properties/${property.property_id}/details",
        "RMPropertyTracker",
        "Property Verification Tracker",
        "Basic Information",
        "Admin Approval",
        "Property Live",
    ]

    for value in expected:
        assert value in page


def test_phase15_rm_booking_management_routes_are_registered():
    repo_root = Path(__file__).resolve().parents[1]
    routes = (repo_root / "routes" / "employee_routes.py").read_text()

    expected = [
        '@router.get("/bookings")',
        '@router.get("/bookings/{booking_id}/details")',
        "_get_rm_booking_query",
        "Booking not found or not assigned to you",
        '"property_summary"',
        '"host_summary"',
        '"broker_summary"',
        '"timeline"',
        '"commissions"',
    ]

    for value in expected:
        assert value in routes


def test_phase15_rm_booking_management_ui_replaces_placeholder_with_real_section():
    repo_root = Path(__file__).resolve().parents[2]
    page = (repo_root / "frontend" / "src" / "pages" / "EmployeeDashboard.js").read_text()

    expected = [
        "<RMBookingsSection />",
        "const RMBookingsSection",
        "RM Booking Operations",
        "Booking Management",
        "/employee/bookings",
        "/employee/bookings/${booking.booking_id}/details",
        "RMBookingDetailsModal",
        "Booking Details",
        "Broker LG Code",
        "Booking Dates",
    ]

    for value in expected:
        assert value in page


def test_phase15_rm_tasks_routes_are_registered():
    repo_root = Path(__file__).resolve().parents[1]
    routes = (repo_root / "routes" / "employee_routes.py").read_text()

    expected = [
        '@router.get("/tasks")',
        "_rm_task_sla_status",
        '"tasks"',
        '"escalations"',
        '"notifications"',
        '"open_tasks"',
        '"critical_tasks"',
        '"overdue_tasks"',
        '"sla_breaches"',
        '"pending_approvals"',
    ]

    for value in expected:
        assert value in routes


def test_phase15_rm_tasks_ui_replaces_placeholder_with_real_section():
    repo_root = Path(__file__).resolve().parents[2]
    page = (repo_root / "frontend" / "src" / "pages" / "EmployeeDashboard.js").read_text()

    expected = [
        "<RMTasksSection />",
        "const RMTasksSection",
        "RM Workflow Engine",
        "Tasks, Escalations & Notifications",
        "/employee/tasks",
        "Task Queue",
        "Escalation Watchlist",
        "Notifications",
        "SLA Breaches",
        "Pending Approvals",
    ]

    for value in expected:
        assert value in page


def test_phase15_rm_analytics_routes_are_registered():
    repo_root = Path(__file__).resolve().parents[1]
    routes = (repo_root / "routes" / "employee_routes.py").read_text()

    expected = [
        '@router.get("/reports/rm-analytics-overview")',
        '@router.get("/reports/rm-analytics-overview/export-csv")',
        '"rm_analytics_overview"',
        '"conversion_rate"',
        '"verification_rate"',
        '"sla_breaches"',
        '"brokers"',
        '"hosts"',
        '"properties"',
        "rm_analytics_",
    ]

    for value in expected:
        assert value in routes


def test_phase15_rm_analytics_ui_is_rm_scoped_report_hub():
    repo_root = Path(__file__).resolve().parents[2]
    page = (repo_root / "frontend" / "src" / "pages" / "EmployeeDashboard.js").read_text()

    expected = [
        "RM Analytics Command",
        "RM Analytics & Reports",
        "rm_analytics_overview",
        "/employee/reports/rm-analytics-overview/export-csv",
        "Broker Performance",
        "Host Performance",
        "Property Performance",
        "Live Properties",
        "SLA Breaches",
        "Generate a report to view RM analytics",
    ]

    for value in expected:
        assert value in page


def test_phase15_rm_final_hardening_routes_cover_rbac_and_audit_scope():
    repo_root = Path(__file__).resolve().parents[1]
    routes = (repo_root / "routes" / "employee_routes.py").read_text()

    expected = [
        "async def require_employee",
        "Employee access required",
        '@router.get("/audit-activity")',
        "get_rm_audit_activity",
        '"audit_logs"',
        '"scoped_records"',
        '"available_modules"',
        '"new_value.rm_id"',
        '"old_value.rm_id"',
        "write_audit_log",
    ]

    for value in expected:
        assert value in routes


def test_phase15_rm_final_hardening_ui_replaces_audit_placeholder():
    repo_root = Path(__file__).resolve().parents[2]
    page = (repo_root / "frontend" / "src" / "pages" / "EmployeeDashboard.js").read_text()

    expected = [
        "<RMAuditActivitySection />",
        "const RMAuditActivitySection",
        "RM Compliance Control",
        "Audit & Activity",
        "/employee/audit-activity",
        "Total Events",
        "Approval Events",
        "Failed Events",
        "Scoped Records",
        "No audit activity found in this RM scope",
    ]

    for value in expected:
        assert value in page
