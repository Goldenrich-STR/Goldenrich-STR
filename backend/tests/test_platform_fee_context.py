import asyncio

import pytest

from routes.booking_routes import _resolve_platform_fee_context
from routes.property_routes import _property_platform_fee_context


class _Users:
    def __init__(self, users=None):
        self.users = users or {}

    async def find_one(self, query, projection=None):
        return self.users.get(query.get("user_id"))


class _Db:
    def __init__(self, users=None):
        self.users = _Users(users)


RESOLVERS = (_resolve_platform_fee_context, _property_platform_fee_context)


@pytest.mark.parametrize("resolver", RESOLVERS)
def test_explicit_first_verification_role_has_priority(resolver):
    db = _Db()
    assert asyncio.run(resolver(db, {"first_verification_role": "broker", "rm_id": "rm-1"})) == "broker_mapped"
    assert asyncio.run(resolver(db, {"first_verification_role": "relationship manager", "broker_id": "broker-1"})) == "rm_mapped"


@pytest.mark.parametrize("resolver", RESOLVERS)
def test_rm_mapping_beats_generic_owner_lg_code(resolver):
    db = _Db()
    prop = {"rm_id": "rm-1"}
    owner = {"lg_code": "generic-owner-code"}
    assert asyncio.run(resolver(db, prop, owner)) == "rm_mapped"


@pytest.mark.parametrize("resolver", RESOLVERS)
def test_first_verifier_database_role_is_used(resolver):
    db = _Db({
        "broker-1": {"role": "broker"},
        "rm-1": {"role": "employee", "admin_role_key": "rm"},
    })
    assert asyncio.run(resolver(db, {"broker_id": "broker-1", "rm_id": "rm-1"})) == "broker_mapped"
    assert asyncio.run(resolver(db, {"broker_id": "rm-1"})) == "rm_mapped"
