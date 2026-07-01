from urllib.parse import parse_qs, urlparse

import pytest
from fastapi import HTTPException

from routes.auth_routes import (
    ForgotPasswordRequest,
    ResetPasswordRequest,
    _password_validation_error,
    forgot_password,
    reset_password,
)
from services.email_service import email_service
from utils.auth import verify_password


class FakeCollection:
    def __init__(self, documents=None):
        self.documents = list(documents or [])

    @staticmethod
    def _matches(document, query):
        return all(document.get(key) == value for key, value in query.items())

    async def find_one(self, query, projection=None):
        return next(
            (document for document in self.documents if self._matches(document, query)),
            None,
        )

    async def insert_one(self, document):
        self.documents.append(dict(document))

    async def update_one(self, query, update):
        document = await self.find_one(query)
        if document:
            document.update(update.get("$set", {}))
        return bool(document)

    async def update_many(self, query, update):
        updated = 0
        for document in self.documents:
            if self._matches(document, query):
                document.update(update.get("$set", {}))
                updated += 1
        return updated


class FakeDB:
    def __init__(self):
        self.users = FakeCollection([{
            "user_id": "user_reset_1",
            "email": "reset@example.com",
            "full_name": "Reset User",
            "role": "guest",
            "password_hash": "old-hash",
        }])
        self.password_reset_tokens = FakeCollection()


def test_password_policy_requires_all_character_classes():
    assert _password_validation_error("short")
    assert _password_validation_error("alllowercase1!")
    assert _password_validation_error("ALLUPPERCASE1!")
    assert _password_validation_error("NoNumber!")
    assert _password_validation_error("NoSpecial1")
    assert _password_validation_error("NoSpecial1 ")
    assert _password_validation_error("ValidPass1!") is None


@pytest.mark.asyncio
async def test_forgot_and_reset_password_end_to_end(monkeypatch):
    db = FakeDB()
    sent = {}

    def capture_email(to_email, template, data):
        sent.update({"to_email": to_email, "template": template, "data": data})
        return {"success": True}

    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://x-space360.in")
    monkeypatch.setattr(email_service, "send_template", capture_email)

    response = await forgot_password(
        ForgotPasswordRequest(email=" RESET@example.com "),
        db=db,
    )

    assert response["message"].startswith("If this email is registered")
    assert sent["to_email"] == "reset@example.com"
    assert sent["template"] == "password_reset"
    assert sent["data"]["request_date"] == sent["data"]["reset_request_time"]

    reset_url = sent["data"]["action_url"]
    token = parse_qs(urlparse(reset_url).query)["token"][0]
    stored_token = db.password_reset_tokens.documents[0]
    assert "token" not in stored_token
    assert stored_token["token_hash"] != token

    reset_response = await reset_password(
        ResetPasswordRequest(token=token, password="ValidPass1!"),
        db=db,
    )

    assert reset_response["login_path"] == "/login"
    assert verify_password("ValidPass1!", db.users.documents[0]["password_hash"])
    assert stored_token["used"] is True

    with pytest.raises(HTTPException) as exc:
        await reset_password(
            ResetPasswordRequest(token=token, password="AnotherPass2!"),
            db=db,
        )
    assert exc.value.status_code == 400
