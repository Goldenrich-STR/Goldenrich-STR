"""Cancellation review and original-source refunds. No automatic money movement."""
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from fastapi import HTTPException
from services.refund_atomic import claim
from services.refund_policy_quote import quote_refund, aware
from services.refund_policy_timing import POLICY_VERSION
from services.audit_service import write_audit_log


async def request_cancellation(db, booking, actor, *, reason, cancellation_type='guest', override_amount=None, override_percent=None):
    from services.account_service import create_refund_request, is_paid_booking
    if not reason or len(reason.strip()) < 3:
        raise ValueError('A cancellation reason of at least 3 characters is required')
    role = actor.get('role') or 'guest'
    if role != 'admin' and actor['user_id'] not in {booking.get('guest_id'), booking.get('host_id')}:
        raise HTTPException(403, 'Not authorized')
    if role != 'admin' and (override_amount is not None or override_percent is not None):
        raise HTTPException(403, 'Only admin can approve policy exceptions')
    if role != 'admin' and cancellation_type != ('host' if actor['user_id'] == booking.get('host_id') else 'guest'):
        raise HTTPException(403, 'Invalid cancellation source')
    existing = await db.refunds.find_one({'booking_id': booking['booking_id'], 'status': {'$nin': ['rejected']}})
    if existing:
        return existing
    if booking.get('booking_status') not in {'confirmed', 'awaiting_host_approval', 'soft_lock', 'pending', 'completed'}:
        raise ValueError('This booking cannot be submitted for cancellation review')
    property_row = await db.properties.find_one({'property_id': booking.get('property_id')}, {'_id': 0}) or {}
    quote = quote_refund(booking, property_row, cancellation_type=cancellation_type,
                         override_amount=override_amount, override_percent=override_percent)
    if not quote['cancellation_allowed'] and role != 'admin':
        raise ValueError('This booking cannot be cancelled normally. Contact support for an approved exception.')
    request_id = f"rfd_{uuid4().hex.upper()}"
    fields = {'cancellation_status': 'requested', 'cancellation_request_id': request_id,
              'cancellation_requested_at': quote['refund_requested_at'],
              'cancellation_reason': reason.strip(), 'cancellation_type': cancellation_type,
              'cancellation_quote': quote, 'settlement_hold': True,
              'cancellation_request_claimed_at': datetime.now(timezone.utc),
              'cancellation_initiated_by': actor['user_id'], 'cancellation_initiated_by_role': role}
    if cancellation_type == 'fraud':
        fields['fraud_verified'] = True
    if cancellation_type == 'no_show':
        fields['no_show'] = True
    # Compare the prior value explicitly. The PG JSON adapter's $nin excludes
    # missing/null fields, which every pre-policy booking initially has.
    before = None if booking.get('cancellation_status') in {'requested', 'approved'} else await claim(
        db.bookings, {'booking_id': booking['booking_id'], 'cancellation_status': booking.get('cancellation_status')}, fields)
    if not before:
        current = await db.bookings.find_one({'booking_id': booking['booking_id']}) or {}
        request_id = current.get('cancellation_request_id')
        quote = current.get('cancellation_quote')
        existing = await db.refunds.find_one({'refund_id': request_id}) if request_id else None
        if existing:
            return existing
        if not request_id or not quote:
            raise ValueError('Cancellation is already being reviewed. Refresh before retrying.')
        started = current.get('cancellation_request_claimed_at')
        if started and datetime.now(timezone.utc) - aware(started) < timedelta(minutes=2):
            raise ValueError('Cancellation is being recorded. Refresh shortly; do not create a second request.')
        recovered = await claim(db.bookings, {'booking_id': booking['booking_id'],
            'cancellation_request_id': request_id, 'cancellation_request_claimed_at': started},
            {'cancellation_request_claimed_at': datetime.now(timezone.utc)})
        if not recovered:
            raise ValueError('Cancellation reconciliation is in progress. Refresh shortly.')
        # Reuse the original, immutable request time, amounts and actor.
        reason = current.get('cancellation_reason') or reason
        role = current.get('cancellation_initiated_by_role') or role
        actor = {**actor, 'user_id': current.get('cancellation_initiated_by') or actor['user_id']}
    if not is_paid_booking(booking):
        quote.update(refund_amount=0, refundable_base_amount=0, refund_base_amount=0, non_refundable_amount=0)
    doc = await create_refund_request(db, booking=booking, reason=reason.strip(), initiated_by=actor['user_id'],
        initiated_by_role=role, policy_quote=quote, request_refund_id=request_id)
    await db.refunds.update_one({'refund_id': request_id}, {'$set': {
        'cancellation_confirmation_required': True, 'cancellation_status': 'requested',
        'verification_timeline': '24–48 working hours', 'bank_credit_timeline': '8–10 business days after processing',
        'host_cost_recovery_status': 'requires_separate_review' if cancellation_type == 'host' else 'not_applicable',
    }})
    await write_audit_log(db, user_id=actor['user_id'], role=role, module='refunds', action='cancellation_requested',
        record_id=request_id, new_value={'booking_id': booking['booking_id'], 'refund_amount': quote['refund_amount'], 'policy_version': POLICY_VERSION}, reason=reason)
    return {**doc, 'cancellation_confirmation_required': True, 'cancellation_status': 'requested'}


