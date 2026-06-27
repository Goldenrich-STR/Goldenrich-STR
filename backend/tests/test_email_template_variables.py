from services.email_service import EmailService


def test_document_rejection_msg91_variables(monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://uat.x-space360.in")
    monkeypatch.setenv("SUPPORT_EMAIL", "help@example.com")
    monkeypatch.setenv("SUPPORT_PHONE", "+91 9999999999")

    service = EmailService()
    variables = service._variables_for(
        "host_documents_rejected",
        {
            "name": "Test Host",
            "rejection_reason": "PAN card is unclear.",
        },
        "Document verification update",
        "Documents rejected",
        "https://uat.x-space360.in/host/dashboard",
    )

    assert variables["User_Name"] == "Test Host"
    assert variables["Rejection_Reason"] == "PAN card is unclear."
    assert variables["Document_Upload_Link"] == "https://uat.x-space360.in/host/dashboard"
    assert variables["Support_Email"] == "help@example.com"
    assert variables["Support_Number"] == "+91 9999999999"
