import asyncio
import copy
from datetime import datetime, timezone, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock
import pytest
from fastapi import HTTPException
from services.refund_policy_quote import quote_refund
from services.refund_workflow import request_cancellation, approve_request, reject_request
from services.razorpay_service import razorpay_service


def matches(row, query):
    for key, value in query.items():
        actual = row.get(key)
        if isinstance(value, dict):
            if '$in' in value and actual not in value['$in']: return False
            if '$nin' in value and actual in value['$nin']: return False
            if '$ne' in value and actual == value['$ne']: return False
        elif actual != value: return False
    return True


class Cursor:
    def __init__(self, rows): self.rows = rows
    def sort(self, *args): return self
    def limit(self, *args): return self
    async def to_list(self, length=None): return copy.deepcopy(self.rows[:length])


class Collection:
    def __init__(self, rows=()): self.rows = list(copy.deepcopy(rows)); self.lock = asyncio.Lock()
    async def find_one(self, query, projection=None): return copy.deepcopy(next((r for r in self.rows if matches(r, query)), None))
    def find(self, query, projection=None): return Cursor([r for r in self.rows if matches(r, query)])
    async def insert_one(self, row): self.rows.append(copy.deepcopy(row))
    async def update_one(self, query, update, **kwargs):
        for row in self.rows:
            if matches(row, query): row.update(copy.deepcopy(update.get('$set', {}))); return
    async def find_one_and_update(self, query, update):
        async with self.lock:
            before = await self.find_one(query)
            if before: await self.update_one(query, update)
            return before
    async def delete_many(self, query): self.rows[:] = [r for r in self.rows if not matches(r, query)]


def fixture():
    now = datetime.now(timezone.utc)
    booking = {'booking_id': 'BOOK', 'property_id': 'PROP', 'guest_id': 'guest', 'host_id': 'host',
        'booking_status': 'confirmed', 'payment_status': 'paid', 'total_amount': 11200,
        'paid_amount': 11200, 'base_amount': 10000, 'host_actual_value': 10000,
        'service_fee': 1000, 'payment_gateway_charge': 200, 'taxes': 0,
        'created_at': now - timedelta(minutes=10), 'check_in_date': (now + timedelta(days=1)).date().isoformat(),
        'razorpay_payment_id': 'pay_original'}
    db = SimpleNamespace(bookings=Collection([booking]), properties=Collection([{'property_id': 'PROP', 'check_in_time': '12:00'}]),
        refunds=Collection(), transactions=Collection(), users=Collection(), audit_logs=Collection(),
        blocked_dates=Collection([{'source': 'booking', 'source_id': 'BOOK'}]),
        payouts=Collection([{'payout_id': 'PAYOUT', 'booking_id': 'BOOK', 'status': 'pending', 'net_amount': 1000000}]),
        commissions=Collection([{'commission_id': 'COM', 'booking_id': 'BOOK', 'status': 'pending', 'net_amount': 5000}]))
    return db, booking


def run(coro): return asyncio.run(coro)


@pytest.mark.parametrize('kind', ['guest', 'host', 'property_unavailable'])
def test_all_full_refunds_exclude_non_refundable_charges(kind):
    _, booking = fixture()
    quote = quote_refund(booking, {'check_in_time': '12:00'}, cancellation_type=kind)
    assert quote['refund_amount'] == 1000000
    assert quote['non_refundable_amount'] == 120000
    assert quote['refund_percent'] == 100


def test_tax_is_retained_and_admin_cannot_refund_non_refundable_fees():
    _, booking = fixture()
    booking.update(total_amount=13216, paid_amount=13216, taxes=2016)
    quote = quote_refund(booking, override_percent=100)
    assert quote['refund_amount'] == 1000000
    assert quote['non_refundable_amount'] == 321600
    with pytest.raises(ValueError): quote_refund(booking, override_amount=1000001)


def test_partial_payment_refund_never_exceeds_captured_amount_less_fees():
    _, booking = fixture()
    booking.update(paid_amount=5000, payment_status='partially_paid')
    assert quote_refund(booking)['refund_amount'] == 380000


