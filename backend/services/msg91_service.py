import requests
import os
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

class MSG91Service:
    """Service for MSG91 SMS and WhatsApp integration."""
    
    def __init__(self):
        """Initialize MSG91 service."""
        self.authkey = os.getenv("MSG91_AUTHKEY", "msg91_demo_key")
        self.sender_id = os.getenv("MSG91_SENDER_ID", "PROPNT")
        self.sms_api_url = "https://api.msg91.com/api/v5/flow/"
        self.whatsapp_api_url = "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/"
        
        # Check if we're in demo mode
        self.is_demo_mode = self.authkey == "msg91_demo_key"
        
        if self.is_demo_mode:
            logger.warning("MSG91 running in DEMO mode - no actual SMS/WhatsApp will be sent")
    
    def send_sms(self, phone: str, message: str, template_id: Optional[str] = None) -> Dict:
        """Send SMS via MSG91.
        
        Args:
            phone: Recipient phone number (with country code)
            message: SMS message content
            template_id: Optional DLT template ID
        """
        try:
            # Demo mode - simulate success
            if self.is_demo_mode:
                logger.info(f"[DEMO] SMS to {phone}: {message}")
                return {
                    "success": True,
                    "message_id": f"demo_sms_{int(datetime.now(timezone.utc).timestamp())}",
                    "demo_mode": True
                }
            
            # Real MSG91 API call
            # Format phone number (remove + and spaces)
            clean_phone = phone.replace("+", "").replace(" ", "")
            
            # Prepare payload
            payload = {
                "sender": self.sender_id,
                "route": "4",  # Transactional route
                "country": "91",  # India
                "mobiles": clean_phone,
                "message": message,
                "authkey": self.authkey
            }
            
            if template_id:
                payload["template_id"] = template_id
            
            # Send request
            response = requests.post(
                "https://api.msg91.com/api/sendhttp.php",
                data=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info(f"SMS sent successfully to {phone}")
                return {
                    "success": True,
                    "message_id": response.text,
                    "demo_mode": False
                }
            else:
                logger.error(f"SMS failed: {response.text}")
                return {
                    "success": False,
                    "error": response.text
                }
        
        except Exception as e:
            logger.error(f"Error sending SMS: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def send_whatsapp(self, phone: str, message: str, template_name: Optional[str] = None) -> Dict:
        """Send WhatsApp message via MSG91.
        
        Args:
            phone: Recipient phone number (with country code)
            message: WhatsApp message content
            template_name: Optional approved template name
        """
        try:
            # Demo mode - simulate success
            if self.is_demo_mode:
                logger.info(f"[DEMO] WhatsApp to {phone}: {message}")
                return {
                    "success": True,
                    "message_id": f"demo_wa_{int(datetime.now(timezone.utc).timestamp())}",
                    "demo_mode": True
                }
            
            # Real MSG91 WhatsApp API call
            # Format phone number
            clean_phone = phone.replace("+", "").replace(" ", "")
            
            # Prepare payload
            payload = {
                "integrated_number": "919876543210",  # Your WhatsApp Business number
                "content_type": "template",
                "payload": {
                    "to": clean_phone,
                    "type": "template",
                    "template": {
                        "name": template_name or "propnest_notification",
                        "language": {
                            "code": "en",
                            "policy": "deterministic"
                        },
                        "components": [
                            {
                                "type": "body",
                                "parameters": [
                                    {
                                        "type": "text",
                                        "text": message
                                    }
                                ]
                            }
                        ]
                    }
                }
            }
            
            headers = {
                "authkey": self.authkey,
                "Content-Type": "application/json"
            }
            
            # Send request
            response = requests.post(
                self.whatsapp_api_url,
                json=payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info(f"WhatsApp sent successfully to {phone}")
                return {
                    "success": True,
                    "message_id": response.json().get("message_id"),
                    "demo_mode": False
                }
            else:
                logger.error(f"WhatsApp failed: {response.text}")
                return {
                    "success": False,
                    "error": response.text
                }
        
        except Exception as e:
            logger.error(f"Error sending WhatsApp: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def send_otp_sms(self, phone: str, otp: str) -> Dict:
        """Send OTP via SMS."""
        message = f"Your Golden Rich Stay OTP is {otp}. Valid for 5 minutes. Do not share with anyone."
        return self.send_sms(phone, message)
    
    def send_otp_whatsapp(self, phone: str, otp: str) -> Dict:
        """Send OTP via WhatsApp."""
        message = f"Your Golden Rich Stay OTP is {otp}. Valid for 5 minutes."
        return self.send_whatsapp(phone, message)

from datetime import datetime, timezone
msg91_service = MSG91Service()