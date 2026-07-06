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
            "PAYMENT_CONFIRMATION": ["MSG91_EMAIL_TEMPLATE_PAYMENT_CONFIRMATION"],
            "NEW_BOOKING": ["MSG91_EMAIL_TEMPLATE_NEW_BOOKING"],
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
        import re
        from datetime import datetime, date, timezone

        def _format_friendly_amount(value) -> str:
            try:
                val = float(value or 0)
            except (TypeError, ValueError):
                val = 0.0
            if val.is_integer():
                return f"{int(val):,}"
            else:
                return f"{val:,.2f}"

        def _format_friendly_date(value) -> str:
            if not value:
                return ""
            if isinstance(value, str):
                try:
                    if "T" in value:
                        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
                    else:
                        dt = datetime.strptime(value, "%Y-%m-%d")
                    value = dt
                except Exception:
                    return value
            if isinstance(value, (datetime, date)):
                return value.strftime("%d %B %Y")
            return str(value)

        def _format_friendly_time(value) -> str:
            if not value:
                return ""
            if isinstance(value, str):
                try:
                    if "T" in value:
                        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
                        return dt.strftime("%I:%M %p")
                except Exception:
                    pass
                return value
            if isinstance(value, datetime):
                return value.strftime("%I:%M %p")
            return str(value)

        def get_words(s: str) -> list:
            s = s.replace("-", "_").replace(" ", "_")
            s = re.sub(r'([A-Z])', r'_\1', s)
            return [p.lower() for p in s.split("_") if p]

        # 1. Resolve raw values from input data (case-insensitive key lookup)
        def get_val(keys_list, default=""):
            for k in keys_list:
                for dk, dv in data.items():
                    if dk.lower() == k.lower():
                        if dv is not None:
                            return dv
            return default

        # 2. Extract base fields
        name = get_val(["name", "customer_name", "user_name", "guest_name", "full_name", "host_name"], "there")
        host_name = get_val(["host_name"], name)
        guest_name = get_val(["guest_name", "customer_name"], name)
        email = get_val(["email", "email_address", "mail_id"], "")
        mobile = get_val(["mobile", "phone", "mobile_number", "contact_number"], "")
        property_title = get_val(["property_title", "property_name", "title"], "")
        property_id = get_val(["property_id"], "")
        property_address = get_val(["property_address", "address", "location"], "")
        
        # Booking details
        booking_id = get_val(["booking_id"], "")
        booking_date = get_val(["booking_date", "created_at"], "")
        check_in_date = get_val(["check_in_date"], "")
        check_in_time = get_val(["check_in_time"], "12:00 PM")
        check_out_date = get_val(["check_out_date"], "")
        check_out_time = get_val(["check_out_time"], "11:00 AM")
        
        # Payment / transaction details
        transaction_id = get_val(["transaction_id", "payment_id", "razorpay_payment_id", "razorpay_subscription_id", "refund_id", "razorpay_refund_id", "invoice_number", "invoice_id"], "")
        amount = get_val(["amount", "total_amount", "plan_amount", "refund_amount", "renewal_amount"], "")
        
        # Host contact / customer support
        host_mobile = get_val(["host_mobile", "host_phone", "host_contact"], "N/A")
        support_number = get_val(["support_number", "customer_support_number", "support_phone", "contact_number"], _support_phone())
        support_email = get_val(["support_email", "customer_support_email", "support_mail", "customer_support_mail"], _support_email())
        
        # Check-in instructions
        check_in_instructions = get_val(["check_in_instructions", "check-in_instructions", "checkin_instructions"], "Please contact the host upon arrival.")
        
        # Rejections / cancellations / failures
        rejection_reason = get_val(["rejection_reason", "cancellation_reason", "failure_reason", "reason", "remarks"], "")
        
        # Dates
        cancellation_date = get_val(["cancellation_date", "cancelled_at"], "")
        refund_date = get_val(["refund_date", "refunded_at"], "")
        payment_date = get_val(["payment_date", "confirmed_at", "paid_at"], "")
        activation_date = get_val(["activation_date", "activated_at"], "")
        expiry_date = get_val(["expiry_date", "end_date", "expires_at", "expiry_at"], "")
        request_date = get_val(["request_date", "created_at"], "")
        reset_request_time = get_val(["reset_request_time", "created_at"], "")
        attempt_date = get_val(["attempt_date", "failed_at"], "")
        effective_date = get_val(["effective_date"], "")
        
        # Subscriptions
        subscription_id = get_val(["subscription_id"], "")
        plan_name = get_val(["plan_name"], "")
        auto_renewal_status = get_val(["auto_renewal_status", "auto_renewal", "auto_renew"], "")
        if auto_renewal_status:
            if str(auto_renewal_status).lower() in ("true", "1", "active", "yes", "enabled"):
                auto_renewal_status = "Active"
            else:
                auto_renewal_status = "Disabled"
        else:
            auto_renewal_status = "Disabled"

        # GST details
        gst_number = get_val(["gst_number", "gst_no"], "N/A")
        gst_amount = get_val(["gst_amount", "gst_val"], "")
        
        # Guest Count
        guests = get_val(["guests", "number_of_guests", "guest_count", "guest_cnt"], "")
        
        # Payment Method
        payment_method = get_val(["payment_method"], "Razorpay")

        # Fallbacks for empty fields based on current time
        now = datetime.now(timezone.utc)
        if not request_date:
            request_date = now
        if not reset_request_time:
            reset_request_time = now
        if not booking_date:
            booking_date = now
        if not payment_date:
            payment_date = now
        if not refund_date:
            refund_date = now
        if not cancellation_date:
            cancellation_date = now
        if not attempt_date:
            attempt_date = now
        if not effective_date:
            effective_date = now
        if not activation_date:
            activation_date = now

        # 3. Format friendly representations
        formatted_booking_date = _format_friendly_date(booking_date)
        formatted_check_in_date = _format_friendly_date(check_in_date)
        formatted_check_out_date = _format_friendly_date(check_out_date)
        formatted_cancellation_date = _format_friendly_date(cancellation_date)
        formatted_refund_date = _format_friendly_date(refund_date)
        formatted_payment_date = _format_friendly_date(payment_date)
        formatted_activation_date = _format_friendly_date(activation_date)
        formatted_expiry_date = _format_friendly_date(expiry_date)
        formatted_request_date = _format_friendly_date(request_date)
        formatted_attempt_date = _format_friendly_date(attempt_date)
        formatted_effective_date = _format_friendly_date(effective_date)
        
        formatted_check_in_time = _format_friendly_time(check_in_time)
        formatted_check_out_time = _format_friendly_time(check_out_time)
        formatted_reset_request_time = _format_friendly_time(reset_request_time)
        
        formatted_amount = _format_friendly_amount(amount)
        formatted_gst_amount = _format_friendly_amount(gst_amount)

        # 4. Construct base variables dictionary
        base_vars = {
            # Names
            "customer_name": name,
            "user_name": name,
            "host_name": host_name,
            "guest_name": guest_name,
            # Contacts
            "email": email,
            "mobile": mobile,
            # Booking
            "booking_id": booking_id,
            "booking_date": formatted_booking_date,
            "property_name": property_title,
            "property_id": property_id,
            "property_address": property_address,
            "check_in_date": formatted_check_in_date,
            "check_in_time": formatted_check_in_time,
            "check_out_date": formatted_check_out_date,
            "check_out_time": formatted_check_out_time,
            "host_mobile": host_mobile,
            "check_in_instructions": check_in_instructions,
            "guests": guests,
            "guest_count": guests,
            # Payment
            "transaction_id": transaction_id,
            "invoice_number": transaction_id,
            "refund_reference_number": transaction_id,
            "amount": formatted_amount,
            "plan_amount": formatted_amount,
            "refund_amount": formatted_amount,
            "renewal_amount": formatted_amount,
            "gst_amount": formatted_gst_amount,
            "gst_number": gst_number,
            "payment_method": payment_method,
            # Support
            "support_number": support_number,
            "customer_support_number": support_number,
            "support_email": support_email,
            "customer_support_email": support_email,
            # Rejection / Cancellation / Failure
            "cancellation_reason": rejection_reason,
            "rejection_reason": rejection_reason,
            "failure_reason": rejection_reason,
            "reason": rejection_reason,
            # Dates
            "cancellation_date": formatted_cancellation_date,
            "refund_date": formatted_refund_date,
            "payment_date": formatted_payment_date,
            "activation_date": formatted_activation_date,
            "expiry_date": formatted_expiry_date,
            "request_date": formatted_request_date,
            "reset_request_time": formatted_reset_request_time,
            "attempt_date": formatted_attempt_date,
            "effective_date": formatted_effective_date,
            # Subscriptions
            "subscription_id": subscription_id,
            "plan_name": plan_name,
            "auto_renewal_status": auto_renewal_status,
        }

        # 5. Add CTA button mappings
        cta_buttons = [
            "action_url", "action_link", "cta_url", "cta_link", "button_url", "button_link", "link", "url", "redirect_url",
            "view_cancellation_policy", "view_cancellation_policy_url", "view_cancellation_policy_link",
            "login_to_your_account", "login_to_your_account_url", "login_to_your_account_link",
            "update_property", "update_property_url", "update_property_link",
            "manage_subscription", "manage_subscription_url", "manage_subscription_link",
            "leave_your_review", "leave_your_review_url", "leave_your_review_link",
            "view_updated_privacy_policy", "view_updated_privacy_policy_url", "view_updated_privacy_policy_link",
            "view_updated_terms_conditions", "view_updated_terms_conditions_url", "view_updated_terms_conditions_link",
            "view_updated_terms_and_conditions", "view_updated_terms_and_conditions_url", "view_updated_terms_and_conditions_link",
            "retry_subscription_payment", "retry_subscription_payment_url", "retry_subscription_payment_link",
            "renew_subscription", "renew_subscription_url", "renew_subscription_link",
            "reset_password", "reset_password_url", "reset_password_link", "reset_link",
            "view_booking", "view_booking_url", "view_booking_link", "booking_url", "booking_link",
            "view_invoice", "view_invoice_url", "view_invoice_link", "invoice_url", "invoice_link",
            "document_upload_link", "document_upload_url", "upload_corrected_documents_url", "upload_corrected_documents_link",
            "reupload_documents_url", "reupload_documents_link", "documents_url"
        ]
        for btn in cta_buttons:
            base_vars[btn] = cta_url

        # 6. Merge caller-provided data dictionary
        merged_vars = {}
        for dk, dv in data.items():
            if isinstance(dk, str):
                merged_vars[dk] = dv
        merged_vars.update(base_vars)

        # 7. Generate casing variations for all resolved variables
        variables = {}
        for key, value in list(merged_vars.items()):
            # Always preserve raw keys passed
            variables[key] = value
            
            keys_to_process = [key]
            normalized_key = key.replace("-", "_").replace(" ", "_")
            if normalized_key != key:
                keys_to_process.append(normalized_key)
            
            for k in keys_to_process:
                words = get_words(k)
                if not words:
                    words = [k]
                
                sc = "_".join(words)
                usc = sc.upper()
                variables[sc] = value
                variables[usc] = value
                
                # Standard capitalization
                tsc_std = "_".join(w.capitalize() for w in words)
                cc_std = words[0] + "".join(w.capitalize() for w in words[1:])
                pc_std = "".join(w.capitalize() for w in words)
                hc_std = "-".join(w.capitalize() for w in words)
                
                variables[tsc_std] = value
                variables[cc_std] = value
                variables[pc_std] = value
                variables[hc_std] = value
                
                # Acronym-aware capitalization
                def cap_word(w: str) -> str:
                    if w.lower() in ("id", "url", "cta", "gst", "sms"):
                        return w.upper()
                    return w.capitalize()
                
                tsc_acr = "_".join(cap_word(w) for w in words)
                cc_acr = (cap_word(words[0]) if words[0].lower() in ("id", "url", "cta", "gst", "sms") else words[0]) + "".join(cap_word(w) for w in words[1:])
                pc_acr = "".join(cap_word(w) for w in words)
                hc_acr = "-".join(cap_word(w) for w in words)
                
                variables[tsc_acr] = value
                variables[cc_acr] = value
                variables[pc_acr] = value
                variables[hc_acr] = value
                
                # Lowercase and uppercase variants
                lc = "".join(words)
                uc = lc.upper()
                variables[lc] = value
                variables[uc] = value
                
                # Hyphenated lowercase/Title variants
                hc = "-".join(words)
                thc_std = "-".join(w.capitalize() for w in words)
                thc_acr = "-".join(cap_word(w) for w in words)
                variables[hc] = value
                variables[thc_std] = value
                variables[thc_acr] = value
                
                # Hybrid check-in / check-out variations (e.g. Check-In_Instructions)
                if len(words) >= 2 and words[0] == "check" and words[1] in ("in", "out"):
                    first_part_lower = f"check-{words[1]}"
                    first_part_upper = f"CHECK-{words[1].upper()}"
                    first_part_title = f"Check-{words[1].capitalize()}"
                    
                    rest_words = words[2:]
                    if rest_words:
                        hy_lc = f"{first_part_lower}_" + "_".join(rest_words)
                        hy_uc = f"{first_part_upper}_" + "_".join(w.upper() for w in rest_words)
                        hy_th_std = f"{first_part_title}_" + "_".join(w.capitalize() for w in rest_words)
                        hy_th_acr = f"{first_part_title}_" + "_".join(cap_word(w) for w in rest_words)
                        
                        variables[hy_lc] = value
                        variables[hy_uc] = value
                        variables[hy_th_std] = value
                        variables[hy_th_acr] = value
                        
                        # Also support uppercase suffix for acronym-aware if needed
                    else:
                        variables[first_part_lower] = value
                        variables[first_part_upper] = value
                        variables[first_part_title] = value
                
                if "-" in k:
                    variables[k] = value
                    variables[k.lower()] = value
                    variables[k.upper()] = value

        # 8. Add fallback var1..var20 mappings (for backward compatibility if needed)
        for index, value in enumerate(list(base_vars.values())[:20], start=1):
            variables[f"var{index}"] = value
            variables[f"VAR{index}"] = value

        # 9. Pin the exact variable names used by the production MSG91
        # templates. These explicit assignments intentionally happen last so
        # casing/alias generation can never replace a button URL.
        exact_cta_variables = {
            "subscription_activated": (
                "Manage_Subscription",
                "Manage_Subscription_URL",
                "Manage_Subscription_Link",
            ),
            "property_rejected": (
                "Update_Property",
                "Update_Property_URL",
                "Update_Property_Link",
            ),
            "property_approved": (
                "Button_URL",
                "Action_URL",
                "Dashboard_URL",
            ),
            "review_reminder": (
                "Leave_Your_Review",
                "Leave_Your_Review_URL",
                "Leave_Your_Review_Link",
            ),
            "customer_registration": (
                "Login_To_Your_Account",
                "Login_To_Your_Account_URL",
                "Login_To_Your_Account_Link",
            ),
            "booking_confirmation": (
                "View_Cancellation_Policy",
                "View_Cancellation_Policy_URL",
                "View_Cancellation_Policy_Link",
            ),
            "booking_reminder": (
                "View_Booking",
                "View_Booking_URL",
                "View_Booking_Link",
            ),
            "payment_confirmation": (
                "View_Booking",
                "View_Booking_URL",
                "View_Booking_Link",
            ),
            "new_booking": (
                "View_Booking",
                "View_Booking_URL",
                "View_Booking_Link",
            ),
        }
        for variable_name in exact_cta_variables.get(template, ()):
            variables[variable_name] = cta_url

        if template == "property_rejected":
            variables.update(
                {
                    "Property_Name": property_title,
                    "Property_ID": property_id,
                    "Rejection_Reason": rejection_reason,
                }
            )
        elif template == "subscription_activated":
            variables.update(
                {
                    "Subscription_ID": subscription_id,
                    "Plan_Name": plan_name,
                    "Activation_Date": formatted_activation_date,
                    "Expiry_Date": formatted_expiry_date,
                    "Auto_Renewal_Status": auto_renewal_status,
                }
            )
        elif template == "new_booking":
            variables.update(
                {
                    "Host_Name": host_name,
                    "Guest_Name": guest_name,
                    "Property_Name": property_title,
                    "Booking_ID": booking_id,
                }
            )
        elif template == "payment_confirmation":
            variables.update(
                {
                    "Customer_Name": name,
                    "Property_Name": property_title,
                    "Booking_ID": booking_id,
                    "Transaction_ID": transaction_id,
                    "Payment_Date": formatted_payment_date,
                }
            )

        # 10. Clean values and return
        return {k: _clean_msg91_value(v) for k, v in variables.items()}

    def _send_msg91_template(self, to_email: str, template: str, subject: str, title: str, cta_url: str, data: Dict) -> Dict:
        template_id = self._template_id_for(template)
        if not template_id:
            return {"success": False, "error": f"Missing MSG91 email template id for {template}"}

        variables = self._variables_for(template, data, subject, title, cta_url)
        logger.info("MSG91 CTA resolved template=%s url=%s", template, cta_url)
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
        frontend_url = os.getenv("PUBLIC_FRONTEND_URL", "https://uat.x-space360.in").rstrip("/")

        # Keep every MSG91 button on a real application route. Protected routes
        # preserve their destination through login in the frontend.
        if template in {"host_registration", "subscription_activated"}:
            cta_url = data.get("action_url") or f"{frontend_url}/host/dashboard"
        elif template == "customer_registration":
            cta_url = data.get("action_url") or f"{frontend_url}/dashboard"
        elif template == "property_approved":
            cta_url = data.get("action_url") or f"{frontend_url}/host/dashboard"
        elif template == "property_rejected":
            property_id = data.get("property_id") or ""
            cta_url = data.get("action_url") or (
                f"{frontend_url}/host/list-property?edit={property_id}"
                if property_id else f"{frontend_url}/host/dashboard"
            )
        elif template == "review_reminder":
            cta_url = data.get("deep_link") or data.get("action_url") or f"{frontend_url}/guest/bookings"
        elif template == "booking_confirmation":
            cta_url = data.get("cancellation_policy_url") or f"{frontend_url}/?footer=safety-privacy"

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
