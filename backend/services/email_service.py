import html
import logging
import os
import requests
import smtplib
from datetime import datetime, timezone
from email.message import EmailMessage
from typing import Dict, Optional

logger = logging.getLogger(__name__)


def _money(value) -> str:
    try:
        amount = float(value or 0)
    except (TypeError, ValueError):
        amount = 0
    return f"Rs. {amount:,.0f}"


def _text(value, fallback: str = "N/A") -> str:
    value = fallback if value is None or value == "" else value
    return html.escape(str(value))


class EmailService:
    """SMTP-backed email notification service with X-Space360 templates."""

    def __init__(self):
        self.provider = os.getenv("EMAIL_PROVIDER", "smtp").strip().lower()
        self.host = os.getenv("EMAIL_SMTP_HOST", "").strip()
        self.port = int(os.getenv("EMAIL_SMTP_PORT", "587") or 587)
        self.username = os.getenv("EMAIL_SMTP_USER", "").strip()
        self.password = os.getenv("EMAIL_SMTP_PASSWORD", "").strip()
        self.from_email = (
            os.getenv("EMAIL_FROM_ADDRESS", "").strip()
            or os.getenv("FROM_EMAIL", "").strip()
            or "noreply@x-space360.in"
        )
        self.from_name = os.getenv("EMAIL_FROM_NAME", "X-Space360").strip() or "X-Space360"
        self.msg91_authkey = (
            os.getenv("MSG91_EMAIL_AUTHKEY", "").strip()
            or os.getenv("MSG91_AUTHKEY", "").strip()
        )
        self.msg91_domain = os.getenv("MSG91_EMAIL_DOMAIN", "").strip()
        self.msg91_api_url = os.getenv(
            "MSG91_EMAIL_API_URL",
            "https://control.msg91.com/api/v5/email/send",
        ).strip()
        demo_mode = os.getenv("EMAIL_DEMO_MODE", "").strip().lower()
        if self.provider == "msg91":
            configured = bool(self.msg91_authkey and self.msg91_domain and self.from_email)
        else:
            configured = bool(self.host and self.username and self.password and self.from_email)
        self.is_demo_mode = demo_mode in {"1", "true", "yes", "on"} or not configured
        logger.info(
            "Email service initialized (%s mode)",
            "DEMO" if self.is_demo_mode else self.provider.upper(),
        )

    def _template_id_for(self, template: str) -> str:
        key = f"MSG91_EMAIL_TEMPLATE_{template.upper()}".replace("-", "_")
        return os.getenv(key, "").strip()

    def _variables_for(self, template: str, data: Dict, subject: str, title: str, cta_url: str) -> Dict:
        name = data.get("name") or data.get("guest_name") or data.get("host_name") or "there"
        variables = {
            "name": name,
            "host_name": data.get("host_name") or name,
            "guest_name": data.get("guest_name") or name,
            "customer_name": data.get("customer_name") or name,
            "property_name": data.get("property_title") or data.get("title") or "",
            "property_title": data.get("property_title") or data.get("title") or "",
            "booking_id": data.get("booking_id") or "",
            "booking_date": data.get("booking_date") or data.get("created_at") or "",
            "check_in_date": data.get("check_in_date") or "",
            "check_out_date": data.get("check_out_date") or "",
            "number_of_guests": data.get("number_of_guests") or data.get("guests") or "",
            "amount": data.get("total_amount") or data.get("amount") or "",
            "total_amount": data.get("total_amount") or data.get("amount") or "",
            "refund_amount": data.get("refund_amount") or "",
            "refund_id": data.get("refund_id") or "",
            "plan_name": data.get("plan_name") or "",
            "payment_id": data.get("payment_id") or "",
            "invoice_id": data.get("invoice_id") or data.get("transaction_id") or "",
            "reason": data.get("reason") or "",
            "remarks": data.get("remarks") or data.get("reason") or "",
            "reset_link": cta_url if template == "password_reset" else data.get("reset_link", ""),
            "action_url": cta_url,
            "support_email": "support@x-space360.com",
            "subject": subject,
            "title": title,
        }
        for index, value in enumerate(list(variables.values())[:20], start=1):
            variables[f"var{index}"] = value
            variables[f"VAR{index}"] = value
        return {k: "" if v is None else str(v) for k, v in variables.items()}

    def _send_msg91_template(self, to_email: str, template: str, subject: str, title: str, cta_url: str, data: Dict) -> Dict:
        template_id = self._template_id_for(template)
        if not template_id:
            return {"success": False, "error": f"Missing MSG91 email template id for {template}"}

        variables = self._variables_for(template, data, subject, title, cta_url)
        payload = {
            "domain": self.msg91_domain,
            "from": {"email": self.from_email, "name": self.from_name},
            "recipients": [
                {
                    "to": [{"email": to_email, "name": variables.get("name", "")}],
                    "variables": variables,
                }
            ],
            "template_id": template_id,
        }
        headers = {"authkey": self.msg91_authkey, "Content-Type": "application/json"}
        response = requests.post(self.msg91_api_url, json=payload, headers=headers, timeout=20)
        if 200 <= response.status_code < 300:
            logger.info("MSG91 email sent to %s via template %s: %s", to_email, template, response.text)
            return {
                "success": True,
                "message_id": response.text,
                "mock_mode": False,
                "provider": "msg91",
                "template": template,
            }
        logger.error("MSG91 email failed for %s template=%s status=%s body=%s", to_email, template, response.status_code, response.text)
        return {"success": False, "error": response.text, "provider": "msg91", "status_code": response.status_code}

    def _wrap(self, title: str, body: str, cta_label: str = "", cta_url: str = "") -> str:
        cta = ""
        if cta_label and cta_url:
            cta = f"""
            <p style="margin:28px 0;text-align:center;">
              <a href="{html.escape(cta_url)}" style="background:#C05C4F;color:#fff;padding:13px 24px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">
                {html.escape(cta_label)}
              </a>
            </p>
            """
        return f"""<!doctype html>
<html>
<body style="margin:0;background:#FDFCF8;font-family:Arial,Helvetica,sans-serif;color:#222;">
  <div style="max-width:640px;margin:0 auto;padding:28px 14px;">
    <div style="background:#fff;border:1px solid #EEE7DA;border-radius:14px;overflow:hidden;">
      <div style="padding:24px 28px;border-bottom:1px solid #EEE7DA;">
        <div style="font-size:22px;font-weight:800;color:#222;">x-space360<span style="color:#C05C4F;">.in</span></div>
      </div>
      <div style="padding:28px;">
        <h1 style="font-size:24px;line-height:1.25;margin:0 0 18px;color:#222;">{html.escape(title)}</h1>
        {body}
        {cta}
      </div>
      <div style="padding:18px 28px;background:#FBFAF6;color:#777;font-size:12px;line-height:1.6;">
        <div>© 2026 X-Space360. Owned & Operated by Golden Rich Financial Solutions & Real Estate Solutions Pvt Ltd.</div>
        <div>Support: support@x-space360.com</div>
      </div>
    </div>
  </div>
</body>
</html>"""

    def send_email(self, to_email: str, subject: str, html_content: str, text_content: Optional[str] = None) -> Dict:
        try:
            if not to_email:
                return {"success": False, "error": "No email address"}

            if self.is_demo_mode:
                logger.info("[MOCK EMAIL] To: %s, Subject: %s", to_email, subject)
                logger.debug("Email content: %s...", html_content[:300])
                return {
                    "success": True,
                    "message_id": f"mock_email_{int(datetime.now(timezone.utc).timestamp())}",
                    "mock_mode": True,
                }

            message = EmailMessage()
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email
            message.set_content(text_content or html.unescape(html_content.replace("<br>", "\n")))
            message.add_alternative(html_content, subtype="html")

            if self.port == 465:
                with smtplib.SMTP_SSL(self.host, self.port, timeout=20) as smtp:
                    smtp.login(self.username, self.password)
                    smtp.send_message(message)
            else:
                with smtplib.SMTP(self.host, self.port, timeout=20) as smtp:
                    smtp.starttls()
                    smtp.login(self.username, self.password)
                    smtp.send_message(message)

            return {
                "success": True,
                "message_id": f"smtp_email_{int(datetime.now(timezone.utc).timestamp())}",
                "mock_mode": False,
            }
        except Exception as e:
            logger.error("Error sending email to %s: %s", to_email, e)
            return {"success": False, "error": str(e)}

    def send_template(self, to_email: str, template: str, data: Optional[Dict] = None) -> Dict:
        data = data or {}
        name = data.get("name") or data.get("guest_name") or data.get("host_name") or "there"
        property_title = data.get("property_title") or data.get("title") or "your property"
        booking_id = data.get("booking_id", "N/A")
        subject = "X-Space360 Update"
        title = "X-Space360 Update"
        cta_label = ""
        cta_url = data.get("action_url") or os.getenv("PUBLIC_FRONTEND_URL", "https://uat.x-space360.in")
        if isinstance(cta_url, str) and cta_url.startswith("/"):
            cta_url = os.getenv("PUBLIC_FRONTEND_URL", "https://uat.x-space360.in").rstrip("/") + cta_url

        detail_rows = ""
        for label, key in [
            ("Booking ID", "booking_id"),
            ("Property", "property_title"),
            ("Check-in", "check_in_date"),
            ("Check-out", "check_out_date"),
            ("Guests", "number_of_guests"),
            ("Amount", "total_amount"),
            ("Refund", "refund_amount"),
            ("Plan", "plan_name"),
            ("Payment ID", "payment_id"),
            ("Reason", "reason"),
            ("Remarks", "remarks"),
        ]:
            if data.get(key) not in (None, ""):
                value = _money(data[key]) if key in {"total_amount", "refund_amount"} else _text(data[key])
                detail_rows += f"<tr><td style='padding:8px 10px;color:#777;'>{label}</td><td style='padding:8px 10px;font-weight:700;'>{value}</td></tr>"
        details = f"<table style='width:100%;background:#FBFAF6;border:1px solid #EEE7DA;border-radius:10px;margin:18px 0;border-collapse:separate;'>{detail_rows}</table>" if detail_rows else ""

        if template == "host_registration":
            subject = "Welcome to X-Space360 Host Network"
            title = "Host registration successful"
            body = f"<p>Dear {_text(name)},</p><p>Your host account has been created successfully. You can now complete verification and list your space.</p>"
            cta_label = "Go to Host Dashboard"
        elif template == "customer_registration":
            subject = "Welcome to X-Space360"
            title = "Registration successful"
            body = f"<p>Dear {_text(name)},</p><p>Your X-Space360 account is ready. Start exploring verified spaces for your next stay or event.</p>"
            cta_label = "Browse Properties"
        elif template == "password_reset":
            subject = "Reset your X-Space360 password"
            title = "Password reset request"
            body = f"<p>Dear {_text(name)},</p><p>Use the link below to reset your password. If you did not request this, please ignore this email.</p>"
            cta_label = "Reset Password"
        elif template == "host_documents_rejected":
            subject = "Host document verification needs correction"
            title = "Document verification rejected"
            body = f"<p>Dear {_text(name)},</p><p>Your submitted documents need correction before approval.</p>{details}<p>Please update the required documents and submit again.</p>"
            cta_label = "Update Documents"
        elif template == "host_approved":
            subject = "Your X-Space360 host profile is approved"
            title = "Host profile approved"
            body = f"<p>Dear {_text(name)},</p><p>Your host profile has been approved. You can now list and manage properties on X-Space360.</p>"
            cta_label = "List Your Space"
        elif template == "property_approved":
            subject = f"Property approved - {property_title}"
            title = "Your property is live"
            body = f"<p>Dear {_text(name)},</p><p><strong>{_text(property_title)}</strong> has been approved and is now visible on X-Space360.</p>{details}"
            cta_label = "View Property"
        elif template == "property_rejected":
            subject = f"Property not approved - {property_title}"
            title = "Property needs changes"
            body = f"<p>Dear {_text(name)},</p><p><strong>{_text(property_title)}</strong> was not approved. Please review the remarks and resubmit.</p>{details}"
            cta_label = "Update Property"
        elif template == "subscription_activated":
            subject = "Subscription activated"
            title = "Your subscription is active"
            body = f"<p>Dear {_text(name)},</p><p>Your X-Space360 subscription has been activated successfully.</p>{details}"
        elif template == "subscription_failed":
            subject = "Subscription payment failed"
            title = "Subscription payment failed"
            body = f"<p>Dear {_text(name)},</p><p>We could not activate your subscription because the payment failed.</p>{details}<p>Please try again.</p>"
            cta_label = "Retry Payment"
        elif template == "invoice_sent":
            subject = data.get("subject") or "Invoice from X-Space360"
            title = "Invoice shared"
            body = f"<p>Dear {_text(name)},</p><p>An invoice has been shared with you by the X-Space360 team.</p>{details}"
            cta_label = "View Invoice" if data.get("invoice_url") else ""
            cta_url = data.get("invoice_url") or cta_url
        elif template == "booking_confirmation":
            subject = f"Booking confirmed - {property_title}"
            title = "Booking confirmed"
            body = f"<p>Dear {_text(name)},</p><p>Your booking is confirmed. We have included your stay details below.</p>{details}"
            cta_label = "View Booking"
        elif template == "booking_reminder":
            subject = f"Booking reminder - {property_title}"
            title = "Your booking is coming up"
            body = f"<p>Dear {_text(name)},</p><p>This is a reminder for your upcoming booking.</p>{details}"
        elif template == "review_reminder":
            subject = f"How was your stay at {property_title}?"
            title = "Share your review"
            body = f"<p>Dear {_text(name)},</p><p>We hope you enjoyed your experience at <strong>{_text(property_title)}</strong>. Please share your review.</p>{details}"
            cta_label = "Write Review"
        elif template == "refund":
            subject = f"Refund update - Booking {booking_id}"
            title = "Refund processed"
            body = f"<p>Dear {_text(name)},</p><p>Your refund has been processed. Details are below.</p>{details}"
        elif template == "booking_cancellation":
            subject = f"Booking cancelled - {property_title}"
            title = "Booking cancelled"
            body = f"<p>Dear {_text(name)},</p><p>Your booking has been cancelled.</p>{details}"
        else:
            body = f"<p>Dear {_text(name)},</p><p>{_text(data.get('message', 'You have a new update from X-Space360.'))}</p>{details}"

        if self.provider == "msg91" and not self.is_demo_mode:
            return self._send_msg91_template(to_email, template, subject, title, cta_url, data)

        return self.send_email(to_email, subject, self._wrap(title, body, cta_label, cta_url))

    def send_booking_confirmation(self, to_email: str, booking_data: Dict) -> Dict:
        return self.send_template(to_email, "booking_confirmation", booking_data)

    def send_property_approved(self, to_email: str, property_data: Dict) -> Dict:
        return self.send_template(to_email, "property_approved", property_data)

    def send_subscription_reminder(self, to_email: str, days_remaining: int, subscription_data: Dict) -> Dict:
        data = {**(subscription_data or {}), "message": f"Your subscription expires in {days_remaining} days."}
        return self.send_template(to_email, "subscription_expiring", data)


email_service = EmailService()