def test_request_keeps_booking_and_calendar_reserved_and_is_idempotent():
    async def scenario():
        db, booking = fixture()
        first, second = await asyncio.gather(*[request_cancellation(db, booking, {'user_id': 'guest', 'role': 'guest'}, reason='Plans changed') for _ in range(2)])
        assert first['refund_id'] == second['refund_id']
        assert len(db.refunds.rows) == 1
        assert db.bookings.rows[0]['booking_status'] == 'confirmed'
        assert db.bookings.rows[0]['settlement_hold'] is True
        assert db.blocked_dates.rows
        assert not db.transactions.rows
    run(scenario())


def test_reject_restores_booking_hold_without_gateway_call():
    async def scenario():
        db, booking = fixture()
        request = await request_cancellation(db, booking, {'user_id': 'guest', 'role': 'guest'}, reason='Plans changed')
        await reject_request(db, refund_id=request['refund_id'], rejected_by='admin', reason='Request rejected')
        assert db.bookings.rows[0]['booking_status'] == 'confirmed'
        assert db.bookings.rows[0]['settlement_hold'] is False
        assert db.blocked_dates.rows
        assert not db.transactions.rows
    run(scenario())


@pytest.fixture
def gateway(monkeypatch):
    calls = []
    async def call(method, *args, **kwargs):
        calls.append((method, args, kwargs))
        if method == 'fetch_payment': return {'success': True, 'payment': {'id': args[0], 'status': 'captured', 'amount': 1120000}}
        if method == 'create_refund': return {'success': True, 'refund': {'id': 'rfnd_' + kwargs['payment_id'], 'payment_id': kwargs['payment_id'], 'amount': kwargs['amount'], 'status': 'processed'}}
        raise AssertionError(method)
    monkeypatch.setattr(razorpay_service, 'call_async', call)
    from services import account_service
    async def credit(db, refund, booking): return {**refund.model_dump(), 'credit_note_no': 'TEST-CREDIT'}
    monkeypatch.setattr(account_service, 'build_credit_note_refund_doc', credit)
    return calls


def test_approval_cancels_and_processes_once_even_concurrently(gateway):
    async def scenario():
        db, booking = fixture()
        request = await request_cancellation(db, booking, {'user_id': 'guest', 'role': 'guest'}, reason='Plans changed')
        await asyncio.gather(*[approve_request(db, refund_id=request['refund_id'], approved_by='admin', reason='Verified policy eligibility') for _ in range(2)])
        assert db.bookings.rows[0]['booking_status'] == 'cancelled'
        assert not db.blocked_dates.rows
        assert db.refunds.rows[0]['status'] == 'processed'
        assert len([c for c in gateway if c[0] == 'create_refund']) == 1
        assert len(db.transactions.rows) == 1
        assert db.transactions.rows[0]['amount'] == 1000000
        assert db.refunds.rows[0]['non_refundable_amount'] == 120000
    run(scenario())


def test_provider_pending_is_not_processed_or_credited(monkeypatch, gateway):
    original = razorpay_service.call_async
    async def call(method, *args, **kwargs):
        result = await original(method, *args, **kwargs)
        if method == 'create_refund': result['refund']['status'] = 'pending'
        return result
    monkeypatch.setattr(razorpay_service, 'call_async', call)
    async def scenario():
        db, booking = fixture()
        request = await request_cancellation(db, booking, {'user_id': 'guest', 'role': 'guest'}, reason='Plans changed')
        result = await approve_request(db, refund_id=request['refund_id'], approved_by='admin', reason='Verified eligibility')
        assert result['status'] == 'processing'
        assert not db.transactions.rows
        assert not result.get('credit_note_no')
    run(scenario())


def test_advance_and_balance_refund_to_both_original_sources(gateway):
    async def scenario():
        db, booking = fixture()
        booking.update(advance_amount=5000, remaining_razorpay_payment_id='pay_balance')
        db.bookings.rows[0].update(booking)
        request = await request_cancellation(db, booking, {'user_id': 'guest', 'role': 'guest'}, reason='Plans changed')
        result = await approve_request(db, refund_id=request['refund_id'], approved_by='admin', reason='Verified eligibility')
        calls = [c[2] for c in gateway if c[0] == 'create_refund']
        assert {c['payment_id'] for c in calls} == {'pay_original', 'pay_balance'}
        assert sum(c['amount'] for c in calls) == 1000000
        assert len({c['idempotency_key'] for c in calls}) == 2
        assert result['status'] == 'processed'
        assert len(db.transactions.rows) == 2
        assert sum(row['amount'] for row in db.transactions.rows) == 1000000
    run(scenario())


