from services.verification_case_workflow import (
    TELECALLER_CALL_PENDING,
    VERIFICATION_SCHEDULED,
    initial_case_status,
)


def test_existing_kyc_approved_host_listing_starts_in_video_queue():
    assert initial_case_status("BROKER", {"kyc_status": "approved"}) == VERIFICATION_SCHEDULED
    assert initial_case_status("RM", {"kyc_status": "verified"}) == VERIFICATION_SCHEDULED


def test_new_host_listing_keeps_documents_call_then_video_path():
    assert initial_case_status("BROKER", {"kyc_status": "pending"}) == TELECALLER_CALL_PENDING
    assert initial_case_status("RM", {}) == TELECALLER_CALL_PENDING