async def _confirm_cancellation(db, refund, booking, approved_by, reason):
    if not refund.get('cancellation_confirmation_required') or refund.get('cancellation_status') == 'approved':
        return
    now = datetime.now(timezone.utc)
    await db.bookings.update_one({'booking_id': booking['booking_id']}, {'$set': {
        'booking_status': 'cancelled', 'cancellation_status': 'approved', 'cancelled_at': booking.get('cancelled_at') or now,
        'cancellation_confirmed_by': approved_by, 'settlement_hold': True, 'updated_at': now,
    }})
    await db.blocked_dates.delete_many({'source': 'booking', 'source_id': booking['booking_id']})
    recovery_items = []
    # Never erase already-paid payouts/commissions or pretend money was recovered.
    for collection, identifier in [(db.payouts, 'payout_id'), (db.commissions, 'commission_id')]:
        rows = await collection.find({'booking_id': booking['booking_id']}, {'_id': 0}).to_list(length=None)
        for row in rows:
            status = row.get('payment_status') or row.get('status')
            paid = status in {'paid', 'processed', 'completed', 'success', 'processing'}
            if paid:
                recovery_items.append({'record_type': identifier, 'record_id': row.get(identifier),
                    'amount': row.get('net_amount') or row.get('commission_amount') or 0,
                    'status': 'requires_reconciliation'})
            values = {'cancellation_hold': True, 'cancellation_refund_id': refund['refund_id'],
                      'recovery_required': paid, 'settlement_review_required': True}
            if not paid:
                values.update(status='failed' if identifier == 'payout_id' else 'cancelled',
                              failure_reason='Cancelled booking; settlement is not payable')
                if refund.get('cancellation_type') in {'host', 'property_unavailable'}:
                    values.update(original_net_before_cancellation=row.get('original_net_before_cancellation', row.get('net_amount')), net_amount=0)
            key = {identifier: row[identifier]} if row.get(identifier) else {'booking_id': booking['booking_id'], 'broker_id': row.get('broker_id')}
            await collection.update_one(key, {'$set': values})
    await db.refunds.update_one({'refund_id': refund['refund_id']}, {'$set': {'cancellation_status': 'approved', 'cancellation_confirmed_at': now,
        'settlement_recovery_items': recovery_items}})


