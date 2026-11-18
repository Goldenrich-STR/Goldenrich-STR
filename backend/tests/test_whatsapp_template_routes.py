from types import SimpleNamespace

import pytest

from models.notification import NotificationType
from services.notification_service import NotificationService, WHATSAPP_TEMPLATE_ENV_KEYS, log_whatsapp_configuration
from services import notification_service
from services import booking_notifications, booking_reminder, review_reminder
from routes import webhook_routes, subscription_routes


class InsertCollection:
    def __init__(self):
        self.rows = []

    async def insert_one(self, row):
        self.rows.append(row)


class FindCollection:
    def __init__(self, rows, key):
        self.rows = rows
        self.key = key

    async def find_one(self, query, projection=None):
        return self.rows.get(query.get(self.key))


class WebhookBookingCollection:
    def __init__(self, booking):
        self.booking = booking
        self.update = None

    async def find_one(self, query, projection=None):
        order_ids = {item.get("razorpay_order_id") or item.get("remaining_payment_order_id") for item in query.get("$or", [])}
        if self.booking.get("razorpay_order_id") in order_ids or self.booking.get("remaining_payment_order_id") in order_ids:
            return dict(self.booking)
        return None

    async def update_one(self, query, update):
        self.update = update["$set"]


class FakeWebhookRequest:
    headers = {}

    def __init__(self, payload):
        self.payload = payload

    async def body(self):
        return b"{}"

    async def json(self):
        return self.payload