def test_processed_legacy_decision_is_not_recomputed(gateway):
    async def scenario():
        db, _ = fixture()
        db.refunds.rows.append({'refund_id': 'old', 'booking_id': 'BOOK', 'refund_amount': 12345, 'status': 'processed'})
        result = await approve_request(db, refund_id='old', approved_by='admin', reason='Legacy decision')
        assert result['refund_amount'] == 12345
        assert not gateway
    run(scenario())


def test_guest_cannot_claim_host_cancellation_exception():
    async def scenario():
        db, booking = fixture()
        with pytest.raises(HTTPException):
            await request_cancellation(db, booking, {'user_id': 'guest', 'role': 'guest'}, reason='Plans changed', cancellation_type='host')
        assert not db.refunds.rows
    run(scenario())


def test_existing_booking_new_request_uses_new_matrix_and_keeps_fees():
    _, booking = fixture()
    booking['created_at'] = datetime.now(timezone.utc) - timedelta(days=10)
    booking['check_in_date'] = (datetime.now(timezone.utc) + timedelta(days=4)).date().isoformat()
    quote = quote_refund(booking)
    assert quote['refund_policy_version'] == 'management_refund_20261120'
    assert quote['refund_amount'] == 500000
    assert quote['non_refundable_amount'] == 120000


def test_host_cancel_zeroes_unpaid_settlements_and_keeps_paid_history(gateway):
    async def scenario():
        db, booking = fixture()
        db.commissions.rows.append({'commission_id': 'PAID-COM', 'booking_id': 'BOOK', 'status': 'paid', 'net_amount': 9000})
        request = await request_cancellation(db, booking, {'user_id': 'host', 'role': 'host'}, reason='Property unavailable', cancellation_type='host')
        await approve_request(db, refund_id=request['refund_id'], approved_by='admin', reason='Host cancellation verified')
        assert db.payouts.rows[0]['net_amount'] == 0
        assert db.payouts.rows[0]['original_net_before_cancellation'] == 1000000
        assert db.commissions.rows[1]['net_amount'] == 9000
        assert db.commissions.rows[1]['status'] == 'paid'
        assert db.refunds.rows[0]['settlement_recovery_items'][0]['status'] == 'requires_reconciliation'
    run(scenario())


def test_timeout_retry_uses_identical_idempotency_key_and_body(monkeypatch, gateway):
    original = razorpay_service.call_async
    sent = []
    async def call(method, *args, **kwargs):
        if method == 'create_refund':
            sent.append(copy.deepcopy(kwargs))
            if len(sent) == 1: return {'success': False, 'error': 'timeout after provider acceptance'}
        return await original(method, *args, **kwargs)
    monkeypatch.setattr(razorpay_service, 'call_async', call)
    async def scenario():
        db, booking = fixture()
        request = await request_cancellation(db, booking, {'user_id': 'guest', 'role': 'guest'}, reason='Plans changed')
        first = await approve_request(db, refund_id=request['refund_id'], approved_by='admin', reason='Eligibility verified')
        assert first['status'] == 'processing'
        assert not db.transactions.rows
        db.refunds.rows[0]['gateway_attempted_at'] = datetime.now(timezone.utc) - timedelta(minutes=3)
        second = await approve_request(db, refund_id=request['refund_id'], approved_by='admin', reason='Checking original request')
        assert second['status'] == 'processed'
        assert sent[0] == sent[1]
        assert len(db.transactions.rows) == 1
    run(scenario())


def test_no_refund_never_calls_gateway_or_creates_credit_note(gateway):
    async def scenario():
        db, booking = fixture()
        booking['created_at'] = datetime.now(timezone.utc) - timedelta(days=5)
        db.bookings.rows[0].update(booking)
        request = await request_cancellation(db, booking, {'user_id': 'guest', 'role': 'guest'}, reason='Plans changed')
        result = await approve_request(db, refund_id=request['refund_id'], approved_by='admin', reason='No refund under policy')
        assert result['refund_amount'] == 0
        assert not gateway
        assert not db.transactions.rows
        assert not result.get('credit_note_no')
    run(scenario())


