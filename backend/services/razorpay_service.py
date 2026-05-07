import os
import logging
import uuid
import hmac
import hashlib
from typing import Dict, Optional

logger = logging.getLogger(__name__)


def _is_demo_key(key: str) -> bool:
    return (not key) or key.startswith("rzp_test_demo")


class RazorpayService:
    """Razorpay integration with a demo/mock fallback when no real keys are set."""

    def __init__(self):
        self.key_id = os.getenv("RAZORPAY_KEY_ID", "rzp_test_demo_key")
        self.key_secret = os.getenv("RAZORPAY_KEY_SECRET", "rzp_test_demo_secret")
        self.is_mock = _is_demo_key(self.key_id) or _is_demo_key(self.key_secret)

        if self.is_mock:
            logger.warning(
                "Razorpay running in DEMO mode — orders and signature verification are mocked. "
                "Set real RAZORPAY_KEY_ID/SECRET in backend/.env to enable live payments."
            )
            self.client = None
        else:
            import razorpay
            self.client = razorpay.Client(auth=(self.key_id, self.key_secret))

    # --------------- Order ----------------

    def create_order(self, amount: int, currency: str = "INR", receipt: Optional[str] = None) -> Dict:
        """Create a Razorpay order. Falls back to a mock order in demo mode."""
        if self.is_mock:
            order_id = f"order_mock_{uuid.uuid4().hex[:20]}"
            order = {
                "id": order_id,
                "amount": amount,
                "amount_paid": 0,
                "amount_due": amount,
                "currency": currency,
                "receipt": (receipt or "")[:40],
                "status": "created",
                "mock": True,
            }
            logger.info(f"[MOCK] Razorpay order created: {order_id}")
            return {"success": True, "order": order}

        try:
            order_data = {"amount": amount, "currency": currency, "payment_capture": 1}
            if receipt:
                order_data["receipt"] = receipt[:40]
            order = self.client.order.create(data=order_data)
            logger.info(f"Razorpay order created: {order['id']}")
            return {"success": True, "order": order}
        except Exception as e:
            logger.error(f"Failed to create Razorpay order: {str(e)}")
            return {"success": False, "error": str(e)}

    # --------------- Verify ----------------

    def verify_payment_signature(
        self, razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str
    ) -> bool:
        """Verify Razorpay payment signature. In mock mode, accept the deterministic mock signature."""
        if self.is_mock:
            expected = self._mock_signature(razorpay_order_id, razorpay_payment_id)
            ok = hmac.compare_digest(expected, razorpay_signature or "")
            if not ok:
                logger.warning(f"[MOCK] Signature mismatch for order={razorpay_order_id}")
            return ok

        try:
            self.client.utility.verify_payment_signature(
                {
                    "razorpay_order_id": razorpay_order_id,
                    "razorpay_payment_id": razorpay_payment_id,
                    "razorpay_signature": razorpay_signature,
                }
            )
            return True
        except Exception as e:
            logger.error(f"Payment signature verification failed: {str(e)}")
            return False

    # --------------- Mock helpers ----------------

    def _mock_signature(self, order_id: str, payment_id: str) -> str:
        """Deterministic HMAC-SHA256 of order_id|payment_id with the (demo) key secret."""
        msg = f"{order_id}|{payment_id}".encode()
        secret = (self.key_secret or "rzp_test_demo_secret").encode()
        return hmac.new(secret, msg, hashlib.sha256).hexdigest()

    def mock_complete_payment(self, order_id: str) -> Dict:
        """Generate a fake payment_id and matching signature for the dev/demo flow."""
        if not self.is_mock:
            return {"success": False, "error": "mock_complete_payment is only available in DEMO mode"}
        payment_id = f"pay_mock_{uuid.uuid4().hex[:20]}"
        signature = self._mock_signature(order_id, payment_id)
        return {
            "success": True,
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature,
            "mock": True,
        }

    # --------------- Refunds ----------------

    def create_refund(
        self,
        payment_id: str,
        amount: int,
        notes: Optional[Dict] = None,
    ) -> Dict:
        """Initiate a refund against a payment. Falls back to deterministic mock in DEMO."""
        if self.is_mock:
            refund_id = f"rfnd_mock_{uuid.uuid4().hex[:20]}"
            logger.info(f"[MOCK] Razorpay refund created: {refund_id} for {payment_id} amount={amount}")
            return {
                "success": True,
                "refund": {
                    "id": refund_id,
                    "payment_id": payment_id,
                    "amount": amount,
                    "status": "processed",
                    "mock": True,
                },
            }

        try:
            payload = {"amount": amount}
            if notes:
                payload["notes"] = notes
            refund = self.client.payment.refund(payment_id, payload)
            logger.info(f"Razorpay refund created: {refund.get('id')}")
            return {"success": True, "refund": refund}
        except Exception as e:
            logger.error(f"Razorpay refund failed: {str(e)}")
            return {"success": False, "error": str(e)}

    # --------------- Payouts (RazorpayX) ----------------

    def create_payout(
        self,
        destination_type: str,
        destination_ref: str,
        amount: int,
        purpose: str = "payout",
        notes: Optional[Dict] = None,
        account_holder: Optional[str] = None,
        ifsc: Optional[str] = None,
    ) -> Dict:
        """Create a RazorpayX payout. Demo mode returns a mock payout id.

        destination_type: 'upi' or 'bank'
        destination_ref: VPA string (upi) or account number (bank)
        """
        if self.is_mock:
            payout_id = f"pout_mock_{uuid.uuid4().hex[:20]}"
            logger.info(
                f"[MOCK] RazorpayX payout created: {payout_id} "
                f"→ {destination_type}:{destination_ref} amount={amount}"
            )
            return {
                "success": True,
                "payout": {
                    "id": payout_id,
                    "amount": amount,
                    "status": "processed",
                    "mode": destination_type.upper(),
                    "destination": destination_ref,
                    "mock": True,
                },
            }

        # Live path — requires RazorpayX account + X_ACCOUNT_NUMBER env var.
        # We keep this best-effort; for now we surface a clear error if called
        # in live mode without further configuration.
        try:
            account_number = os.getenv("RAZORPAYX_ACCOUNT_NUMBER")
            if not account_number:
                return {"success": False, "error": "RAZORPAYX_ACCOUNT_NUMBER not configured"}

            fund_payload = {
                "account_type": "vpa" if destination_type == "upi" else "bank_account",
                "contact_id": notes.get("contact_id") if notes else None,
            }
            if destination_type == "upi":
                fund_payload["vpa"] = {"address": destination_ref}
            else:
                fund_payload["bank_account"] = {
                    "name": account_holder or "Host",
                    "ifsc": ifsc or "",
                    "account_number": destination_ref,
                }

            payout_payload = {
                "account_number": account_number,
                "amount": amount,
                "currency": "INR",
                "mode": "UPI" if destination_type == "upi" else "IMPS",
                "purpose": purpose,
                "queue_if_low_balance": True,
            }
            if notes:
                payout_payload["notes"] = notes

            # NOTE: production wiring requires creating a Contact + FundAccount first.
            payout = self.client.payout.create(data=payout_payload)
            return {"success": True, "payout": payout}
        except Exception as e:
            logger.error(f"Razorpay payout failed: {str(e)}")
            return {"success": False, "error": str(e)}


razorpay_service = RazorpayService()