@pytest.mark.parametrize(
    ("notification_type", "env_key", "template_name", "data", "expected"),
    [
        (
            NotificationType.SUBSCRIPTION_SUCCESS,
            "MSG91_WHATSAPP_TEMPLATE_HOST_SUBSCRIPTION_SUCCESS",
            "xspace_host_subscription_success",
            {"host_name": "Host", "plan_name": "Gold", "start_date": "1 Oct", "end_date": "1 Nov", "amount": 5000, "transaction_id": "pay_1"},
            ["Host", "Gold", "1 Oct", "1 Nov", 5000, "pay_1"],
        ),
        (
            NotificationType.GUEST_BOOKING_CANCELLED,
            "MSG91_WHATSAPP_TEMPLATE_GUEST_BOOKING_CANCELLED",
            "xspace_guest_booking_cancelled",
            {"guest_name": "Guest", "property_title": "Villa", "booking_id": "BK1", "check_in_date": "1 Oct", "check_out_date": "2 Oct", "reason": "Plans changed"},
            ["Guest", "Villa", "BK1", "1 Oct", "2 Oct", "Plans changed"],
        ),
        (
            NotificationType.HOST_BOOKING_CANCELLED,
            "MSG91_WHATSAPP_TEMPLATE_HOST_BOOKING_CANCELLED",
            "xspace_host_booking_cancelled",
            {"host_name": "Host", "property_title": "Villa", "booking_id": "BK1", "guest_name": "Guest", "check_in_date": "1 Oct", "check_out_date": "2 Oct", "reason": "Plans changed"},
            ["Host", "Villa", "BK1", "Guest", "1 Oct", "2 Oct", "Plans changed"],
        ),
        (
            NotificationType.BOOKING_INVOICE,
            "MSG91_WHATSAPP_TEMPLATE_GUEST_BOOKING_INVOICE",
            "xspace_guest_booking_invoice",
            {"guest_name": "Guest", "booking_id": "BK1", "invoice_number": "INV1", "invoice_date": "2 Oct", "property_title": "Villa", "taxable_amount": 1000, "gstin": "GST1", "gst_amount": 180, "total_invoice_amount": 1180, "invoice_document_url": "https://x-space360.in/invoice.pdf"},
            ["Guest", "BK1", "INV1", "2 Oct", "Villa", 1000, "GST1", 180, 1180],
        ),
        (
            NotificationType.REFUND_RECEIVED,
            "MSG91_WHATSAPP_TEMPLATE_GUEST_REFUND_PROCESSED",
            "xspace_guest_booking_refund_processed",
            {"guest_name": "Guest", "booking_id": "BK1", "property_title": "Villa", "refund_amount": 900, "refund_date": "3 Oct", "payment_method": "UPI", "refund_reference_number": "RF1"},
            ["Guest", "BK1", "Villa", 900, "3 Oct", "UPI", "RF1"],
        ),
        (
            NotificationType.BOOKING_REMINDER,
            "MSG91_WHATSAPP_TEMPLATE_GUEST_CHECKIN_REMINDER",
            "xspace_guest_checkin_reminder",
            {"guest_name": "Guest", "property_title": "Villa", "booking_id": "BK1", "check_in_date_time": "1 Oct 2 PM", "check_out_date_time": "2 Oct 11 AM", "map_url": "https://maps.google.com/?q=1,2"},
            ["Guest", "Villa", "BK1", "1 Oct 2 PM", "2 Oct 11 AM", "https://maps.google.com/?q=1,2"],
        ),
        (
            NotificationType.GUEST_CHECKOUT_REMINDER,
            "MSG91_WHATSAPP_TEMPLATE_GUEST_CHECKOUT_REMINDER",
            "xspace_guest_checkout_reminder",
            {"guest_name": "Guest", "property_title": "Villa", "check_out_date_time": "2 Oct 11 AM", "booking_id": "BK1"},
            ["Guest", "Villa", "2 Oct 11 AM", "BK1"],
        ),
        (
            NotificationType.GUEST_STAY_COMPLETED,
            "MSG91_WHATSAPP_TEMPLATE_GUEST_STAY_COMPLETED",
            "xspace_guest_stay_completed",
            {"guest_name": "Guest", "property_title": "Villa", "booking_id": "BK1", "check_out_date_time": "2 Oct 11 AM"},
            ["Guest", "Villa", "BK1", "2 Oct 11 AM"],
        ),
        (
            NotificationType.GUEST_PAYMENT_FAILED,
            "MSG91_WHATSAPP_TEMPLATE_GUEST_PAYMENT_FAILED",
            "xspace_guest_payment_failed",
            {"guest_name": "Guest", "property_title": "Villa", "booking_id": "BK1", "amount": 1180},
            ["Guest", "Villa", "BK1", 1180],
        ),
    ],
)
@pytest.mark.asyncio
async def test_approved_whatsapp_template_payloads(
    monkeypatch, notification_type, env_key, template_name, data, expected
):
    monkeypatch.setenv(env_key, template_name)
    calls = []

    def fake_send(phone, name, parameters, **kwargs):
        calls.append((phone, name, parameters, kwargs))
        return {"success": True, "message_id": "msg_1"}

    monkeypatch.setattr(notification_service.msg91_service, "send_whatsapp_template", fake_send)
    db = SimpleNamespace(notifications=InsertCollection())
    service = NotificationService(db)
    user = {"user_id": "USR1", "full_name": "Fallback", "phone": "9876543210"}

    result = await service._send_whatsapp(user, "Title", "Message", notification_type, data)

    assert result["success"] is True
    assert calls[0][0:3] == ("9876543210", template_name, expected)
    if notification_type == NotificationType.BOOKING_INVOICE:
        assert calls[0][3]["header_media_type"] == "document"
        assert calls[0][3]["header_media_url"] == "https://x-space360.in/invoice.pdf"
    else:
        assert calls[0][3]["button_url_parameters"] is None


@pytest.mark.asyncio
async def test_invoice_template_requires_public_pdf(monkeypatch):
    monkeypatch.setenv("MSG91_WHATSAPP_TEMPLATE_GUEST_BOOKING_INVOICE", "xspace_guest_booking_invoice")
    called = False

    def fake_send(*args, **kwargs):
        nonlocal called
        called = True
        return {"success": True}

    monkeypatch.setattr(notification_service.msg91_service, "send_whatsapp_template", fake_send)
    db = SimpleNamespace(notifications=InsertCollection())
    service = NotificationService(db)
    user = {"user_id": "USR1", "full_name": "Guest", "phone": "9876543210"}

    result = await service._send_whatsapp(
        user,
        "Invoice",
        "Invoice ready",
        NotificationType.BOOKING_INVOICE,
        {"booking_id": "BK1", "invoice_number": "INV1"},
    )

    assert called is False
    assert result["success"] is False
    assert "public PDF" in result["error"]


