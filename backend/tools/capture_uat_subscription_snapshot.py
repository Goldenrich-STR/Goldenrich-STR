"""Freeze one explicitly verified legacy UAT invoice; preview is the default.

This tool never changes amounts, statuses, payments, payouts or plan settings.
It is restricted to the local str_uat database. Back up UAT before --apply.
"""
import argparse
import asyncio
from datetime import datetime, timezone
from decimal import Decimal
import json
import os
from pathlib import Path
import sys
from urllib.parse import unquote, urlsplit
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from services.subscription_finance import checkout_snapshot, decimal_amount, to_paise


def verified_snapshot(subscription, plan, expected):
    if decimal_amount(subscription.get("discount_amount") or 0) != 0 or subscription.get("coupon_code"):
        raise ValueError("Coupon subscriptions require separate invoice review")
    price_key = "price_annual" if subscription.get("billing_cycle") == "annual" else "price_monthly"
    if plan.get("tax_percent") is None:
        raise ValueError("The plan has no explicit configured tax percentage")
    fee = decimal_amount(plan[price_key])
    platform = decimal_amount(plan.get("platform_fee") or 0)
    rate = decimal_amount(plan["tax_percent"])
    tax = Decimal(to_paise((fee + platform) * rate / 100)) / 100
    result = checkout_snapshot({"plan_fee": fee, "platform_fee": platform,
                                "tax_percent": rate, "tax_amount": tax,
                                "total_amount": fee + platform + tax})
    for key, value in expected.items():
        if result[key] != to_paise(value):
            raise ValueError(f"Configured checkout differs from reviewed invoice: {key}")
    if to_paise(subscription["amount"]) != result["total_paise"]:
        raise ValueError("Stored subscription amount differs from reviewed invoice")
    return result


def document(raw):
    return json.loads(raw) if isinstance(raw, str) else dict(raw)


async def execute(args):
    from dotenv import load_dotenv
    import asyncpg
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    url = os.environ.get("POSTGRES_URL", "")
    parsed = urlsplit(url)
    if (os.environ.get("DATABASE_TYPE") != "postgres" or
            parsed.hostname not in {"localhost", "127.0.0.1"} or
            unquote(parsed.path.lstrip("/")) != "str_uat"):
        raise ValueError("Refusing: this tool only supports local PostgreSQL database str_uat")
    expected = {"plan_fee_paise": args.plan_fee, "platform_fee_paise": args.platform_fee,
                "gst_paise": args.gst, "total_paise": args.total}
    conn = await asyncpg.connect(url)
    try:
        async with conn.transaction():
            rows = await conn.fetch("SELECT id, data FROM public.transactions WHERE data->>'type'='subscription' AND data->>'status'='success'")
            candidates = []
            for row in rows:
                tx = document(row["data"])
                if args.subscription_id and tx.get("subscription_id") != args.subscription_id:
                    continue
                if decimal_amount(tx.get("amount", 0)) == to_paise(args.total):
                    candidates.append((row["id"], tx))
            if len(candidates) != 1:
                raise ValueError("Expected one matching successful payment; specify --subscription-id and review duplicates if needed")
            tx_id, tx = candidates[0]
            locked = await conn.fetchrow("SELECT data FROM public.transactions WHERE id=$1 FOR UPDATE", tx_id)
            tx = document(locked["data"])
            if tx.get("type") != "subscription" or tx.get("status") != "success" or decimal_amount(tx.get("amount", 0)) != to_paise(args.total):
                raise ValueError("Payment changed during review; retry the preview")
            sub_id = tx.get("subscription_id")
            sub_rows = await conn.fetch("SELECT id, data FROM public.subscriptions WHERE data->>'subscription_id'=$1 FOR UPDATE", sub_id)
            if len(sub_rows) != 1:
                raise ValueError("Expected exactly one linked subscription")
            sub = document(sub_rows[0]["data"])
            plans = await conn.fetch("SELECT data FROM public.subscription_plans WHERE data->>'plan_id'=$1 FOR SHARE", sub.get("plan_id"))
            if len(plans) != 1:
                raise ValueError("Expected exactly one linked subscription plan")
            snapshot = verified_snapshot(sub, document(plans[0]["data"]), expected)
            for existing in (sub.get("financial_snapshot"), tx.get("financial_snapshot")):
                if existing is not None and existing != snapshot:
                    raise ValueError("An existing snapshot differs; refusing to overwrite it")
            print(json.dumps({"subscription_id": sub_id, "reviewed_snapshot": snapshot,
                              "mode": "apply" if args.apply else "preview"}, indent=2))
            if not args.apply:
                print("Preview only; no records changed.")
                return
            encoded = json.dumps(snapshot)
            await conn.execute("UPDATE public.subscriptions SET data=jsonb_set(data, '{financial_snapshot}', $1::jsonb, true) WHERE id=$2", encoded, sub_rows[0]["id"])
            await conn.execute("UPDATE public.transactions SET data=jsonb_set(data, '{financial_snapshot}', $1::jsonb, true) WHERE id=$2", encoded, tx_id)
            audit = {"audit_id": f"audit_{uuid4().hex}", "user_id": "uat-invoice-review",
                     "role": "admin", "module": "finance", "action": "capture_verified_legacy_subscription_snapshot",
                     "subscription_id": sub_id, "transaction_id": tx.get("transaction_id"),
                     "details": {"snapshot": snapshot, "review": "explicit_expected_invoice_amounts"},
                     "created_at": datetime.now(timezone.utc).isoformat()}
            await conn.execute("INSERT INTO public.audit_logs(data) VALUES($1::jsonb)", json.dumps(audit))
        print("Verified snapshot saved with audit; amounts and payment statuses unchanged.")
    finally:
        await conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--subscription-id")
    for name in ("plan-fee", "platform-fee", "gst", "total"):
        parser.add_argument(f"--{name}", required=True)
    parser.add_argument("--apply", action="store_true")
    try:
        asyncio.run(execute(parser.parse_args()))
    except (ValueError, KeyError) as exc:
        raise SystemExit(f"No changes committed: {exc}") from None