async def finalize_refund(db, refund, booking, *, gateway_refund_id=None):
    from services.account_service import build_credit_note_refund_doc, record_transaction, _next_credit_note_number
    from models.transaction import Refund, RefundStatus, TransactionType, TransactionStatus
    now = datetime.now(timezone.utc)
    current = await db.refunds.find_one({'refund_id': refund['refund_id']}, {'_id': 0}) or refund
    if current.get('status') in {'processed', 'completed', 'refunded', 'success'}:
        return current
    query = {'refund_id': refund['refund_id'], 'status': current.get('status')}
    if current.get('status') == 'finalizing':
        started = current.get('finalization_started_at')
        if started and now - aware(started) < timedelta(minutes=2):
            return current
        query['finalization_started_at'] = started
    before = await claim(db.refunds, query, {'status': 'finalizing', 'finalization_started_at': now})
    if not before:
        return await db.refunds.find_one({'refund_id': refund['refund_id']}, {'_id': 0})
    rfd = Refund(**{key: value for key, value in refund.items() if key in Refund.model_fields})
    rfd.status = RefundStatus.PROCESSED
    rfd.processed_at = now
    rfd.razorpay_refund_id = gateway_refund_id or refund.get('razorpay_refund_id')
    fields = {'status': 'processed', 'processed_at': now, 'failure_reason': None,
              'razorpay_refund_id': rfd.razorpay_refund_id, 'refunded_amount_processed': rfd.refund_amount}
    if rfd.refund_amount > 0:
        rfd.credit_note_no = current.get('credit_note_no') or await _next_credit_note_number(db, now)
        await db.refunds.update_one({'refund_id': rfd.refund_id}, {'$set': {'credit_note_no': rfd.credit_note_no}})
        credit = await build_credit_note_refund_doc(db, rfd, booking)
        credit['credit_note_no'] = refund.get('credit_note_no') or credit['credit_note_no']
        fields.update(credit)
        for key in ('original_amount', 'gross_receipt_amount', 'refundable_base_amount', 'refund_base_amount',
                    'non_refundable_amount', 'cancellation_charges', 'refund_amount'):
            if key in refund:
                fields[key] = refund[key]
        if len(refund.get('gateway_allocations') or []) <= 1:
            await record_transaction(db, type=TransactionType.REFUND, amount=rfd.refund_amount,
                status=TransactionStatus.SUCCESS, razorpay_payment_id=rfd.razorpay_payment_id,
                razorpay_refund_id=rfd.razorpay_refund_id, user_id=rfd.guest_id, host_id=rfd.host_id,
                booking_id=rfd.booking_id, refund_id=rfd.refund_id, notes=refund.get('reason'), is_mock=rfd.is_mock)
        else:
            for index, item in enumerate(refund['gateway_allocations']):
                await record_processed_allocation(db, refund, item, index, len(refund['gateway_allocations']))
    await db.refunds.update_one({'refund_id': rfd.refund_id}, {'$set': fields})
    await db.bookings.update_one({'booking_id': rfd.booking_id}, {'$set': {'refund_status': 'processed', 'refund_amount': rfd.refund_amount}})
    if rfd.refund_amount > 0:
        try:
            from services.booking_notifications import notify_guest_refund_processed
            await notify_guest_refund_processed(db, {**refund, **fields})
        except Exception:
            import logging
            logging.getLogger(__name__).exception('Processed refund notification could not be delivered')
    return {**current, **fields}


