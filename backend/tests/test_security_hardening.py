import socket

import pytest
from fastapi import HTTPException

from routes.upload_routes import _download_remote_image, _validate_public_http_url
from utils.auth import create_access_token, decode_access_token
from utils.pg_adapter import _safe_identifier, _safe_json_field


def test_remote_image_fetch_rejects_loopback_and_private_addresses():
    for url in (
        "http://127.0.0.1/image.jpg",
        "http://10.0.0.5/image.jpg",
        "http://169.254.169.254/latest/meta-data/",
        "http://[::1]/image.jpg",
    ):
        with pytest.raises(ValueError, match="Private or local"):
            _validate_public_http_url(url)


def test_remote_image_fetch_allows_only_global_http_destinations(monkeypatch):
    monkeypatch.setattr(
        socket,
        "getaddrinfo",
        lambda *args, **kwargs: [
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 443))
        ],
    )
    assert _validate_public_http_url("https://example.com/image.jpg").startswith("https://")

    with pytest.raises(ValueError, match=r"HTTP\(S\)"):
        _validate_public_http_url("file:///etc/passwd")
    with pytest.raises(ValueError, match="credentials"):
        _validate_public_http_url("https://user:password@example.com/image.jpg")


def test_remote_image_download_rejects_private_url_before_network_access():
    with pytest.raises(HTTPException) as exc:
        _download_remote_image("http://127.0.0.1/image.jpg")
    assert exc.value.status_code == 400


def test_pyjwt_tokens_round_trip_and_invalid_tokens_are_rejected():
    token = create_access_token({"sub": "security-test", "role": "admin"})
    payload = decode_access_token(token)
    assert payload["sub"] == "security-test"
    assert payload["role"] == "admin"
    assert decode_access_token("not-a-valid-token") is None


def test_postgres_adapter_rejects_unsafe_dynamic_identifiers():
    assert _safe_identifier("booking_tax_slabs") == "booking_tax_slabs"
    assert _safe_json_field("verification.broker_id") == "verification.broker_id"
    for value in ("users; DROP TABLE users", 'users"', "../users", "field->value"):
        with pytest.raises(ValueError):
            _safe_identifier(value)
        with pytest.raises(ValueError):
            _safe_json_field(value)
