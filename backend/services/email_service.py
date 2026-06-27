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


def _clean_msg91_value(value) -> str:
    """Keep template variables plain so MSG91 does not render pasted code fences."""
    if value is None:
        return ""
    text = str(value).strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].strip().startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return text


def _support_email() -> str:
    return (
        os.getenv("SUPPORT_EMAIL", "").strip()
        or os.getenv("CUSTOMER_SUPPORT_EMAIL", "").strip()
        or os.getenv("CUSTOMER_SUPPORT_MAIL", "").strip()
        or os.getenv("EMAIL_SUPPORT_ADDRESS", "").strip()
        or "support@x-space360.com"
    )


def _support_phone() -> str:
    return (
        os.getenv("SUPPORT_PHONE", "").strip()
        or os.getenv("CUSTOMER_SUPPORT_PHONE", "").strip()
        or os.getenv("CUSTOMER_SUPPORT_NUMBER", "").strip()
        or os.getenv("HELPLINE_NUMBER", "").strip()
        or os.getenv("SUPPORT_NUMBER", "").strip()
        or "+91 8484826247"
    )


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
        normalized = template.upper().replace("-", "_")
        candidates = [f"MSG91_EMAIL_TEMPLATE_{normalized}"]
        aliases = {
            "SUBSCRIPTION_EXPIRING": [
                "MSG91_EMAIL_TEMPLATE_SUBSCRIPTION_RENEWAL_REMINDER",
            ],
            "SUBSCRIPTION_RENEWAL_REMINDER": [
                "MSG91_EMAIL_TEMPLATE_SUBSCRIPTION_RENEWAL_REMINDER",
                "MSG91_EMAIL_TEMPLATE_SUBSCRIPTION_EXPIRING",
            ],
            "PAYMENT_CONFIRMATION": [
                "MSG91_EMAIL_TEMPLATE_PAYMENT_CONFIRMATION",
                "MSG91_EMAIL_TEMPLATE_SUBSCRIPTION_ACTIVATED",
            ],
            "NEW_BOOKING": [
                "MSG91_EMAIL_TEMPLATE_NEW_BOOKING",
                "MSG91_EMAIL_TEMPLATE_BOOKING_CONFIRMATION",
            ],
            "TERMS_AND_CONDITIONS": [
                "MSG91_EMAIL_TEMPLATE_TERMS_AND_CONDITIONS",
            ],
            "PRIVACY_POLICY_UPDATE": [
                "MSG91_EMAIL_TEMPLATE_PRIVACY_POLICY_UPDATE",
            ],
        }
        candidates.extend(aliases.get(normalized, []))
        for key in candidates:
            value = os.getenv(key, "").strip()
            if value:
                return value
        return ""

    def _variables_for(self, template: str, data: Dict, subject: str, title: str, cta_url: str) -> Dict:
        name = data.get("name") or data.get("guest_name") or data.get("host_name") or "there"
        email = data.get("email") or data.get("email_address") or data.get("Email") or ""
        mobile = data.get("mobile") or data.get("phone") or data.get("Mobile") or ""
        property_title = data.get("property_title") or data.get("property_name") or data.get("title") or ""
        booking_id = data.get("booking_id") or data.get("Booking_ID") or ""
        booking_date = data.get("booking_date") or data.get("created_at") or data.get("Booking_Date") or ""
        check_in_date = data.get("check_in_date") or data.get("Check_In_Date") or ""
        check_out_date = data.get("check_out_date") or data.get("Check_Out_Date") or ""
        guests = data.get("number_of_guests") or data.get("guests") or data.get("Guests") or ""
        total_amount = data.get("total_amount") or data.get("amount") or data.get("Total_Amount") or ""
        refund_amount = data.get("refund_amount") or data.get("Refund_Amount") or ""
        plan_name = data.get("plan_name") or data.get("Plan_Name") or ""
        payment_id = data.get("payment_id") or data.get("Payment_ID") or ""
        invoice_id = data.get("invoice_id") or data.get("transaction_id") or data.get("Invoice_ID") or ""
        reason = (
            data.get("reason")
            or data.get("Reason")
            or data.get("rejection_reason")
            or data.get("Rejection_Reason")
            or ""
        )
        remarks = (
            data.get("remarks")
            or data.get("Remarks")
            or data.get("rejection_reason")
            or data.get("Rejection_Reason")
            or reason
        )
        reset_link = cta_url if template == "password_reset" else data.get("reset_link", "")
        support_email = data.get("support_email") or data.get("Support_Email") or _support_email()
        support_phone = data.get("support_phone") or data.get("support_number") or data.get("Support_Number") or _support_phone()
        frontend_url = os.getenv("PUBLIC_FRONTEND_URL", "https://uat.x-space360.in").rstrip("/")
        dashboard_url = data.get("dashboard_url") or data.get("Dashboard_URL") or f"{frontend_url}/host/dashboard"
        variables = {
            "name": name,
            "host_name": data.get("host_name") or name,
            "guest_name": data.get("guest_name") or name,
            "customer_name": data.get("customer_name") or name,
            "email": email,
            "email_address": email,
            "mobile": mobile,
            "phone": mobile,
            "property_name": property_title,
            "property_title": property_title,
            "booking_id": booking_id,
            "booking_date": booking_date,
            "check_in_date": check_in_date,
            "check_out_date": check_out_date,
            "number_of_guests": guests,
            "guests": guests,
            "amount": total_amount,
            "total_amount": total_amount,
            "refund_amount": refund_amount,
            "refund_id": data.get("refund_id") or "",
            "plan_name": plan_name,
            "payment_id": payment_id,
            "invoice_id": invoice_id,
            "reason": reason,
            "remarks": remarks,
            "reset_link": reset_link,
            "action_url": cta_url,
            "action_link": cta_url,
            "cta_url": cta_url,
            "cta_link": cta_url,
            "button_url": cta_url,
            "button_link": cta_url,
            "button_link_url": cta_url,
            "link": cta_url,
            "url": cta_url,
            "redirect_url": cta_url,
            "login_url": cta_url,
            "dashboard_url": dashboard_url,
            "dashboard_link": dashboard_url,
            "property_url": data.get("property_url") or cta_url,
            "booking_url": data.get("booking_url") or cta_url,
            "invoice_url": data.get("invoice_url") or cta_url,
            "upload_corrected_documents_url": cta_url,
            "upload_corrected_documents_link": cta_url,
            "reupload_documents_url": cta_url,
            "reupload_documents_link": cta_url,
            "documents_url": cta_url,
            "document_upload_link": cta_url,
            "document_upload_url": cta_url,
            "rejection_reason": remarks,
            "reason_for_rejection": remarks,
            "document_type": data.get("document_type") or data.get("Document_Type") or "",
            "support_email": support_email,
            "customer_support_email": support_email,
            "customer_support_mail": support_email,
            "support_phone": support_phone,
            "support_number": support_phone,
            "customer_support_phone": support_phone,
            "customer_support_number": support_phone,
            "helpline_number": support_phone,
            "contact_number": support_phone,
            "subject": subject,
            "title": title,
        }
        for key, value in data.items():
            if isinstance(key, str) and key not in variables:
                variables[key] = value
        title_case_aliases = {
            "Name": name,
            "User_Name": name,
            "Host_Name": data.get("host_name") or name,
            "Guest_Name": data.get("guest_name") or name,
            "Customer_Name": data.get("customer_name") or name,
            "Email": email,
            "Email_Address": email,
            "Mobile": mobile,
            "Phone": mobile,
            "Property_Name": property_title,
            "Property_Title": property_title,
            "Booking_ID": booking_id,
            "Booking_Date": booking_date,
            "Check_In_Date": check_in_date,
            "Check_Out_Date": check_out_date,
            "Guests": guests,
            "Number_Of_Guests": guests,
            "Amount": total_amount,
            "Total_Amount": total_amount,
            "Refund_Amount": refund_amount,
            "Refund_ID": data.get("refund_id") or "",
            "Plan_Name": plan_name,
            "Payment_ID": payment_id,
            "Invoice_ID": invoice_id,
            "Reason": reason,
            "Remarks": remarks,
            "Reset_Link": reset_link,
            "Action_URL": cta_url,
            "Action_Url": cta_url,
            "Action_Link": cta_url,
            "CTA_URL": cta_url,
            "Cta_Url": cta_url,
            "CTA_Link": cta_url,
            "Button_URL": cta_url,
            "Button_Url": cta_url,
            "Button_Link": cta_url,
            "Button_Link_URL": cta_url,
            "Link": cta_url,
            "URL": cta_url,
            "Url": cta_url,
            "Redirect_URL": cta_url,
            "Login_URL": cta_url,
            "Dashboard_URL": dashboard_url,
            "Dashboard_Url": dashboard_url,
            "Dashboard_Link": dashboard_url,
            "Property_URL": data.get("property_url") or cta_url,
            "Booking_URL": data.get("booking_url") or cta_url,
            "Invoice_URL": data.get("invoice_url") or cta_url,
            "Upload_Corrected_Documents_URL": cta_url,
            "Upload_Corrected_Documents_Link": cta_url,
            "Reupload_Documents_URL": cta_url,
            "Reupload_Documents_Link": cta_url,
            "Documents_URL": cta_url,
            "Document_Upload_Link": cta_url,
            "Document_Upload_URL": cta_url,
            "Rejection_Reason": remarks,
            "Reason_For_Rejection": remarks,
            "Reason_for_Rejection": remarks,
            "Document_Type": data.get("document_type") or data.get("Document_Type") or "",
            "Support_Email": support_email,
            "Customer_Support_Email": support_email,
            "Customer_Support_Mail": support_email,
            "Support_Phone": support_phone,
            "Support_Number": support_phone,
            "Customer_Support_Phone": support_phone,
            "Customer_Support_Number": support_phone,
            "Helpline_Number": support_phone,
            "Contact_Number": support_phone,
        }
        variables.update(title_case_aliases)

        # Exact Handlebars contract used by the MSG91 rejection template.
        if template == "host_documents_rejected":
            variables.update(
                {
                    "User_Name": name,
                    "Rejection_Reason": remarks,
                    "Document_Upload_Link": cta_url,
                    "Support_Email": support_email,
                    "Support_Number": support_phone,
                }
            )
        for index, value in enumerate(list(variables.values())[:20], start=1):
            variables[f"var{index}"] = value
            variables[f"VAR{index}"] = value
        return {k: _clean_msg91_value(v) for k, v in variables.items()}

    def _send_msg91_template(self, to_email: str, template: str, subject: str, title: str, cta_url: str, data: Dict) -> Dict:
        template_id = self._template_id_for(template)
        if not template_id:
            return {"success": False, "error": f"Missing MSG91 email template id for {template}"}

        variables = self._variables_for(template, data, subject, title, cta_url)
        if template == "host_documents_rejected":
            logger.info(
                "MSG91 rejection values resolved: reason=%r upload_url=%r support_email=%r support_number=%r",
                variables.get("Rejection_Reason"),
                variables.get("Document_Upload_Link"),
                variables.get("Support_Email"),
                variables.get("Support_Number"),
            )
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
        logger.info("MSG91 email variables for template %s: %s", template, sorted(variables.keys()))
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
        elif template in {"subscription_expiring", "subscription_renewal_reminder"}:
            days_remaining = data.get("days_remaining") or data.get("Days_Remaining") or ""
            subject = "Subscription renewal reminder"
            title = "Your subscription renewal is coming up"
            body = f"<p>Dear {_text(name)},</p><p>Your X-Space360 subscription is due for renewal{f' in {_text(days_remaining)} days' if days_remaining else ''}.</p>{details}"
            cta_label = "Renew Subscription"
        elif template == "payment_confirmation":
            subject = "Payment confirmation"
            title = "Payment received"
            body = f"<p>Dear {_text(name)},</p><p>Your payment has been received successfully.</p>{details}"
            cta_label = "View Payment"
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
        elif template == "new_booking":
            subject = f"New booking - {property_title}"
            title = "You have a new booking"
            body = f"<p>Dear {_text(name)},</p><p>A new booking has been created for <strong>{_text(property_title)}</strong>.</p>{details}"
            cta_label = "View Booking"
        elif template == "terms_and_conditions":
            subject = "Terms and conditions update"
            title = "Terms and conditions updated"
            body = f"<p>Dear {_text(name)},</p><p>Our terms and conditions have been updated. Please review the latest version.</p>"
            cta_label = "Review Terms"
            cta_url = data.get("terms_url") or os.getenv("PUBLIC_FRONTEND_URL", "https://uat.x-space360.in").rstrip("/") + "/terms-and-conditions"
        elif template == "privacy_policy_update":
            subject = "Privacy policy update"
            title = "Privacy policy updated"
            body = f"<p>Dear {_text(name)},</p><p>Our privacy policy has been updated. Please review the latest version.</p>"
            cta_label = "Review Privacy Policy"
            cta_url = data.get("privacy_url") or os.getenv("PUBLIC_FRONTEND_URL", "https://uat.x-space360.in").rstrip("/") + "/privacy-policy"
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