async def approve_request(db, *, refund_id, approved_by, reason=None, override_percent=None):
    from services.razorpay_service import razorpay_service
    refund = await db.refunds.find_one({'refund_id': refund_id}, {'_id': 0})
    if not refund:
        raise ValueError('Refund request not found')
    if refund.get('status') in {'processed', 'approved', 'completed', 'success', 'refunded'}:
        return refund  # Preserve earlier decisions; never recompute or replay.
    if refund.get('status') == 'rejected':
        raise ValueError('Rejected requests require a separately reviewed new request')
    required = {'refund_amount', 'original_amount', 'guest_id', 'host_id', 'booking_id', 'refund_percent', 'policy_tier'}
    if not required.issubset(refund):
        raise ValueError('This legacy request is missing financial eligibility fields. Reconcile its original payment before processing; no refund was sent.')
    booking = await db.bookings.find_one({'booking_id': refund['booking_id']}, {'_id': 0})
    if not booking:
        raise ValueError('Booking not found')
    if not reason or len(reason.strip()) < 3:
        raise ValueError('An approval reason of at least 3 characters is required')
    amount = int(refund.get('refund_amount') or 0)
    if refund.get('refund_policy_version') == POLICY_VERSION:
        from services.refund_policy_quote import paise
        paid_now = paise(booking.get('paid_amount', booking.get('total_amount')))
        if paid_now > int(refund.get('original_amount') or 0) and refund.get('status') == 'pending':
            raise ValueError('A further payment was captured after this request. Reconcile the pending quote before approval.')
    changed = {}
    if override_percent is not None:
        if refund.get('status') != 'pending' or not 0 <= override_percent <= 100:
            raise ValueError('An override is allowed only on a pending request and must be between 0 and 100')
        from decimal import Decimal, ROUND_HALF_UP
        base = int(refund.get('refundable_base_amount') or 0)
        amount = int((Decimal(base) * Decimal(str(override_percent)) / 100).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
        if booking.get('fraud_verified') and amount:
            raise ValueError('Verified fraudulent bookings cannot be refunded')
        changed = {'refund_amount': amount, 'refund_percent': override_percent,
                   'cancellation_charges': base - amount, 'override_applied': True}
    if refund.get('manual_review') and not reason:
        raise ValueError('A reason is required for an exception or incomplete historical data')
    if amount > int(refund.get('refundable_base_amount', amount)) or amount > int(refund.get('original_amount') or 0):
        raise ValueError('Refund exceeds eligible paid amount; manual correction required')
    now = datetime.now(timezone.utc)
    if refund.get('status') in {'processing', 'finalizing'}:
        if refund.get('gateway_allocations') and all(item.get('status') == 'processed' or item.get('refund_id') for item in refund['gateway_allocations']):
            return await process_original_sources(db, refund, booking, fetch_only=True)
        if refund.get('razorpay_refund_id'):
            result = await razorpay_service.call_async('fetch_refund', refund['razorpay_refund_id'])
            return await apply_gateway_result(db, refund, booking, result)
        attempted = refund.get('gateway_attempted_at')
        if attempted and now - aware(attempted) < timedelta(minutes=2):
            return refund
    query = {'refund_id': refund_id, 'status': refund['status']}
    if refund.get('gateway_attempted_at'):
        query['gateway_attempted_at'] = refund['gateway_attempted_at']
    before = await claim(db.refunds, query, {'status': 'processing', 'gateway_attempted_at': now,
        'approved_by': approved_by, 'approved_at': refund.get('approved_at') or now,
        'approval_reason': reason, 'gateway_idempotency_key': f"xspace_{refund_id}", **changed})
    if not before:
        return await db.refunds.find_one({'refund_id': refund_id}, {'_id': 0})
    refund.update(changed)
    refund.update(status='processing', gateway_attempted_at=now, approved_by=approved_by,
                  approved_at=refund.get('approved_at') or now, approval_reason=reason)
    await _confirm_cancellation(db, refund, booking, approved_by, reason)
    await write_audit_log(db, user_id=approved_by, role='admin', module='refunds', action='refund_approved',
        record_id=refund_id, new_value={'amount': amount}, reason=reason or 'Policy refund approved')
    if amount == 0:
        return await finalize_refund(db, refund, booking)
    payment_id = refund.get('razorpay_payment_id')
    if not payment_id or not str(payment_id).startswith('pay_'):
        error = 'Original gateway payment reference is missing. Reconcile the original payment; cash/manual refunds are not permitted.'
        await db.refunds.update_one({'refund_id': refund_id}, {'$set': {'status': 'failed', 'failure_reason': error}})
        return {**refund, 'status': 'failed', 'failure_reason': error}
    return await process_original_sources(db, refund, booking)


async def process_original_sources(db, refund, booking, *, fetch_only=False):
    """Support advance + balance captures, refunding only their original sources."""
    from services.razorpay_service import razorpay_service
    from services.refund_policy_quote import paise
    plan = refund.get('gateway_allocations')
    if not plan:
        refs = list(dict.fromkeys(value for value in [refund.get('razorpay_payment_id'),
            booking.get('razorpay_payment_id'), booking.get('remaining_razorpay_payment_id')] if value))
        needed = int(refund['refund_amount'])
        plan = []
        for reference in refs:
            result = await razorpay_service.call_async('fetch_payment', reference)
            entity = result.get('payment') or {}
            if not result.get('success') or entity.get('status') != 'captured':
                continue
            if entity.get('id') != reference:
                raise ValueError('Original gateway payment identifier does not match the booking')
            if entity.get('currency', 'INR') != 'INR':
                raise ValueError('Only original INR payment captures can be refunded')
            capacity = int(entity.get('amount') or 0) - int(entity.get('amount_refunded') or 0)
            if razorpay_service.is_mock:
                advance = paise(booking.get('advance_amount'))
                capacity = (advance if reference == booking.get('razorpay_payment_id') else paise(booking.get('paid_amount')) - advance) if len(refs) > 1 else int(refund['original_amount'])
            allocation = min(needed, max(0, capacity))
            if allocation:
                plan.append({'payment_id': reference, 'amount': allocation, 'status': 'created'})
                needed -= allocation
            if not needed:
                break
        if needed:
            message = 'Original captured payments cannot cover this refund. Reconcile payment references before retrying.'
            await db.refunds.update_one({'refund_id': refund['refund_id']}, {'$set': {'status': 'failed', 'failure_reason': message}})
            return {**refund, 'status': 'failed', 'failure_reason': message}
        await db.refunds.update_one({'refund_id': refund['refund_id']}, {'$set': {'gateway_allocations': plan}})
    for index, item in enumerate(plan):
        if item['status'] == 'processed':
            await record_processed_allocation(db, refund, item, index, len(plan))
            continue
        if item.get('refund_id'):
            result = await razorpay_service.call_async('fetch_refund', item['refund_id'])
        elif fetch_only:
            continue
        else:
            key = f"xspace_{refund['refund_id']}_{index}"
            result = await razorpay_service.call_async('create_refund', payment_id=item['payment_id'], amount=item['amount'],
                notes={'booking_id': refund['booking_id'], 'refund_id': refund['refund_id']},
                idempotency_key=key, receipt=f"{refund['refund_id']}_{index}")
        if not result.get('success'):
            await db.refunds.update_one({'refund_id': refund['refund_id']}, {'$set': {'status': 'processing', 'failure_reason': result.get('error') or 'Gateway reconciliation required'}})
            return await db.refunds.find_one({'refund_id': refund['refund_id']}, {'_id': 0})
        entity = result.get('refund') or {}
        if not entity.get('id') or entity.get('payment_id') != item['payment_id'] or int(entity.get('amount', -1)) != item['amount']:
            raise ValueError('Gateway refund does not match the approved original-source allocation')
        item.update(status=entity.get('status', 'pending'), refund_id=entity.get('id'), failure_reason=entity.get('error_description'))
        plan = await merge_gateway_allocations(db, refund['refund_id'], plan)
        if item['status'] == 'processed':
            await record_processed_allocation(db, refund, item, index, len(plan))
    current = await db.refunds.find_one({'refund_id': refund['refund_id']}, {'_id': 0}) or refund
    current['gateway_allocations'] = plan
    if all(item['status'] == 'processed' for item in plan):
        return await finalize_refund(db, current, booking, gateway_refund_id=plan[0]['refund_id'])
    failed = any(item['status'] == 'failed' for item in plan)
    values = {'status': 'failed' if failed else 'processing', 'gateway_status': 'failed' if failed else 'pending',
              'refunded_amount_processed': sum(item['amount'] for item in plan if item['status'] == 'processed'),
              'failure_reason': 'A gateway refund failed; original-source reconciliation is required.' if failed else None}
    await db.refunds.update_one({'refund_id': refund['refund_id']}, {'$set': values})
    await db.bookings.update_one({'booking_id': refund['booking_id']}, {'$set': {'refund_status': values['status']}})
    return {**current, **values}


async def record_processed_allocation(db, refund, item, index, count):
    from services.account_service import record_transaction
    from services.razorpay_service import razorpay_service
    from models.transaction import TransactionType, TransactionStatus
    await record_transaction(db, type=TransactionType.REFUND, amount=item['amount'], status=TransactionStatus.SUCCESS,
        razorpay_payment_id=item['payment_id'], razorpay_refund_id=item['refund_id'],
        user_id=refund['guest_id'], host_id=refund['host_id'], booking_id=refund['booking_id'],
        refund_id=f"{refund['refund_id']}_{index}" if count > 1 else refund['refund_id'],
        parent_refund_id=refund['refund_id'], notes=refund.get('reason'), is_mock=razorpay_service.is_mock)


async def merge_gateway_allocations(db, refund_id, incoming):
    for _ in range(5):
        current = await db.refunds.find_one({'refund_id': refund_id}, {'_id': 0})
        revision = current.get('gateway_revision')
        previous = {item['payment_id']: item for item in current.get('gateway_allocations', [])}
        merged = []
        for item in incoming:
            old = previous.get(item['payment_id']) or {}
            merged.append(old if old.get('status') == 'processed' else item)
        query = {'refund_id': refund_id, 'gateway_revision': revision}
        if await claim(db.refunds, query, {'gateway_allocations': merged, 'gateway_revision': int(revision or 0) + 1}):
            return merged
    raise ValueError('Refund status is being updated. Refresh to reconcile.')


async def apply_gateway_result(db, refund, booking, result):
    if not result.get('success'):
        # A timeout is not proof the provider rejected the refund. Keep the same
        # idempotency key for a later admin retry; never mark it paid/refunded.
        values = {'status': 'processing', 'failure_reason': result.get('error') or 'Gateway status requires reconciliation'}
    else:
        entity = result.get('refund') or {}
        if entity.get('payment_id') != refund.get('razorpay_payment_id') or int(entity.get('amount', -1)) != int(refund['refund_amount']):
            raise ValueError('Gateway refund amount or original payment does not match the approved request')
        if entity.get('status') == 'processed':
            await db.refunds.update_one({'refund_id': refund['refund_id']}, {'$set': {'razorpay_refund_id': entity['id']}})
            return await finalize_refund(db, refund, booking, gateway_refund_id=entity['id'])
        values = {'status': 'failed' if entity.get('status') == 'failed' else 'processing',
                  'razorpay_refund_id': entity.get('id'), 'gateway_status': entity.get('status'),
                  'failure_reason': entity.get('error_description') if entity.get('status') == 'failed' else None}
    await db.refunds.update_one({'refund_id': refund['refund_id']}, {'$set': values})
    await db.bookings.update_one({'booking_id': refund['booking_id']}, {'$set': {'refund_status': values['status']}})
    return {**refund, **values}


async def reject_request(db, *, refund_id, rejected_by, reason):
    if not reason or len(reason.strip()) < 3:
        raise ValueError('A rejection reason is required')
    before = await claim(db.refunds, {'refund_id': refund_id, 'status': 'pending'}, {
        'status': 'rejected', 'rejected_by': rejected_by, 'rejected_at': datetime.now(timezone.utc), 'rejection_reason': reason})
    if not before:
        raise ValueError('Only pending requests can be rejected; processing refunds cannot be cancelled')
    if before.get('cancellation_confirmation_required'):
        await db.bookings.update_one({'booking_id': before['booking_id'], 'cancellation_request_id': refund_id},
            {'$set': {'cancellation_status': 'rejected', 'settlement_hold': False, 'refund_status': 'rejected'}})
    await write_audit_log(db, user_id=rejected_by, role='admin', module='refunds', action='cancellation_rejected', record_id=refund_id, reason=reason)
    return await db.refunds.find_one({'refund_id': refund_id}, {'_id': 0})


async def reconcile_pending_quote(db, refund_id, actor, reason):
    if not reason or len(reason.strip()) < 3:
        raise ValueError('A reconciliation reason is required')
    refund = await db.refunds.find_one({'refund_id': refund_id}, {'_id': 0})
    if not refund or refund.get('status') != 'pending' or refund.get('refund_policy_version') != POLICY_VERSION:
        raise ValueError('Only pending requests under the new policy can be reconciled')
    booking = await db.bookings.find_one({'booking_id': refund['booking_id']}, {'_id': 0})
    if not booking:
        raise ValueError('Booking not found')
    context = {**(booking.get('refund_policy_context') or {}), 'check_in_at': refund['check_in_at'],
               'timezone': refund['check_in_timezone']}
    quote = quote_refund({**booking, 'refund_policy_context': context},
        requested_at=refund['refund_requested_at'], cancellation_type=refund['cancellation_type'],
        override_percent=refund['refund_percent'] if refund.get('override_applied') else None)
    if not await claim(db.refunds, {'refund_id': refund_id, 'status': 'pending'}, quote):
        raise ValueError('Request is already being processed; no amounts were changed')
    await write_audit_log(db, user_id=actor['user_id'], role='admin', module='refunds', action='pending_refund_reconciled',
        record_id=refund_id, old_value={'refund_amount': refund['refund_amount']}, new_value={'refund_amount': quote['refund_amount']}, reason=reason)
    return {**refund, **quote}
