from services.verification_case_workflow import (
    COMPLETED,
    LIVE,
    TELECALLER_CALL_PENDING,
    VERIFICATION_SCHEDULED,
    initial_case_status,
    live_case_updates,
)


def test_existing_kyc_approved_host_listing_starts_in_video_queue():
    assert initial_case_status("BROKER", {"kyc_status": "approved"}) == VERIFICATION_SCHEDULED
    assert initial_case_status("RM", {"kyc_status": "verified"}) == VERIFICATION_SCHEDULED


def test_new_host_listing_keeps_documents_call_then_video_path():
    assert initial_case_status("BROKER", {"kyc_status": "pending"}) == TELECALLER_CALL_PENDING
    assert initial_case_status("RM", {}) == TELECALLER_CALL_PENDING


def test_existing_host_document_verification_status_starts_in_video_queue():
    assert initial_case_status("SELF_HOST", {"document_verification_status": "approved"}) == VERIFICATION_SCHEDULED


def test_live_property_marks_its_verification_case_completed():
    updates = live_case_updates()
    assert updates["current_stage"] == LIVE
    assert updates["current_status"] == COMPLETED
    assert updates["workflow_status"] == LIVE
    assert updates["status"] == "approved"