def test_missing_original_payment_reference_is_not_marked_success(gateway):
    async def scenario():
        db, booking = fixture()
        booking.pop('razorpay_payment_id')
        request = await request_cancellation(db, booking, {'user_id': 'guest', 'role': 'guest'}, reason='Plans changed')
        result = await approve_request(db, refund_id=request['refund_id'], approved_by='admin', reason='Eligibility verified')
        assert result['status'] == 'failed'
        assert not db.transactions.rows
        assert not gateway
    run(scenario())


def test_late_capture_requires_reconciliation_at_original_request_time(gateway):
    from services.refund_workflow import reconcile_pending_quote
    async def scenario():
        db, booking = fixture()
        booking.update(paid_amount=5000, payment_status='partially_paid')
        db.bookings.rows[0].update(booking)
        request = await request_cancellation(db, booking, {'user_id': 'guest', 'role': 'guest'}, reason='Plans changed')
        db.bookings.rows[0].update(paid_amount=11200, payment_status='paid')
        with pytest.raises(ValueError, match='further payment'):
            await approve_request(db, refund_id=request['refund_id'], approved_by='admin', reason='Eligibility verified')
        revised = await reconcile_pending_quote(db, request['refund_id'], {'user_id': 'admin'}, 'Reconciled late capture')
        assert revised['refund_requested_at'] == request['refund_requested_at']
        assert revised['refund_amount'] == 1000000
        assert revised['non_refundable_amount'] == 120000
    run(scenario())


@pytest.mark.parametrize('value', ['NaN', 'Infinity', '-1', 'invalid'])
def test_invalid_money_fails_closed(value):
    _, booking = fixture()
    booking['total_amount'] = value
    with pytest.raises(ValueError): quote_refund(booking)


def test_pending_cancellation_blocks_direct_payout_api(gateway):
    from services.account_service import process_payout
    async def scenario():
        db, _ = fixture()
        db.bookings.rows[0]['cancellation_status'] = 'requested'
        db.payouts.rows[0].update(host_id='host', property_id='PROP', gross_amount=1000000, platform_fee=100000,
                                 destination_type='upi', destination_ref='masked', status='eligible')
        with pytest.raises(ValueError, match='on hold'):
            await process_payout(db, 'PAYOUT', 'admin')
        assert not gateway
    run(scenario())


def test_pending_cancellation_blocks_partner_approval():
    from routes.admin_account_routes import save_partner_settlement_decision, PartnerSettlementDecisionRequest
    async def scenario():
        db, _ = fixture()
        db.bookings.rows[0]['cancellation_status'] = 'requested'
        with pytest.raises(HTTPException) as exc:
            await save_partner_settlement_decision(PartnerSettlementDecisionRequest(settlement_id='EMP-BOOK', role='employee', status='approved', booking_id='BOOK'), {'user_id': 'admin'}, db)
        assert exc.value.status_code == 400
    run(scenario())


def test_guest_review_window_and_ownership():
    from routes.booking_routes import request_refund_review, CancellationRequest
    async def scenario():
        db, _ = fixture()
        db.bookings.rows[0].update(booking_status='cancelled', cancelled_at=datetime.now(timezone.utc) - timedelta(days=8))
        db.refunds.rows.append({'refund_id': 'R', 'booking_id': 'BOOK', 'status': 'processed'})
        with pytest.raises(HTTPException, match='7-day'):
            await request_refund_review('BOOK', CancellationRequest(reason='Please review'), {'user_id': 'guest'}, db)
        db.bookings.rows[0]['cancelled_at'] = datetime.now(timezone.utc) - timedelta(days=1)
        await request_refund_review('BOOK', CancellationRequest(reason='Please review'), {'user_id': 'guest'}, db)
        assert db.refunds.rows[0]['review_status'] == 'requested'
        with pytest.raises(HTTPException) as exc:
            await request_refund_review('BOOK', CancellationRequest(reason='Please review'), {'user_id': 'another-guest'}, db)
        assert exc.value.status_code == 404
    run(scenario())


