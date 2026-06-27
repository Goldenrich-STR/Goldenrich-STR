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


def test_property_approval_msg91_variables():
    service = EmailService()
    variables = service._variables_for(
        "property_approved",
        {
            "name": "Test Host",
            "property_title": "Courtyard Marriott",
            "property_id": "prop_123",
            "approval_date": "27 June 2026",
            "published_date": "27 June 2026",
        },
        "Property approved",
        "Your property is live",
        "https://uat.x-space360.in/login?force_login=1&next=%2Fhost%2Fdashboard",
    )

    assert variables["Property_ID"] == "prop_123"
    assert variables["Approval_Date"] == "27 June 2026"
    assert variables["Published_Date"] == "27 June 2026"
    assert "force_login=1" in variables["Button_URL"]
