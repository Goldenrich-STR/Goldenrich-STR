import razorpay
import os
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

class RazorpayService:
    """Service for Razorpay payment integration."""
    
    def __init__(self):
        """Initialize Razorpay client."""
        self.key_id = os.getenv("RAZORPAY_KEY_ID", "rzp_test_demo_key")
        self.key_secret = os.getenv("RAZORPAY_KEY_SECRET", "rzp_test_demo_secret")
        self.client = razorpay.Client(auth=(self.key_id, self.key_secret))
    
    def create_order(self, amount: int, currency: str = "INR", receipt: Optional[str] = None) -> Dict:
        """Create a Razorpay order for payment.
        
        Args:
            amount: Amount in paise (e.g., 50000 for ₹500)
            currency: Currency code (default: INR)
            receipt: Receipt ID (max 40 characters)
        """
        try:
            order_data = {
                "amount": amount,
                "currency": currency,
                "payment_capture": 1
            }
            
            if receipt:
                order_data["receipt"] = receipt[:40]  # Razorpay limit
            
            order = self.client.order.create(data=order_data)
            logger.info(f"Razorpay order created: {order['id']}")
            return {
                "success": True,
                "order": order
            }
        except Exception as e:
            logger.error(f"Failed to create Razorpay order: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def verify_payment_signature(self, razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str) -> bool:
        """Verify Razorpay payment signature."""
        try:
            params_dict = {
                'razorpay_order_id': razorpay_order_id,
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature
            }
            self.client.utility.verify_payment_signature(params_dict)
            return True
        except Exception as e:
            logger.error(f"Payment signature verification failed: {str(e)}")
            return False
    
    def fetch_payment(self, payment_id: str) -> Dict:
        """Fetch payment details from Razorpay."""
        try:
            payment = self.client.payment.fetch(payment_id)
            return {
                "success": True,
                "payment": payment
            }
        except Exception as e:
            logger.error(f"Failed to fetch payment: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def create_refund(self, payment_id: str, amount: Optional[int] = None) -> Dict:
        """Create a refund for a payment.
        
        Args:
            payment_id: Razorpay payment ID
            amount: Amount to refund in paise (None for full refund)
        """
        try:
            refund_data = {}
            if amount:
                refund_data["amount"] = amount
            
            refund = self.client.payment.refund(payment_id, refund_data)
            logger.info(f"Refund created: {refund['id']}")
            return {
                "success": True,
                "refund": refund
            }
        except Exception as e:
            logger.error(f"Failed to create refund: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

razorpay_service = RazorpayService()