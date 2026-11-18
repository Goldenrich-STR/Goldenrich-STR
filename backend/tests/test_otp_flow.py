"""OTP regressions without a database, real Redis, or SMS delivery."""
import time
from unittest.mock import Mock

import pytest
from fastapi import HTTPException

from routes import auth_routes
from services.otp_service import OTPService


@pytest.fixture
def otp_flow(monkeypatch):
    service = OTPService.__new__(OTPService)
    service.redis_client = None
    service.otp_storage = {}
    service.otp_expiry = 300
    service.max_attempts = 2
    service.resend_cooldown = 30
    service.max_sends = 3
    monkeypatch.setenv("MSG91_DEMO_MODE", "false")
    monkeypatch.setattr(auth_routes, "otp_service", service)
    delivery = Mock(return_value={"success": True, "demo_mode": False})
    monkeypatch.setattr(auth_routes.msg91_service, "send_otp_sms", delivery)
    return service, delivery


@pytest.mark.asyncio
async def test_phone_formats_share_one_otp_and_success_is_single_use(otp_flow):
    service, delivery = otp_flow
    sent = await auth_routes.send_otp(auth_routes.SendOTPRequest(phone="9876543210"))
    assert sent["expires_in"] == 300
    assert "otp" not in sent
    assert sent["phone"] == "+919876543210"
    delivery.assert_called_once()
    phone, code = delivery.call_args.args
    request = auth_routes.VerifyOTPRequest(phone="+91 98765 43210", otp=code)
    assert (await auth_routes.verify_otp(request))["verified"] is True
    with pytest.raises(HTTPException) as error:
        await auth_routes.verify_otp(request)
    assert error.value.status_code == 410


@pytest.mark.asyncio
async def test_expired_otp_returns_410(otp_flow):
    service, delivery = otp_flow
    await auth_routes.send_otp(auth_routes.SendOTPRequest(phone="9876543210"))
    key = service._get_otp_key("+919876543210", "registration")
    code, _ = service.otp_storage[key]
    service.otp_storage[key] = (code, time.time() - 1)
    with pytest.raises(HTTPException) as error:
        await auth_routes.verify_otp(
            auth_routes.VerifyOTPRequest(phone="9876543210", otp=code)
        )
    assert error.value.status_code == 410


@pytest.mark.asyncio
async def test_wrong_codes_lock_and_resend_resets_attempts(otp_flow):
    service, delivery = otp_flow
    await auth_routes.send_otp(auth_routes.SendOTPRequest(phone="9876543210"))
    code = delivery.call_args.args[1]
    wrong = "000000" if code != "000000" else "111111"
    for _ in range(2):
        with pytest.raises(HTTPException) as error:
            await auth_routes.verify_otp(
                auth_routes.VerifyOTPRequest(phone="9876543210", otp=wrong)
            )
        assert error.value.status_code == 400
    with pytest.raises(HTTPException) as error:
        await auth_routes.verify_otp(
            auth_routes.VerifyOTPRequest(phone="9876543210", otp=code)
        )
    assert error.value.status_code == 429
    service._mem_delete(service._get_resend_key("+919876543210", "registration"))
    await auth_routes.send_otp(auth_routes.SendOTPRequest(phone="+919876543210"))
    new_code = delivery.call_args.args[1]
    assert (await auth_routes.verify_otp(
        auth_routes.VerifyOTPRequest(phone="9876543210", otp=new_code)
    ))["verified"] is True


@pytest.mark.asyncio
async def test_failed_sms_is_not_reported_as_sent(otp_flow):
    _, delivery = otp_flow
    delivery.return_value = {"success": False, "error": "gateway unavailable"}
    with pytest.raises(HTTPException) as error:
        await auth_routes.send_otp(auth_routes.SendOTPRequest(phone="9876543210"))
    assert error.value.status_code == 502


@pytest.mark.asyncio
async def test_invalid_phone_rejected_without_delivery(otp_flow):
    _, delivery = otp_flow
    with pytest.raises(HTTPException) as error:
        await auth_routes.send_otp(auth_routes.SendOTPRequest(phone="invalid"))
    assert error.value.status_code == 400
    delivery.assert_not_called()


@pytest.mark.asyncio
async def test_resend_cooldown_is_preserved(otp_flow):
    _, delivery = otp_flow
    await auth_routes.send_otp(auth_routes.SendOTPRequest(phone="9876543210"))
    with pytest.raises(HTTPException) as error:
        await auth_routes.send_otp(auth_routes.SendOTPRequest(phone="+919876543210"))
    assert error.value.status_code == 429
    assert int(error.value.headers["Retry-After"]) > 0
    delivery.assert_called_once()
