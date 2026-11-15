import asyncio

import httpx
import pytest

from services.lodgify_client import LodgifyAPIError, LodgifyClient


def test_client_uses_api_key_and_expected_properties_route():
    async def handler(request: httpx.Request):
        assert request.headers["X-ApiKey"] == "test-key"
        assert request.url.path == "/v2/properties"
        assert request.url.params["page"] == "1"
        assert request.url.params["size"] == "50"
        return httpx.Response(200, json={"items": [{"id": 1, "name": "Demo"}], "count": 1})

    result = asyncio.run(
        LodgifyClient(
            api_key="test-key",
            transport=httpx.MockTransport(handler),
        ).list_properties()
    )

    assert result["count"] == 1


def test_client_does_not_leak_key_on_auth_failure():
    async def handler(_: httpx.Request):
        return httpx.Response(401, json={"message": "bad key"})

    with pytest.raises(LodgifyAPIError) as error:
        asyncio.run(
            LodgifyClient(
                api_key="super-secret",
                transport=httpx.MockTransport(handler),
            ).list_properties()
        )

    assert "super-secret" not in str(error.value)
    assert error.value.status_code == 401
