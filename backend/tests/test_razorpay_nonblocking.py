import asyncio
import time

import requests

from services.razorpay_service import RazorpayService, _TimeoutSession


def test_timeout_session_adds_default_timeout(monkeypatch):
    captured = {}

    def fake_request(self, method, url, **kwargs):
        captured.update(kwargs)
        return object()

    monkeypatch.setattr(requests.Session, "request", fake_request)
    session = _TimeoutSession(3.05, 10)
    session.request("GET", "https://example.invalid")

    assert captured["timeout"] == (3.05, 10)


def test_call_async_does_not_block_event_loop(monkeypatch):
    service = RazorpayService()

    def slow_operation():
        time.sleep(0.05)
        return {"success": True}

    monkeypatch.setattr(service, "slow_operation", slow_operation, raising=False)

    async def scenario():
        task = asyncio.create_task(service.call_async("slow_operation"))
        started = time.perf_counter()
        await asyncio.sleep(0.01)
        event_loop_delay = time.perf_counter() - started
        result = await task
        return event_loop_delay, result

    delay, result = asyncio.run(scenario())
    assert delay < 0.04
    assert result == {"success": True}


def test_call_async_returns_controlled_timeout(monkeypatch):
    service = RazorpayService()
    monkeypatch.setenv("RAZORPAY_ASYNC_TIMEOUT_SECONDS", "0.01")

    def stuck_operation():
        time.sleep(0.1)
        return {"success": True}

    monkeypatch.setattr(service, "stuck_operation", stuck_operation, raising=False)
    result = asyncio.run(service.call_async("stuck_operation"))

    assert result["success"] is False
    assert "timed out" in result["error"]
