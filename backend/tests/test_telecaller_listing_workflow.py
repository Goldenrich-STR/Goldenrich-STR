import asyncio
import inspect

from services.verification_case_workflow import (
    TELECALLER_CALL_PENDING,
    VERIFICATION_SCHEDULED,
    initial_case_status,
    resolve_verification_telecaller,
)
from routes.verification_case_routes import (
    _is_explicitly_assigned_to_telecaller,
    _visible_to_telecaller,
    dashboard_summary,
    list_cases,
    list_document_queue,
    my_leads,
)
from routes.admin_core_routes import _host_documents_approved


def test_existing_kyc_approved_host_listing_starts_in_video_queue():
    assert initial_case_status("BROKER", {"kyc_status": "approved"}) == VERIFICATION_SCHEDULED
    assert initial_case_status("RM", {"kyc_status": "verified"}) == VERIFICATION_SCHEDULED


def test_new_host_listing_keeps_documents_call_then_video_path():
    assert initial_case_status("BROKER", {"kyc_status": "pending"}) == TELECALLER_CALL_PENDING
    assert initial_case_status("RM", {}) == TELECALLER_CALL_PENDING


def test_historical_unassigned_record_stays_hidden_from_new_telecaller():
    telecaller = {
        "user_id": "telecaller-new",
        "employee_code": "TC-NEW",
        "created_at": "2026-10-03T10:00:00+00:00",
    }
    historical_host = {"created_at": "2026-09-01T10:00:00+00:00"}

    assert not _is_explicitly_assigned_to_telecaller(historical_host, telecaller)
    assert not _visible_to_telecaller(historical_host, telecaller)


def test_new_unassigned_record_stays_hidden_until_admin_assignment():
    telecaller = {
        "user_id": "telecaller-existing",
        "created_at": "2026-10-01T10:00:00+00:00",
    }
    new_host = {"created_at": "2026-10-03T10:00:00+00:00"}

    assert not _visible_to_telecaller(new_host, telecaller)


def test_unassigned_case_waits_for_admin_instead_of_batch_assignment():
    telecaller_id, policy = asyncio.run(
        resolve_verification_telecaller(
            db=None,
            prop={"property_id": "prop-new"},
            host={"user_id": "host-new", "kyc_status": "pending"},
            existing=None,
        )
    )

    assert telecaller_id == ""
    assert policy == {"policy": "awaiting_admin_assignment"}


def test_telecaller_get_endpoints_do_not_auto_assign_records():
    for endpoint in (list_cases, my_leads, dashboard_summary, list_document_queue):
        source = inspect.getsource(endpoint)
        assert "_assign_unassigned_telecaller_cases" not in source
        assert "_assign_host_document_telecallers" not in source


def test_historical_record_is_visible_after_explicit_assignment():
    telecaller = {
        "user_id": "telecaller-new",
        "employee_code": "TC-NEW",
        "created_at": "2026-10-03T10:00:00+00:00",
    }
    historical_case = {
        "created_at": "2026-09-01T10:00:00+00:00",
        "telecaller_id": "telecaller-new",
    }
    historical_host = {
        "created_at": "2026-09-01T10:00:00+00:00",
        "verification_telecaller_id": "TC-NEW",
    }

    assert _visible_to_telecaller(historical_case, telecaller)
    assert _visible_to_telecaller(historical_host, telecaller)


def test_historical_record_assigned_to_another_telecaller_stays_hidden():
    telecaller = {
        "user_id": "telecaller-new",
        "created_at": "2026-10-03T10:00:00+00:00",
    }
    historical_case = {
        "created_at": "2026-09-01T10:00:00+00:00",
        "telecaller_id": "telecaller-other",
    }

    assert not _visible_to_telecaller(historical_case, telecaller)


def test_assigned_host_id_from_case_overrides_historical_host_date():
    telecaller = {
        "user_id": "telecaller-new",
        "created_at": "2026-10-03T10:00:00+00:00",
    }
    historical_host = {
        "user_id": "host-old",
        "created_at": "2026-09-01T10:00:00+00:00",
    }

    assert _visible_to_telecaller(
        historical_host,
        telecaller,
        explicitly_assigned=historical_host["user_id"] in {"host-old"},
    )
def test_existing_host_document_verification_status_starts_in_video_queue():
    assert initial_case_status("SELF_HOST", {"document_verification_status": "approved"}) == VERIFICATION_SCHEDULED


def test_document_assignment_branch_uses_host_kyc_status():
    assert _host_documents_approved({"kyc_status": "approved"})
    assert _host_documents_approved({"document_verification_status": "verified"})
    assert not _host_documents_approved({"kyc_status": "pending"})


def test_document_queue_requires_explicit_host_document_assignment():
    source = inspect.getsource(list_document_queue)
    assert "assigned_cases =" not in source
    assert "_host_document_assignment_query(telecaller_terms)" in source
    assert '["pending", "pending_review", "submitted", "under_review", "rejected"]' in source