def test_production_configuration_report(monkeypatch):
    monkeypatch.setenv("MSG91_AUTHKEY", "secret")
    monkeypatch.setenv("MSG91_WHATSAPP_INTEGRATED_NUMBER", "919876543210")
    monkeypatch.setenv("MSG91_DEMO_MODE", "false")
    for key in WHATSAPP_TEMPLATE_ENV_KEYS:
        monkeypatch.setenv(key, f"configured_{key.lower()}")

    report = log_whatsapp_configuration()

    assert report == {"configured": True, "demo_mode": False, "missing": []}


@pytest.mark.asyncio
async def test_booking_cancellation_notifies_guest_and_host(monkeypatch):
    calls = []

    async def fake_send(**kwargs):
        calls.append(kwargs)
        return {"success": True, "results": {"whatsapp": {"success": True}}}

    monkeypatch.setattr(booking_notifications, "send_multi_channel_notification", fake_send)
    db = SimpleNamespace(
        users=FindCollection(
            {
                "GST1": {"user_id": "GST1", "full_name": "Guest"},
                "HST1": {"user_id": "HST1", "full_name": "Host"},
            },
            "user_id",
        ),
        properties=FindCollection({"PROP1": {"property_id": "PROP1", "title": "Villa"}}, "property_id"),
    )
    booking = {
        "booking_id": "BK1",
        "guest_id": "GST1",
        "host_id": "HST1",
        "property_id": "PROP1",
        "check_in_date": "1 Oct",
        "check_out_date": "2 Oct",
    }

    await booking_notifications.notify_booking_cancelled(db, booking, "Guest cancellation")

    assert [call["notification_type"] for call in calls] == [
        NotificationType.GUEST_BOOKING_CANCELLED,
        NotificationType.HOST_BOOKING_CANCELLED,
    ]
    assert all("whatsapp" in {channel.value for channel in call["channels"]} for call in calls)
    assert calls[0]["data"]["reason"] == "Guest cancellation"


@pytest.mark.asyncio
async def test_refund_whatsapp_is_not_blocked_by_email_flag(monkeypatch):
    calls = []

    async def fake_send(**kwargs):
        calls.append(kwargs)
        return {"success": True, "results": {"whatsapp": {"success": True}}}

    monkeypatch.setenv("REFUND_EMAIL_ENABLED", "false")
    monkeypatch.setattr(booking_notifications, "send_multi_channel_notification", fake_send)
    db = SimpleNamespace(
        users=FindCollection({"GST1": {"user_id": "GST1", "full_name": "Guest"}}, "user_id"),
        bookings=FindCollection({"BK1": {"booking_id": "BK1", "property_id": "PROP1", "payment_method": "UPI"}}, "booking_id"),
        properties=FindCollection({"PROP1": {"property_id": "PROP1", "title": "Villa"}}, "property_id"),
    )

    await booking_notifications.notify_guest_refund_processed(
        db,
        {"refund_id": "RF1", "guest_id": "GST1", "booking_id": "BK1", "refund_amount": 10000},
    )

    channels = {channel.value for channel in calls[0]["channels"]}
    assert channels == {"in_app", "whatsapp"}
    assert calls[0]["notification_type"] == NotificationType.REFUND_RECEIVED


@pytest.mark.asyncio
async def test_checkin_and_checkout_reminders_include_whatsapp(monkeypatch):
    calls = []

    async def fake_send(**kwargs):
        calls.append(kwargs)
        return {"success": True, "results": {"whatsapp": {"success": True}, "email": {"success": False}}}

    monkeypatch.setattr(booking_reminder, "send_multi_channel_notification", fake_send)
    db = SimpleNamespace(
        users=FindCollection(
            {
                "GST1": {"user_id": "GST1", "full_name": "Guest"},
                "HST1": {"user_id": "HST1", "full_name": "Host", "phone": "9876543210"},
            },
            "user_id",
        ),
        properties=FindCollection(
            {"PROP1": {"property_id": "PROP1", "title": "Villa", "latitude": 19.99, "longitude": 73.78}},
            "property_id",
        ),
    )
    booking = {
        "booking_id": "BK1",
        "guest_id": "GST1",
        "host_id": "HST1",
        "property_id": "PROP1",
        "check_in_date": "2026-10-01",
        "check_out_date": "2026-10-02",
    }

    assert await booking_reminder._send_reminder(db, booking) is True
    assert await booking_reminder._send_checkout_reminder(db, booking) is True
    assert calls[0]["notification_type"] == NotificationType.BOOKING_REMINDER
    assert calls[0]["data"]["map_url"] == "https://www.google.com/maps?q=19.99,73.78"
    assert calls[1]["notification_type"] == NotificationType.GUEST_CHECKOUT_REMINDER


