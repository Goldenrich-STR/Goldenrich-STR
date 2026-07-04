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
        "https://uat.x-space360.in/host/dashboard",
    )

    assert variables["Property_ID"] == "prop_123"
    assert variables["Approval_Date"] == "27 June 2026"
    assert variables["Published_Date"] == "27 June 2026"
    assert variables["Button_URL"] == "https://uat.x-space360.in/host/dashboard"


def test_variables_enrichment_and_casing():
    from datetime import datetime, timezone
    service = EmailService()
    
    # Test case 1: Date & Time formatting + Casing Variations
    variables = service._variables_for(
        "booking_confirmed",
        {
            "name": "John Doe",
            "booking_date": "2026-06-29T12:00:00Z",
            "check_in_date": "2026-07-10",
            "check_in_time": "2026-07-10T14:30:00Z",
            "amount": 15450.75,
            "gst_amount": 2781.0,
            "auto_renewal_status": True,
            "check_in_instructions": "Key is in the lockbox.",
        },
        "Booking Confirmed",
        "Your booking is confirmed",
        "https://uat.x-space360.in/booking/123",
    )
    
    # Check casing variations of customer_name
    assert variables["customer_name"] == "John Doe"
    assert variables["Customer_Name"] == "John Doe"
    assert variables["CUSTOMER_NAME"] == "John Doe"
    assert variables["customerName"] == "John Doe"
    assert variables["CustomerName"] == "John Doe"
    
    # Check friendly date formats
    assert variables["Booking_Date"] == "29 June 2026"
    assert variables["Check_In_Date"] == "10 July 2026"
    
    # Check friendly time formats
    assert variables["Check_In_Time"] == "02:30 PM"
    
    # Check friendly amount formats
    assert variables["Amount"] == "15,450.75"
    assert variables["GST_Amount"] == "2,781"
    
    # Check Auto Renewal status translation
    assert variables["Auto_Renewal_Status"] == "Active"
    
    # Check hyphenated casing variation for check-in instructions
    assert variables["Check-In_Instructions"] == "Key is in the lockbox."
    assert variables["check-in_instructions"] == "Key is in the lockbox."
    assert variables["CHECK-IN_INSTRUCTIONS"] == "Key is in the lockbox."
    
    # Check template-specific button names
    assert variables["View_Cancellation_Policy"] == "https://uat.x-space360.in/booking/123"
    assert variables["View_Cancellation_Policy_URL"] == "https://uat.x-space360.in/booking/123"


def test_booking_confirmation_keeps_explicit_host_details():
    service = EmailService()
    variables = service._variables_for(
        "booking_confirmation",
        {
            "name": "Guest Person",
            "customer_name": "Guest Person",
            "host_name": "Host Person",
            "host_mobile": "9876543210",
        },
        "Booking confirmed",
        "Booking confirmed",
        "https://www.x-space360.in/refund-policy",
    )

    assert variables["Customer_Name"] == "Guest Person"
    assert variables["Host_Name"] == "Host Person"
    assert variables["Host_Mobile"] == "9876543210"
    assert variables["View_Cancellation_Policy"] == "https://www.x-space360.in/refund-policy"


def test_template_action_urls_are_canonical(monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://www.x-space360.in")
    service = EmailService()
    service.provider = "msg91"
    service.is_demo_mode = False

    captured = {}

    def capture(_to, template, _subject, _title, cta_url, data):
        captured[template] = (cta_url, data)
        return {"success": True}

    monkeypatch.setattr(service, "_send_msg91_template", capture)

    service.send_template("host@example.com", "subscription_activated", {})
    service.send_template(
        "host@example.com",
        "property_rejected",
        {"property_id": "prop_123", "property_title": "Test Property"},
    )
    service.send_template(
        "guest@example.com",
        "review_reminder",
        {"deep_link": "https://www.x-space360.in/guest/bookings?review=BK123"},
    )
    service.send_template("guest@example.com", "customer_registration", {})
    service.send_template("guest@example.com", "booking_confirmation", {})

    assert captured["subscription_activated"][0] == "https://www.x-space360.in/host/dashboard"
    assert captured["property_rejected"][0] == "https://www.x-space360.in/host/list-property?edit=prop_123"
    assert captured["review_reminder"][0] == "https://www.x-space360.in/guest/bookings?review=BK123"
    assert captured["customer_registration"][0] == "https://www.x-space360.in/dashboard"
    assert captured["booking_confirmation"][0] == "https://www.x-space360.in/refund-policy"
