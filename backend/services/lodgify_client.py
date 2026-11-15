"""Small, read-only client for Lodgify Public API v2."""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Any, Mapping

import httpx

logger = logging.getLogger(__name__)


class LodgifyConfigurationError(RuntimeError):
    pass


class LodgifyAPIError(RuntimeError):
    def __init__(self, message: str, *, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


class LodgifyClient:
    """Authenticated GET-only Lodgify client.

    The API key is intentionally never included in log or exception messages.
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        *,
        timeout: float = 20.0,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.api_key = (api_key or os.getenv("LODGIFY_API_KEY", "")).strip()
        self.base_url = (base_url or os.getenv("LODGIFY_BASE_URL", "https://api.lodgify.com/v2")).strip().rstrip("/")
        self.timeout = timeout
        self.transport = transport
        if not self.api_key:
            raise LodgifyConfigurationError("LODGIFY_API_KEY is not configured")
        if self.base_url != "https://api.lodgify.com/v2":
            logger.warning("Using a non-default Lodgify API base URL")

    async def _get(self, path: str, params: Mapping[str, Any] | None = None) -> Any:
        clean_params = {key: value for key, value in (params or {}).items() if value is not None and value != ""}
        headers = {"X-ApiKey": self.api_key, "Accept": "application/json"}
        url = f"{self.base_url}/{path.lstrip('/')}"

        for attempt in range(3):
            try:
                async with httpx.AsyncClient(
                    headers=headers,
                    timeout=self.timeout,
                    transport=self.transport,
                ) as client:
                    response = await client.get(url, params=clean_params)
            except (httpx.TimeoutException, httpx.NetworkError) as exc:
                if attempt < 2:
                    await asyncio.sleep(0.25 * (2**attempt))
                    continue
                raise LodgifyAPIError("Lodgify is temporarily unreachable") from exc

            if response.status_code in {429, 500, 502, 503, 504} and attempt < 2:
                await asyncio.sleep(0.25 * (2**attempt))
                continue
            if response.status_code == 401:
                raise LodgifyAPIError("Lodgify rejected the configured API key", status_code=401)
            if response.status_code == 403:
                raise LodgifyAPIError("The Lodgify account does not permit this operation", status_code=403)
            if response.is_error:
                logger.warning("Lodgify GET %s failed with HTTP %s", path, response.status_code)
                raise LodgifyAPIError(
                    f"Lodgify request failed with HTTP {response.status_code}",
                    status_code=response.status_code if response.status_code < 500 else 502,
                )
            try:
                return response.json()
            except ValueError as exc:
                raise LodgifyAPIError("Lodgify returned an invalid JSON response") from exc

        raise LodgifyAPIError("Lodgify request failed")

    async def list_properties(self, *, page: int = 1, size: int = 50, include_count: bool = True) -> dict[str, Any]:
        return await self._get(
            "/properties",
            {"page": page, "size": min(size, 50), "includeCount": include_count},
        )

    async def list_bookings(
        self,
        *,
        page: int = 1,
        size: int = 50,
        stay_filter: str = "All",
        updated_since: str | None = None,
    ) -> dict[str, Any]:
        return await self._get(
            "/reservations/bookings",
            {
                "page": page,
                "size": min(size, 50),
                "stayFilter": stay_filter,
                "updatedSince": updated_since,
                "includeCount": True,
            },
        )

    async def get_availability(self, property_id: int, *, start: str, end: str) -> Any:
        return await self._get(f"/availability/{property_id}", {"start": start, "end": end})

    async def get_rates(
        self,
        *,
        property_id: int,
        room_type_id: int,
        start_date: str,
        end_date: str,
    ) -> Any:
        return await self._get(
            "/rates/calendar",
            {
                "houseId": property_id,
                "roomTypeId": room_type_id,
                "startDate": start_date,
                "endDate": end_date,
            },
        )
