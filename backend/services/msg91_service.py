import requests
import os
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

class MSG91Service:
    """Service for MSG91 SMS and WhatsApp integration."""
    
    def __init__(self):
        """Initialize MSG91 service."""
        self.authkey = os.getenv("MSG91_AUTHKEY", "msg91_demo_key").strip()
        self.sender_id = os.getenv("MSG91_SENDER_ID", "PROPNT")
        self.sms_api_url = "https://api.msg91.com/api/v5/flow/"
        self.whatsapp_api_url = "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/"
        self.whatsapp_template_api_url = "https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/"
        self.whatsapp_integrated_number = os.getenv("MSG91_WHATSAPP_INTEGRATED_NUMBER", "").strip()
        self.whatsapp_template_namespace = os.getenv("MSG91_WHATSAPP_TEMPLATE_NAMESPACE", "").strip()
        
        demo_mode = os.getenv("MSG91_DEMO_MODE", "").strip().lower()
        demo_values = {
            "",
            "msg91_demo_key",
            "demo",
            "mock",
            "replace-with-msg91-authkey",
            "your-msg91-authkey",
            "your_key_here",
        }
        # Check if we're in demo mode. Explicitly set MSG91_DEMO_MODE=true on
        # staging/EC2 when real MSG91 credentials are not available yet.
        self.is_demo_mode = demo_mode in {"1", "true", "yes", "on"} or self.authkey.lower() in demo_values
        
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

    def send_flow_sms(self, phone: str, template_id: str, variables: Optional[Dict[str, str]] = None) -> Dict:
        """Send SMS via MSG91 Flow template.

        MSG91 owns the approved message text in the template. The backend only
        sends the recipient and variables required by that template.
        """
        try:
            if self.is_demo_mode:
                logger.info(f"[DEMO] Flow SMS to {phone}: template={template_id}, variables={variables}")
                return {
                    "success": True,
                    "message_id": f"demo_flow_sms_{int(datetime.now(timezone.utc).timestamp())}",
                    "demo_mode": True
                }

            clean_phone = phone.replace("+", "").replace(" ", "")
            recipient = {"mobiles": clean_phone}
            if variables:
                recipient.update(variables)

            payload = {
                "template_id": template_id,
                "short_url": "0",
                "recipients": [recipient],
            }
            headers = {
                "authkey": self.authkey,
                "Content-Type": "application/json",
            }

            response = requests.post(
                self.sms_api_url,
                json=payload,
                headers=headers,
                timeout=10
            )

            if 200 <= response.status_code < 300:
                logger.info(f"Flow SMS sent successfully to {phone}: {response.text}")
                return {
                    "success": True,
                    "message_id": response.text,
                    "demo_mode": False
                }

            logger.error(f"Flow SMS failed: {response.status_code} {response.text}")
            return {
                "success": False,
                "error": response.text
            }

        except Exception as e:
            logger.error(f"Error sending Flow SMS: {str(e)}")
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
            if not self.whatsapp_integrated_number:
                return {
                    "success": False,
                    "error": "MSG91_WHATSAPP_INTEGRATED_NUMBER is not configured",
                }

            # Format phone number
            clean_phone = phone.replace("+", "").replace(" ", "")
            
            # Prepare payload
            payload = {
                "integrated_number": self.whatsapp_integrated_number,
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

    def send_whatsapp_template(self, phone: str, template_name: str, parameters: list[str]) -> Dict:
        """Send WhatsApp template with numbered body variables via MSG91."""
        try:
            if self.is_demo_mode:
                logger.info(
                    f"[DEMO] WhatsApp template to {phone}: template={template_name}, parameters={parameters}"
                )
                return {
                    "success": True,
                    "message_id": f"demo_wa_template_{int(datetime.now(timezone.utc).timestamp())}",
                    "demo_mode": True,
                }

            if not self.whatsapp_integrated_number:
                return {
                    "success": False,
                    "error": "MSG91_WHATSAPP_INTEGRATED_NUMBER is not configured",
                }

            clean_phone = self._clean_indian_phone(phone)
            components = {
                f"body_{index}": {
                    "type": "text",
                    "value": str(value if value is not None else ""),
                }
                for index, value in enumerate(parameters, start=1)
            }
            template = {
                "name": template_name,
                "language": {
                    "code": "en",
                    "policy": "deterministic",
                },
                "to_and_components": [
                    {
                        "to": [clean_phone],
                        "components": components,
                    }
                ],
            }
            if self.whatsapp_template_namespace:
                template["namespace"] = self.whatsapp_template_namespace

            payload = {
                "integrated_number": self.whatsapp_integrated_number,
                "content_type": "template",
                "CRQID": f"xspace_{template_name}_{int(datetime.now(timezone.utc).timestamp())}",
                "payload": {
                    "messaging_product": "whatsapp",
                    "type": "template",
                    "template": template,
                },
            }
            headers = {
                "accept": "application/json",
                "authkey": self.authkey,
                "Content-Type": "application/json",
            }

            logger.info(
                "Sending MSG91 WhatsApp template=%s from=%s to=%s component_keys=%s",
                template_name,
                self.whatsapp_integrated_number,
                clean_phone,
                sorted(components.keys()),
            )

            response = requests.post(
                self.whatsapp_template_api_url,
                json=payload,
                headers=headers,
                timeout=10,
            )

            if 200 <= response.status_code < 300:
                logger.info(f"WhatsApp template sent successfully to {phone}: {response.text}")
                try:
                    message_id = response.json().get("message_id")
                except Exception:
                    message_id = response.text
                return {
                    "success": True,
                    "message_id": message_id,
                    "demo_mode": False,
                }

            logger.error(f"WhatsApp template failed: {response.status_code} {response.text}")
            return {
                "success": False,
                "error": response.text,
            }

        except Exception as e:
            logger.error(f"Error sending WhatsApp template: {str(e)}")
            return {
                "success": False,
                "error": str(e),
            }

    @staticmethod
    def _clean_indian_phone(phone: str) -> str:
        clean_phone = "".join(ch for ch in str(phone or "") if ch.isdigit())
        if len(clean_phone) == 10:
            return f"91{clean_phone}"
        return clean_phone
    
    def send_otp_sms(self, phone: str, otp: str) -> Dict:
        """Send OTP via SMS."""
        template_id = os.getenv("MSG91_TEMPLATE_ID", "").strip()
        if template_id:
            recipient_name = os.getenv("MSG91_OTP_DEFAULT_NAME", "Customer").strip() or "Customer"
            name_key = os.getenv("MSG91_OTP_NAME_VARIABLE", "name").strip() or "name"
            otp_key = os.getenv("MSG91_OTP_CODE_VARIABLE", "otp").strip() or "otp"
            variables = {
                name_key: recipient_name,
                otp_key: otp,
                # Keep common MSG91/DLT variable aliases populated so older
                # templates with var1/var2 or uppercase names do not render blank.
                "name": recipient_name,
                "user_name": recipient_name,
                "customer_name": recipient_name,
                "otp": otp,
                "OTP": otp,
                "code": otp,
                "var1": recipient_name,
                "var2": otp,
                "VAR1": recipient_name,
                "VAR2": otp,
            }
            return self.send_flow_sms(phone, template_id, variables)

        message = f"Your X-Space360 OTP is {otp}. Valid for 2 minutes. Do not share with anyone."
        return self.send_sms(phone, message)
    
    def send_otp_whatsapp(self, phone: str, otp: str) -> Dict:
        """Send OTP via WhatsApp."""
        message = f"Your X-Space360 OTP is {otp}. Valid for 2 minutes."
        return self.send_whatsapp(phone, message)

from datetime import datetime, timezone
msg91_service = MSG91Service()