def test_signed_gateway_callback_finalizes_once(monkeypatch, gateway):
    import json, hmac, hashlib
    from starlette.requests import Request
    from routes.webhook_routes import razorpay_webhook
    secret = 'isolated-webhook-secret'
    monkeypatch.setenv('RAZORPAY_WEBHOOK_SECRET', secret)
    original = razorpay_service.call_async
    async def call(method, *args, **kwargs):
        if method == 'fetch_refund':
            return {'success': True, 'refund': {'id': args[0], 'payment_id': 'pay_original', 'amount': 1000000, 'status': 'processed'}}
        result = await original(method, *args, **kwargs)
        if method == 'create_refund': result['refund']['status'] = 'pending'
        return result
    monkeypatch.setattr(razorpay_service, 'call_async', call)
    def request(body, valid=True):
        raw = json.dumps(body).encode()
        signature = hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest() if valid else 'invalid'
        async def receive(): return {'type': 'http.request', 'body': raw, 'more_body': False}
        return Request({'type': 'http', 'method': 'POST', 'path': '/api/webhooks/razorpay',
                        'headers': [(b'x-razorpay-signature', signature.encode())]}, receive)
    async def scenario():
        db, booking = fixture()
        refund = await request_cancellation(db, booking, {'user_id': 'guest', 'role': 'guest'}, reason='Plans changed')
        await approve_request(db, refund_id=refund['refund_id'], approved_by='admin', reason='Eligibility verified')
        payload = {'event': 'refund.processed', 'payload': {'refund': {'entity': {'id': 'rfnd_pay_original',
            'payment_id': 'pay_original', 'amount': 1000000, 'status': 'processed', 'notes': {'refund_id': refund['refund_id']}}}}}
        with pytest.raises(HTTPException): await razorpay_webhook(request(payload, False), db)
        assert not db.transactions.rows
        await razorpay_webhook(request(payload), db)
        await razorpay_webhook(request(payload), db)
        assert len(db.transactions.rows) == 1
        assert db.refunds.rows[0]['status'] == 'processed'
    run(scenario())


def test_existing_mobile_no_body_cancel_request_remains_compatible():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routes import booking_routes
    from middleware.auth_middleware import get_current_user
    db, _ = fixture()
    app = FastAPI()
    app.include_router(booking_routes.router)
    app.dependency_overrides[booking_routes.get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: {'user_id': 'guest', 'role': 'guest'}
    with TestClient(app) as client:
        response = client.post('/bookings/BOOK/cancel')
        assert response.status_code == 200, response.text
        assert response.json()['cancellation_status'] == 'requested'
        assert db.bookings.rows[0]['booking_status'] == 'confirmed'


def test_new_policy_cancel_retains_collected_non_refundable_tax():
    from services.finance_reporting import paid_booking_totals
    async def scenario():
        db, _ = fixture()
        db.bookings.rows[0].update(booking_status='cancelled', taxes=1980,
            cancellation_quote={'refund_policy_version': 'management_refund_20261120'})
        totals = await paid_booking_totals(db)
        assert totals['gst_paise'] == 198000
        db.bookings.rows[0]['cancellation_quote'] = {}
        legacy = await paid_booking_totals(db)
        assert legacy['gst_paise'] == 0, 'Do not silently reclassify historical cancellation reports'
    run(scenario())


def test_postgres_claim_for_pre_policy_booking_matches_missing_status(monkeypatch):
    from utils.pg_adapter import PGCursor
    from services import refund_workflow
    original = refund_workflow.claim
    queries = []
    async def traced(collection, query, fields):
        queries.append(query)
        return await original(collection, query, fields)
    monkeypatch.setattr(refund_workflow, 'claim', traced)
    async def scenario():
        db, booking = fixture()
        await request_cancellation(db, booking, {'user_id': 'guest', 'role': 'guest'}, reason='Plans changed')
        where, _ = PGCursor('bookings', queries[0], None, None)._build_where(queries[0])
        assert "data->>'cancellation_status' IS NULL" in where
    run(scenario())


def test_policy_text_about_fees_is_not_a_non_refundable_rate():
    _, booking = fixture()
    booking['refund_policy'] = 'Bookings refundable; payment gateway fees are non-refundable.'
    booking['cancellation_reason'] = 'I do not want to be a no show'
    assert quote_refund(booking)['refund_amount'] == 1000000
    booking['rate_type'] = 'non_refundable'
    assert quote_refund(booking)['refund_amount'] == 0
    assert quote_refund(booking)['cancellation_allowed'] is False