@pytest.mark.asyncio
async def test_stay_completed_accepts_whatsapp_success(monkeypatch):
    calls = []

    async def fake_send(**kwargs):
        calls.append(kwargs)
        return {"success": True, "results": {"whatsapp": {"success": True}, "email": {"success": False}}}

    monkeypatch.setattr("services.notification_service.send_multi_channel_notification", fake_send)
    db = SimpleNamespace(
        users=FindCollection({"GST1": {"user_id": "GST1", "full_name": "Guest"}}, "user_id"),
        properties=FindCollection({"PROP1": {"property_id": "PROP1", "title": "Villa"}}, "property_id"),
    )
    booking = {
        "booking_id": "BK1",
        "guest_id": "GST1",
        "property_id": "PROP1",
        "check_out_date": "2026-10-02",
    }

    assert await review_reminder._send_review_request(db, booking) is True
    assert calls[0]["notification_type"] == NotificationType.GUEST_STAY_COMPLETED


@pytest.mark.asyncio
async def test_subscription_success_trigger_uses_approved_template_type(monkeypatch):
    calls = []

    async def fake_send(**kwargs):
        calls.append(kwargs)
        return {"success": True, "results": {"whatsapp": {"success": True}}}

    monkeypatch.setattr("services.notification_service.send_multi_channel_notification", fake_send)
    db = SimpleNamespace(
        subscription_plans=FindCollection({"PLAN1": {"plan_id": "PLAN1", "plan_name": "Gold"}}, "plan_id")
    )
    subscription = {
        "subscription_id": "SUB1",
        "user_id": "HST1",
        "plan_id": "PLAN1",
        "start_date": "2026-10-01",
        "end_date": "2026-11-01",
        "amount": 5000,
    }

    await subscription_routes.send_subscription_success_whatsapp(db, subscription, "PAY1")

    assert calls[0]["notification_type"] == NotificationType.SUBSCRIPTION_SUCCESS
    assert calls[0]["data"]["plan_name"] == "Gold"
    assert calls[0]["data"]["transaction_id"] == "PAY1"


@pytest.mark.parametrize("remaining", [False, True])
@pytest.mark.asyncio
async def test_payment_failed_webhook_preserves_advance_payment(monkeypatch, remaining):
    notified = []

    async def fake_notify(db, booking, payment_id):
        notified.append((booking, payment_id))

    monkeypatch.delenv("RAZORPAY_WEBHOOK_SECRET", raising=False)
    monkeypatch.setattr(webhook_routes.razorpay_service, "environment_is_production", False)
    monkeypatch.setattr(booking_notifications, "notify_guest_payment_failed", fake_notify)
    booking = {
        "booking_id": "BK1",
        "razorpay_order_id": "ORDER_INITIAL",
        "remaining_payment_order_id": "ORDER_REMAINING",
        "payment_status": "partially_paid" if remaining else "pending",
        "remaining_amount": 750,
    }
    collection = WebhookBookingCollection(booking)
    db = SimpleNamespace(bookings=collection)
    order_id = "ORDER_REMAINING" if remaining else "ORDER_INITIAL"
    request = FakeWebhookRequest(
        {"event": "payment.failed", "payload": {"payment": {"entity": {"id": "PAY_FAILED", "order_id": order_id}}}}
    )

    result = await webhook_routes.razorpay_webhook(request, db)

    assert result["status"] == "processed"
    assert notified[0][1] == "PAY_FAILED"
    if remaining:
        assert collection.update["remaining_payment_status"] == "failed"
        assert "payment_status" not in collection.update
        assert notified[0][0]["notification_amount"] == 750
    else:
        assert collection.update["payment_status"] == "failed"
