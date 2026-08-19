from datetime import datetime, timezone, timedelta
import re
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, EmailStr

from middleware.auth_middleware import get_current_user
from models.user import UserRole
from services.audit_service import write_audit_log
from services.booking_calculation_service import (
    calculate_host_payout_breakdown,
    get_booking_payment_config,
)
from services.permission_service import ensure_default_permissions
from services.tds_service import (
    calculate_host_payout_tds,
    get_active_tds_config,
    get_host_tax_profile,
    save_tds_config,
)


router = APIRouter(prefix="/admin/core", tags=["Admin Core"])


async def get_db():
    from server import db_instance
    return db_instance


async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


async def _resolve_assignee_user(db: AsyncIOMotorDatabase, value: Optional[str], role: str):
    identifier = (value or "").strip()
    if not identifier:
        return None
    query = {"role": role}
    if role == "broker":
        query["$or"] = [
            {"user_id": identifier},
            {"lg_code": {"$regex": f"^{re.escape(identifier)}$", "$options": "i"}},
            {"employee_code": {"$regex": f"^{re.escape(identifier)}$", "$options": "i"}},
            {"uid": {"$regex": f"^{re.escape(identifier)}$", "$options": "i"}},
        ]
    else:
        query["$or"] = [
            {"user_id": identifier},
            {"employee_code": {"$regex": f"^{re.escape(identifier)}$", "$options": "i"}},
            {"uid": {"$regex": f"^{re.escape(identifier)}$", "$options": "i"}},
        ]
    return await db.users.find_one(query, {"_id": 0})


def _is_branch_manager_user(user: Optional[dict]) -> bool:
    if not user:
        return False
    role_key = str(user.get("admin_role_key") or "").lower()
    designation = str(user.get("designation") or "").lower()
    base_role = str(user.get("role") or "").lower()
    return base_role == "employee" and ("branch_manager" in role_key or "branch manager" in designation)


def _is_rm_user(user: Optional[dict]) -> bool:
    if not user:
        return False
    role_key = str(user.get("admin_role_key") or "").lower()
    designation = str(user.get("designation") or "").lower()
    base_role = str(user.get("role") or "").lower()
    return base_role == "employee" and not _is_branch_manager_user(user) and (
        role_key in {"rm", "relationship_manager"} or "relationship" in designation or designation == "rm"
    )


def _team_code(user: Optional[dict], fallback: str = "") -> str:
    if not user:
        return fallback or ""
    if str(user.get("role") or "").lower() == "broker":
        return user.get("lg_code") or user.get("employee_code") or user.get("uid") or fallback or user.get("user_id") or ""
    return user.get("employee_code") or user.get("uid") or fallback or user.get("user_id") or ""


def _assignment_ref(source: Optional[dict], field: str) -> str:
    if not source:
        return ""
    value = source.get(field)
    return value if value not in (None, "", "-", "NA", "N/A") else ""


def _property_team_assignment(prop: dict, owner: Optional[dict]) -> dict:
    owner_found = bool(owner and owner.get("user_id"))
    return {
        "broker": _assignment_ref(owner, "broker_id") if owner_found else _assignment_ref(prop, "broker_id"),
        "rm": _assignment_ref(owner, "rm_id") if owner_found else _assignment_ref(prop, "rm_id"),
        "branch_manager": _assignment_ref(owner, "branch_manager_id") if owner_found else _assignment_ref(prop, "branch_manager_id"),
        "branch_manager_code": _assignment_ref(owner, "branch_manager_code") if owner_found else _assignment_ref(prop, "branch_manager_code"),
    }


def _truthy_flag(value) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"true", "1", "yes", "approved", "completed"}
    return bool(value)


def _property_operations_stage(prop: dict, assignment: dict, verification: Optional[dict]) -> str:
    status_value = str(prop.get("status") or "").strip().lower()
    verification = verification or {}
    if status_value == "live":
        return "live"
    if status_value in {"rejected", "blocked", "deleted_by_account_request"}:
        return status_value
    if prop.get("is_boosted"):
        return "boosted"

    is_reviewable = status_value in {"pending_verification", "under_review"}
    if not is_reviewable:
        return status_value or "all"

    broker_assigned = bool(assignment.get("broker"))
    rm_assigned = bool(assignment.get("rm"))
    bm_assigned = bool(assignment.get("branch_manager") or assignment.get("branch_manager_code"))
    broker_done = (
        not broker_assigned
        or str(verification.get("status") or "").lower() in {"completed", "approved", "rejected"}
        or _truthy_flag(verification.get("completed_at"))
    )
    rm_done = _truthy_flag(verification.get("rm_reviewed")) and verification.get("rm_approved") is True
    bm_done = _truthy_flag(verification.get("branch_manager_reviewed")) and verification.get("branch_manager_approved") is True
    admin_done = _truthy_flag(verification.get("admin_reviewed")) and verification.get("admin_approved") is True

    if broker_assigned and not broker_done:
        return "broker_verification"
    if rm_assigned and not rm_done:
        return "rm_verification"
    if bm_assigned and rm_done and not bm_done:
        return "branch_manager_review"
    if rm_done and (not bm_assigned or bm_done) and not admin_done:
        return "admin_review"
    return "admin_review" if is_reviewable else status_value or "all"


async def _resolve_broker_or_rm(db: AsyncIOMotorDatabase, value: Optional[str]):
    broker = await _resolve_assignee_user(db, value, "broker")
    if broker:
        return broker, "broker"
    employee = await _resolve_assignee_user(db, value, "employee")
    if employee and _is_rm_user(employee):
        return employee, "rm"
    return None, ""


class RolePayload(BaseModel):
    role_name: str
    role_key: Optional[str] = None
    description: Optional[str] = ""
    data_scope: str = "self"
    permissions: list[str] = []
    is_active: bool = True
    delete_policy: str = "soft_delete_only"
    approval_authority: list[str] = []


class UserAssignmentPayload(BaseModel):
    role_key: Optional[str] = None
    permissions: list[str] = []
    access_scope: Optional[str] = None
    reason: Optional[str] = ""


class AdminUserPayload(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    role: str = "guest"
    password: Optional[str] = None
    alternate_phone: Optional[str] = ""
    birthdate: Optional[str] = ""
    gender: Optional[str] = ""
    address: Optional[str] = ""
    city: Optional[str] = ""
    state: Optional[str] = ""
    pin_code: Optional[str] = ""
    employee_code: Optional[str] = ""
    designation: Optional[str] = ""
    department: Optional[str] = ""
    business_division: Optional[str] = ""
    branch: Optional[str] = ""
    franchise: Optional[str] = ""
    joining_date: Optional[str] = ""
    employment_type: Optional[str] = ""
    work_location: Optional[str] = ""
    employment_status: Optional[str] = "active"
    reports_to: Optional[str] = ""
    secondary_reports_to: Optional[str] = ""
    hierarchy_level: Optional[str] = ""
    team: Optional[str] = ""
    escalation_manager: Optional[str] = ""
    approval_authority: Optional[str] = ""
    access_scope: Optional[str] = "self"
    admin_role_key: Optional[str] = ""
    access_controls: list[str] = []
    admin_delete_protected: bool = False


class UserStatusPayload(BaseModel):
    is_active: bool
    reason: str


class ResetPasswordPayload(BaseModel):
    password: str
    reason: str


class ReasonPayload(BaseModel):
    reason: str


class RoleStatusPayload(BaseModel):
    is_active: bool
    reason: str


class BulkRoleDeletePayload(BaseModel):
    role_ids: list[str]


class BranchFranchisePayload(BaseModel):
    name: str
    code: Optional[str] = ""
    city: Optional[str] = ""
    state: Optional[str] = ""
    manager_id: Optional[str] = ""
    parent_code: Optional[str] = ""
    status: str = "active"


class ReportingRelationPayload(BaseModel):
    employee_id: str
    reports_to_id: str
    relation_type: str = "primary"
    reason: Optional[str] = ""


class TransferEmployeePayload(BaseModel):
    employee_id: str
    new_branch: Optional[str] = ""
    new_department: Optional[str] = ""
    new_franchise: Optional[str] = ""
    new_manager_id: Optional[str] = ""
    reason: str


class EscalationRulePayload(BaseModel):
    rule_name: str
    process_name: str
    task_type: str
    department: Optional[str] = ""
    branch: Optional[str] = ""
    primary_owner_role: Optional[str] = ""
    primary_owner: Optional[str] = ""
    sla_duration_hours: int = 24
    reminder_hours: int = 12
    first_escalation: Optional[str] = ""
    second_escalation: Optional[str] = ""
    third_escalation: Optional[str] = ""
    final_escalation: Optional[str] = ""
    notification_channels: list[str] = ["in_app"]
    auto_action: Optional[str] = ""
    priority: str = "medium"
    status: str = "active"


class EscalationRuleStatusPayload(BaseModel):
    status: str
    reason: str


class SLAPolicyPayload(BaseModel):
    policy_name: str
    process_name: str
    task_type: str
    sla_duration_hours: int
    warning_before_hours: int = 4
    breach_priority: str = "high"
    business_hours_only: bool = False
    status: str = "active"


class NotificationRulePayload(BaseModel):
    rule_name: str
    event_name: str
    channels: list[str] = ["in_app"]
    recipient_roles: list[str] = []
    template: str = ""
    retry_enabled: bool = True
    status: str = "active"


class NotificationRuleStatusPayload(BaseModel):
    status: str
    reason: str


class SecuritySettingsPayload(BaseModel):
    min_password_length: int = 8
    require_uppercase: bool = True
    require_lowercase: bool = True
    require_number: bool = True
    require_special: bool = True
    password_max_length: int = 32
    session_timeout_minutes: int = 480
    admin_session_timeout_minutes: int = 240
    max_failed_login_attempts: int = 5
    lockout_minutes: int = 30
    require_admin_reason_for_sensitive_actions: bool = True
    restrict_inactive_user_login: bool = True
    reason: Optional[str] = ""


class MaintenanceSettingsPayload(BaseModel):
    maintenance_mode: bool = False
    maintenance_message: str = "Platform maintenance is scheduled. Please try again shortly."
    backup_frequency: str = "daily"
    backup_owner: Optional[str] = ""
    last_backup_at: Optional[str] = ""
    next_backup_at: Optional[str] = ""
    retention_days: int = 30
    checklist: list[dict] = []
    reason: Optional[str] = ""


class HostKycDecisionPayload(BaseModel):
    status: str
    remarks: Optional[str] = ""


class HostKycDocumentPayload(BaseModel):
    document_type: str
    status: str
    remarks: Optional[str] = ""


class HostKycRevisionPayload(BaseModel):
    reason: str
    document_types: list[str] = []


class HostBankVerificationPayload(BaseModel):
    status: str
    remarks: Optional[str] = ""


class HostAgreementVerificationPayload(BaseModel):
    status: str
    remarks: Optional[str] = ""


class AssignmentPayload(BaseModel):
    broker_id: Optional[str] = ""
    rm_id: Optional[str] = ""
    reason: str


class PropertyStatusPayload(BaseModel):
    status: str
    reason: str


class PropertyChecklistPayload(BaseModel):
    item_key: str
    status: str
    remarks: Optional[str] = ""


class PropertyStagePayload(BaseModel):
    stage: str
    status: str
    remarks: Optional[str] = ""


class SubscriptionStatusPayload(BaseModel):
    status: str
    reason: str


class SubscriptionPlanStatusPayload(BaseModel):
    is_active: bool
    reason: str


class BookingStatusPayload(BaseModel):
    booking_status: Optional[str] = None
    payment_status: Optional[str] = None
    reason: str


class LeadStatusUpdatePayload(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    reason: str


class LeadAssignmentPayload(BaseModel):
    broker_id: Optional[str] = ""
    rm_id: Optional[str] = ""
    team_leader_id: Optional[str] = ""
    reason: str


class LeadPipelinePayload(BaseModel):
    pipeline_stage: str
    next_follow_up_at: Optional[str] = None
    follow_up_status: Optional[str] = None
    notes: Optional[str] = None
    reason: str


class CommunicationTestPayload(BaseModel):
    user_id: str
    channels: list[str]
    title: str = "Test Notification"
    message: str = "This is a test notification from X-Space360."
    reason: str = "Admin communication test"


class SupportTicketAssignmentPayload(BaseModel):
    assigned_admin_id: str
    priority: Optional[str] = None
    sla_due_at: Optional[str] = None
    reason: str


class BookingTaxSlabPayload(BaseModel):
    from_amount: float
    to_amount: Optional[float] = None
    gst_percent: float
    is_active: bool = True
    reason: Optional[str] = ""


class BookingTaxSlabStatusPayload(BaseModel):
    is_active: bool
    reason: Optional[str] = ""


def api_response(message: str, data=None, meta=None):
    return {"success": True, "message": message, "data": data if data is not None else {}, "meta": meta or {}}


def _now():
    return datetime.now(timezone.utc)


async def _ensure_booking_tax_slabs_table(db: AsyncIOMotorDatabase) -> None:
    ensure_table = getattr(db, "ensure_table", None)
    if ensure_table:
        await ensure_table("booking_tax_slabs")


def _normalize_tax_amount(value: Optional[float]) -> Optional[float]:
    if value is None:
        return None
    amount = round(float(value), 2)
    if amount < 0:
        raise HTTPException(status_code=400, detail="Tax slab amounts cannot be negative")
    return amount


async def _validate_booking_tax_slab(
    db: AsyncIOMotorDatabase,
    payload: BookingTaxSlabPayload,
    *,
    ignore_slab_id: Optional[str] = None,
) -> tuple[float, Optional[float], float]:
    from_amount = _normalize_tax_amount(payload.from_amount)
    to_amount = _normalize_tax_amount(payload.to_amount)
    gst_percent = round(float(payload.gst_percent), 2)

    if from_amount is None:
        raise HTTPException(status_code=400, detail="From Amount is required")
    if gst_percent < 0:
        raise HTTPException(status_code=400, detail="GST cannot be negative")
    if to_amount is not None and from_amount >= to_amount:
        raise HTTPException(status_code=400, detail="From Amount must be less than To Amount")

    await _ensure_booking_tax_slabs_table(db)
    existing = await db.booking_tax_slabs.find(
        {"slab_id": {"$ne": ignore_slab_id}} if ignore_slab_id else {},
        {"_id": 0, "slab_id": 1, "from_amount": 1, "to_amount": 1},
    ).to_list(500)

    new_end = float("inf") if to_amount is None else to_amount
    for slab in existing:
        try:
            start = float(slab.get("from_amount") or 0)
            raw_end = slab.get("to_amount")
            end = float("inf") if raw_end in (None, "") else float(raw_end)
        except (TypeError, ValueError):
            continue
        if from_amount <= end and new_end >= start:
            raise HTTPException(status_code=400, detail="Tax slab overlaps with an existing slab")

    return from_amount, to_amount, gst_percent


def _parse_optional_datetime(value: Optional[str]):
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid date format") from exc


def _default_security_settings() -> dict:
    return {
        "min_password_length": 8,
        "require_uppercase": True,
        "require_lowercase": True,
        "require_number": True,
        "require_special": True,
        "password_max_length": 32,
        "session_timeout_minutes": 480,
        "admin_session_timeout_minutes": 240,
        "max_failed_login_attempts": 5,
        "lockout_minutes": 30,
        "require_admin_reason_for_sensitive_actions": True,
        "restrict_inactive_user_login": True,
    }


def _default_maintenance_settings() -> dict:
    return {
        "maintenance_mode": False,
        "maintenance_message": "Platform maintenance is scheduled. Please try again shortly.",
        "backup_frequency": "daily",
        "backup_owner": "",
        "last_backup_at": "",
        "next_backup_at": "",
        "retention_days": 30,
        "checklist": [
            {"key": "database_backup", "label": "Database backup verified", "status": "pending"},
            {"key": "media_backup", "label": "Media/object storage backup verified", "status": "pending"},
            {"key": "env_snapshot", "label": "Environment/config snapshot recorded", "status": "pending"},
            {"key": "rollback_plan", "label": "Rollback plan reviewed", "status": "pending"},
        ],
    }


def _analytics_export_config() -> dict:
    return {
        "users": ("users", "created_at", ["user_id", "full_name", "role", "email", "phone", "city", "is_active", "created_at"]),
        "properties": ("properties", "created_at", ["property_id", "title", "category", "city", "status", "owner_id", "created_at"]),
        "bookings": ("bookings", "created_at", ["booking_id", "property_id", "user_id", "booking_status", "payment_status", "total_amount", "paid_amount", "number_of_guests", "check_in_date", "check_out_date", "created_at"]),
        "finance": ("transactions", "created_at", ["transaction_id", "type", "status", "amount", "user_id", "booking_id", "created_at"]),
        "support": ("support_tickets", "created_at", ["ticket_id", "subject", "category", "priority", "status", "user_id", "created_at"]),
        "crm": ("crm_leads", "created_at", ["lead_id", "name", "phone", "email", "status", "source", "created_at"]),
        "cms": ("cms_content", "updated_at", ["content_id", "page", "section", "content_type", "is_active", "updated_at"]),
        "subscriptions": ("subscriptions", "created_at", ["subscription_id", "user_id", "property_id", "plan_id", "status", "start_date", "end_date", "created_at"]),
    }


def _public_user(user: dict) -> dict:
    clean = dict(user)
    clean.pop("_id", None)
    clean.pop("password_hash", None)
    return clean


async def _enrich_lead_assignments(db: AsyncIOMotorDatabase, leads: list[dict]) -> list[dict]:
    user_ids = {
        lead.get(field)
        for lead in leads
        for field in ("broker_id", "rm_id", "team_leader_id")
        if lead.get(field)
    }
    users = await db.users.find({"user_id": {"$in": list(user_ids)}}, {"_id": 0, "password_hash": 0}).to_list(length=len(user_ids) or 1)
    user_map = {user["user_id"]: user for user in users}
    for lead in leads:
        lead["broker"] = user_map.get(lead.get("broker_id"), {})
        lead["rm"] = user_map.get(lead.get("rm_id"), {})
        lead["team_leader"] = user_map.get(lead.get("team_leader_id"), {})
        lead["age_hours"] = _hours_since(lead.get("created_at"))
    return leads


def _role_prefix(role: str) -> str:
    return {
        "admin": "ADM",
        "host": "HST",
        "broker": "BRK",
        "employee": "EMP",
        "guest": "GST",
    }.get(role, "USR")


def _validate_password_strength(password: str):
    if len(password or "") < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if not any(ch.isupper() for ch in password) or not any(ch.islower() for ch in password) or not any(ch.isdigit() for ch in password):
        raise HTTPException(status_code=400, detail="Password must include uppercase, lowercase and number")


def _code_from_name(prefix: str, name: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9]+", "-", (name or "").strip()).strip("-").upper()
    return f"{prefix}-{slug or uuid4().hex[:8].upper()}"


HOST_KYC_DOCUMENTS = [
    ("aadhar_card", "Aadhaar Card", True),
    ("pan_number", "PAN Card Number", True),
    ("property_proof", "Property Proof", True),
    ("cancelled_cheque", "Cancelled Cheque", True),
    ("shop_act", "Shop Act", True),
    ("society_noc", "Society NOC", False),
    ("gst_certificate", "GST Certificate", False),
    ("gst_number", "GST Number", False),
]


def _mask_bank_number(value: str) -> str:
    if not value:
        return ""
    return ("*" * max(0, len(value) - 4)) + value[-4:]


def _normalise_host_kyc(host: dict) -> dict:
    docs = host.get("kyc_documents") or []
    if not isinstance(docs, list):
        docs = []
    by_type = {doc.get("document_type"): dict(doc) for doc in docs if doc.get("document_type")}
    checklist = []
    for doc_type, label, required in HOST_KYC_DOCUMENTS:
        doc = by_type.get(doc_type, {})
        text_value = doc.get("text_value") or doc.get("value") or ""
        if doc_type == "gst_number":
            text_value = text_value or host.get("gst_number") or doc.get("document_url") or ""
        if doc_type == "pan_number":
            text_value = text_value or host.get("pan_number") or doc.get("document_url") or ""
        checklist.append({
            "document_type": doc_type,
            "label": label,
            "required": required,
            "document_url": doc.get("document_url") or "",
            "text_value": text_value,
            "status": doc.get("status") or ("pending" if (doc.get("document_url") or text_value) else "missing"),
            "rejection_reason": doc.get("rejection_reason") or "",
            "reviewed_by": doc.get("reviewed_by") or "",
            "reviewed_at": doc.get("reviewed_at") or "",
            "uploaded_at": doc.get("uploaded_at") or "",
        })
    required_docs_ready = all((item["document_url"] or item["text_value"]) and item["status"] == "approved" for item in checklist if item["required"])
    agreement_ready = bool(host.get("agreement_signature")) and host.get("agreement_status", "pending") == "approved"
    pref = host.get("payout_preference") or {}
    bank_has_details = bool(pref.get("upi_vpa") or (pref.get("bank_account_number") and pref.get("bank_ifsc") and pref.get("bank_account_holder")))
    bank_ready = bank_has_details and host.get("bank_verification_status", "pending") == "approved"
    return {
        "checklist": checklist,
        "summary": {
            "required_documents_ready": required_docs_ready,
            "agreement_ready": agreement_ready,
            "bank_ready": bank_ready,
            "ready_for_approval": required_docs_ready,
        },
        "agreement": {
            "owner_name": host.get("agreement_owner_name") or "",
            "owner_address": host.get("agreement_owner_address") or "",
            "signature": host.get("agreement_signature") or "",
            "signed_at": host.get("agreement_signed_at") or "",
            "status": host.get("agreement_status", "pending" if host.get("agreement_signature") else "missing"),
            "remarks": host.get("agreement_remarks") or "",
        },
        "bank": {
            "preferred": pref.get("preferred") or "upi",
            "upi_vpa": pref.get("upi_vpa") or "",
            "bank_account_holder": pref.get("bank_account_holder") or "",
            "bank_account_number_masked": pref.get("bank_account_number_masked") or _mask_bank_number(pref.get("bank_account_number") or ""),
            "bank_ifsc": pref.get("bank_ifsc") or "",
            "status": host.get("bank_verification_status", "pending" if bank_has_details else "missing"),
            "remarks": host.get("bank_verification_remarks") or "",
        },
        "history": host.get("kyc_review_history") or [],
    }


PROPERTY_REVIEW_ITEMS = [
    ("basic_info", "Basic Info", ["title", "description", "category", "property_type", "bhk_type"]),
    ("location", "Location", ["address", "city", "state", "pin_code"]),
    ("pricing", "Pricing", ["price_per_night"]),
    ("amenities", "Amenities", ["amenities"]),
    ("photos", "Photos", ["images"]),
    ("subscription", "Subscription", ["subscription_status"]),
    ("host_kyc", "Host KYC", []),
    ("assignment", "Broker/RM Assignment", []),
]


def _has_value(value) -> bool:
    if isinstance(value, list):
        return len(value) > 0
    return value not in (None, "", 0)


def _normalise_property_review(prop: dict, owner: dict | None = None, verification: dict | None = None) -> dict:
    owner = owner or {}
    verification = verification or {}
    manual = verification.get("checklist") or {}
    assignment = _property_team_assignment(prop, owner)
    host_kyc = _normalise_host_kyc(owner) if owner else {"summary": {"required_documents_ready": False}}
    documents_approved = owner.get("kyc_status") == "approved" or bool(host_kyc.get("summary", {}).get("required_documents_ready"))
    checklist = []
    for key, label, fields in PROPERTY_REVIEW_ITEMS:
        if key == "photos":
            auto_ready = len(prop.get("images") or []) >= 3
            details = f"{len(prop.get('images') or [])} photos"
        elif key == "subscription":
            auto_ready = prop.get("subscription_status") in {"active", "trial"}
            details = prop.get("subscription_status") or "missing"
        elif key == "host_kyc":
            auto_ready = owner.get("kyc_status") == "approved"
            details = owner.get("kyc_status") or "unknown"
        elif key == "assignment":
            auto_ready = bool(assignment["rm"]) and bool(assignment["broker"] or assignment["branch_manager"])
            details = f"Broker: {assignment['broker'] or '-'} / RM: {assignment['rm'] or '-'} / BM: {assignment['branch_manager'] or assignment['branch_manager_code'] or '-'}"
        elif key == "amenities":
            auto_ready = bool(prop.get("amenities"))
            details = f"{len(prop.get('amenities') or [])} amenities"
        else:
            auto_ready = all(_has_value(prop.get(field)) for field in fields)
            details = ", ".join(field for field in fields if not _has_value(prop.get(field))) or "complete"
        saved = manual.get(key, {})
        status_value = saved.get("status") or ("approved" if auto_ready else "pending")
        checklist.append({
            "item_key": key,
            "label": label,
            "auto_ready": auto_ready,
            "status": status_value,
            "remarks": saved.get("remarks") or "",
            "details": details,
            "reviewed_by": saved.get("reviewed_by") or "",
            "reviewed_at": saved.get("reviewed_at") or "",
        })
    approved_required = all(item["status"] == "approved" for item in checklist)
    stages = verification.get("stages") or {}

    def stage_value(key: str, status_value: str, remarks: str = "") -> dict:
        saved = stages.get(key) or {}
        if saved.get("status") in {"approved", "rejected"}:
            return saved
        return {
            "status": status_value,
            "remarks": saved.get("remarks") or remarks,
            "reviewed_by": saved.get("reviewed_by") or "",
            "reviewed_at": saved.get("reviewed_at") or "",
        }

    has_broker_step = bool(assignment["broker"])
    broker_completed = bool(verification.get("broker_id")) and (
        verification.get("status") in {"completed", "approved", "rejected"} or bool(verification.get("completed_at"))
    )
    rm_approved = verification.get("rm_reviewed") and verification.get("rm_approved") is True
    rm_rejected = verification.get("rm_reviewed") and verification.get("rm_approved") is False
    rm_first_completed = not has_broker_step and (
        verification.get("status") in {"completed", "approved", "rejected"} or bool(verification.get("completed_at"))
    )
    bm_approved = verification.get("branch_manager_reviewed") and verification.get("branch_manager_approved") is True
    bm_rejected = verification.get("branch_manager_reviewed") and verification.get("branch_manager_approved") is False
    admin_approved = prop.get("status") == "live" or (verification.get("admin_reviewed") and verification.get("admin_approved") is True)
    admin_rejected = verification.get("admin_reviewed") and verification.get("admin_approved") is False
    document_status = "approved" if documents_approved else "pending"
    broker_status = "not_required" if not has_broker_step else "approved" if broker_completed else "pending"
    rm_status = "rejected" if rm_rejected else "approved" if rm_approved or rm_first_completed else "pending"
    bm_status = "rejected" if bm_rejected else "approved" if bm_approved else "pending"
    admin_status = "rejected" if admin_rejected else "approved" if admin_approved else "pending"
    return {
        "checklist": checklist,
        "stages": {
            "document_check": stage_value("document_check", document_status),
            "broker_verification": stage_value("broker_verification", broker_status, "No broker step required" if not has_broker_step else ""),
            "rm_verification": stage_value("rm_verification", rm_status),
            "branch_manager_review": stage_value("branch_manager_review", bm_status, "No Branch Manager assigned" if not (assignment["branch_manager"] or assignment["branch_manager_code"]) else ""),
            "admin_review": stage_value("admin_review", admin_status),
        },
        "summary": {
            "ready_for_live": approved_required and prop.get("status") in {"under_review", "pending_verification", "live"},
            "checklist_approved": approved_required,
            "photo_count": len(prop.get("images") or []),
            "amenity_count": len(prop.get("amenities") or []),
            "host_kyc_status": owner.get("kyc_status") or "unknown",
        },
        "history": verification.get("history") or [],
    }


async def _append_property_review_history(db, property_id: str, event: dict):
    event_doc = {
        "event_id": f"PREV-{uuid4().hex[:10].upper()}",
        "created_at": _now().isoformat(),
        **event,
    }
    await db.property_verifications.update_one(
        {"property_id": property_id},
        {"$push": {"history": {"$each": [event_doc], "$position": 0, "$slice": 80}}, "$setOnInsert": {"property_id": property_id, "created_at": _now()}},
        upsert=True,
    )
    return event_doc


def _parse_date_like(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value.date()
    if hasattr(value, "year") and hasattr(value, "month") and hasattr(value, "day"):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
        except ValueError:
            return None
    return None


def _days_until(value):
    parsed = _parse_date_like(value)
    if not parsed:
        return None
    return (parsed - _now().date()).days


def _parse_date_start(value: str):
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        dt = datetime.strptime(value[:10], "%Y-%m-%d")
    from datetime import timezone as dt_timezone, timedelta
    ist = dt_timezone(timedelta(hours=5, minutes=30))
    if dt.tzinfo is not None:
        dt_ist = dt.astimezone(ist).replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        dt_ist = dt.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=ist)
    return dt_ist.astimezone(timezone.utc)


def _parse_date_end(value: str):
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        dt = datetime.strptime(value[:10], "%Y-%m-%d")
    from datetime import timezone as dt_timezone, timedelta
    ist = dt_timezone(timedelta(hours=5, minutes=30))
    if dt.tzinfo is not None:
        dt_ist = dt.astimezone(ist).replace(hour=23, minute=59, second=59, microsecond=999999)
    else:
        dt_ist = dt.replace(hour=23, minute=59, second=59, microsecond=999999, tzinfo=ist)
    return dt_ist.astimezone(timezone.utc)


async def _assert_unique_user_fields(db, *, email: str, phone: str, employee_code: str = "", user_id: str = ""):
    email_match = await db.users.find_one({"email": {"$regex": f"^{re.escape(str(email))}$", "$options": "i"}}, {"_id": 0})
    if email_match and email_match.get("user_id") != user_id:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    phone_match = await db.users.find_one({"phone": phone}, {"_id": 0})
    if phone_match and phone_match.get("user_id") != user_id:
        raise HTTPException(status_code=400, detail="User with this mobile number already exists")
    if employee_code:
        employee_match = await db.users.find_one({"employee_code": {"$regex": f"^{re.escape(employee_code)}$", "$options": "i"}}, {"_id": 0})
        if employee_match and employee_match.get("user_id") != user_id:
            raise HTTPException(status_code=400, detail="Employee code already exists")
        user_id_match = await db.users.find_one({"user_id": {"$regex": f"^{re.escape(employee_code)}$", "$options": "i"}}, {"_id": 0})
        if user_id_match and user_id_match.get("user_id") != user_id:
            raise HTTPException(status_code=400, detail="User ID already exists for this code")


async def _count(db, collection, query=None):
    return await getattr(db, collection).count_documents(query or {})


def _money_rupees(value, *, stored_as_paise: bool = False) -> float:
    try:
        amount = float(value or 0)
    except (TypeError, ValueError):
        return 0.0
    if stored_as_paise:
        amount = amount / 100
    return amount


def _booking_platform_fee_rupees(booking: dict) -> float:
    pricing = booking.get("pricing_breakdown") or {}
    extra_charges = pricing.get("extra_charges") or booking.get("extra_charges") or {}
    return _money_rupees(
        extra_charges.get("platform_fee")
        or booking.get("platform_fee_amount")
        or booking.get("service_fee")
    )


@router.post("/bootstrap")
async def bootstrap_admin_core(current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    await ensure_default_permissions(db)
    default_departments = ["Executive", "Operations", "Sales", "Finance", "Property", "Support", "Marketing", "Technology"]
    for name in default_departments:
        if not await db.departments.find_one({"name": name}):
            await db.departments.insert_one({
                "department_id": f"dept_{uuid4().hex[:10]}",
                "name": name,
                "status": "active",
                "created_at": _now(),
                "updated_at": _now(),
            })
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="system_administration", action="bootstrap_admin_core")
    return api_response("Admin core bootstrap completed")


@router.get("/dashboard")
async def executive_dashboard(
    date_range: Optional[str] = None,
    business_division: Optional[str] = None,
    branch: Optional[str] = None,
    franchise: Optional[str] = None,
    city: Optional[str] = None,
    property_category: Optional[str] = None,
    department: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    user_query = {}
    property_query = {}
    booking_query = {}
    if branch:
        user_query["branch"] = branch
        property_query["branch"] = branch
    if franchise:
        user_query["franchise"] = franchise
    if city:
        user_query["city"] = city
        property_query["city"] = city
    if department:
        user_query["department"] = department
    if business_division:
        user_query["business_division"] = business_division
    if property_category:
        property_query["category"] = property_category
    if status_filter:
        if status_filter in {"active", "inactive"}:
            user_query["is_active"] = status_filter == "active"
        else:
            property_query["status"] = status_filter

    users_total = await _count(db, "users", user_query)
    hosts = await _count(db, "users", {**user_query, "role": "host"})
    guests = await _count(db, "users", {**user_query, "role": "guest"})
    employees = await _count(db, "users", {**user_query, "role": "employee"})
    brokers = await _count(db, "users", {**user_query, "role": "broker"})
    visible_property_query = {**property_query, "is_deleted": {"$ne": True}}
    properties_total = await _count(db, "properties", visible_property_query)
    live_properties = await _count(db, "properties", {**visible_property_query, "status": "live"})
    pending_properties = await _count(db, "properties", {**visible_property_query, "status": {"$in": ["pending_verification", "under_review"]}})
    rejected_properties = await _count(db, "properties", {**visible_property_query, "status": "rejected"})
    draft_properties = await _count(db, "properties", {**visible_property_query, "status": "draft"})
    inactive_properties = await _count(db, "properties", {**visible_property_query, "status": {"$in": ["inactive", "blocked", "expired"]}})
    bookings_total = await _count(db, "bookings", booking_query)
    upcoming_bookings = await _count(db, "bookings", {"booking_status": {"$in": ["pending", "confirmed"]}})
    active_bookings = await _count(db, "bookings", {"booking_status": "confirmed"})
    completed_bookings = await _count(db, "bookings", {"booking_status": "completed"})
    cancelled_bookings = await _count(db, "bookings", {"booking_status": "cancelled"})
    paid_booking_query = {
        "payment_status": {"$in": ["paid", "success", "captured", "completed"]},
        "booking_status": {"$nin": ["cancelled", "failed"]},
    }
    paid_bookings = await db.bookings.find(paid_booking_query, {"_id": 0}).to_list(length=10000)
    transactions = await db.transactions.find({}, {"_id": 0}).to_list(length=10000)
    payouts = await db.payouts.find({}, {"_id": 0}).to_list(length=10000)
    refunds = await db.refunds.find({}, {"_id": 0}).to_list(length=10000)
    gross = sum(_money_rupees(b.get("total_amount")) for b in paid_bookings)
    net_collections = sum(
        _money_rupees(t.get("amount"), stored_as_paise=True)
        for t in transactions
        if t.get("type") in {"booking_payment", "payment"} and t.get("status") in {"success", "completed", "paid"}
    ) or gross
    platform_revenue = sum(_money_rupees(p.get("platform_fee"), stored_as_paise=True) for p in payouts)
    host_payable = sum(_money_rupees(p.get("net_amount"), stored_as_paise=True) for p in payouts)
    if not platform_revenue:
        platform_revenue = sum(_booking_platform_fee_rupees(booking) for booking in paid_bookings)
    if not host_payable:
        host_payable = sum(
            max(
                0.0,
                _money_rupees(booking.get("total_amount"))
                - _money_rupees(booking.get("taxes"))
                - _booking_platform_fee_rupees(booking),
            )
            for booking in paid_bookings
        )
    host_paid = sum(
        _money_rupees(p.get("net_amount") or p.get("amount") or p.get("payout_amount"), stored_as_paise=True)
        for p in payouts
        if p.get("status") in {"processed", "paid", "completed"}
    )
    pending_payout_amount = sum(
        _money_rupees(p.get("net_amount") or p.get("amount") or p.get("payout_amount"), stored_as_paise=True)
        for p in payouts
        if p.get("status") not in {"processed", "paid", "completed"}
    )
    refund_amount = sum(_money_rupees(r.get("refund_amount") or r.get("amount"), stored_as_paise=True) for r in refunds if r.get("status") not in {"failed", "rejected"})
    pending_tickets = await _count(db, "support_tickets", {"status": {"$nin": ["resolved", "closed"]}})
    pending_kyc = await _count(db, "users", {"role": "host", "kyc_status": "pending"})
    pending_refunds = await _count(db, "refunds", {"status": {"$nin": ["processed", "completed", "failed", "rejected"]}})
    pending_payouts = await _count(db, "payouts", {"status": {"$nin": ["processed", "paid", "completed"]}})
    failed_transactions = await _count(db, "transactions", {"status": {"$in": ["failed", "error"]}})
    recent_activity = await db.audit_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(length=10)
    properties = await db.properties.find(visible_property_query, {"_id": 0}).to_list(length=5000)
    bookings = await db.bookings.find(booking_query, {"_id": 0}).to_list(length=5000)
    booking_tax_liability = sum(
        float(b.get("taxes", 0) or 0)
        for b in bookings
        if b.get("booking_status") not in {"cancelled", "failed"}
    )

    def group_count(items, key, default="Unassigned"):
        counts = {}
        for item in items:
            label = item.get(key) or default
            counts[label] = counts.get(label, 0) + 1
        return [{"label": label, "value": value} for label, value in sorted(counts.items())[:10]]

    def group_sum(items, key, amount_key="amount", default="Unassigned"):
        sums = {}
        for item in items:
            label = item.get(key) or default
            sums[label] = sums.get(label, 0) + float(item.get(amount_key, 0) or 0)
        return [{"label": label, "value": round(value, 2)} for label, value in sorted(sums.items(), key=lambda row: row[1], reverse=True)[:10]]

    data = {
        "kpis": {
            "users": {"total": users_total, "hosts": hosts, "guests": guests, "employees": employees, "brokers": brokers},
            "properties": {"total": properties_total, "live": live_properties, "pending_verification": pending_properties, "rejected": rejected_properties, "inactive": inactive_properties, "draft": draft_properties},
            "bookings": {"total": bookings_total, "upcoming": upcoming_bookings, "active_stays": active_bookings, "completed": completed_bookings, "cancelled": cancelled_bookings},
            "finance": {"gross_booking_value": round(gross, 2), "net_collections": round(net_collections, 2), "platform_revenue": round(platform_revenue, 2), "host_payable": round(host_payable, 2), "host_paid": round(host_paid, 2), "pending_payout": round(pending_payout_amount, 2), "tax_liability": round(booking_tax_liability, 2), "refund_amount": round(refund_amount, 2), "broker_commission": 0},
        },
        "pending_actions": [
            {"key": "host_kyc", "label": "Host KYC Pending", "count": pending_kyc, "sla": "24h", "trend": "stable", "path": "/admin/users"},
            {"key": "broker_verification", "label": "Broker Verification Pending", "count": pending_properties, "sla": "24h", "trend": "up", "path": "/admin/escalation-matrix"},
            {"key": "rm_verification", "label": "RM Verification Pending", "count": pending_properties, "sla": "48h", "trend": "stable", "path": "/admin/escalation-matrix"},
            {"key": "admin_approval", "label": "Admin Approval Pending", "count": pending_properties, "sla": "72h", "trend": "stable", "path": "/admin/properties"},
            {"key": "payout_approval", "label": "Payout Approval Pending", "count": pending_payouts, "sla": "48h", "trend": "stable", "path": "/admin/finance"},
            {"key": "refund_requests", "label": "Refund Requests Pending", "count": pending_refunds, "sla": "24h", "trend": "stable", "path": "/admin/finance"},
            {"key": "support_tickets", "label": "Support Tickets Pending", "count": pending_tickets, "sla": "8h", "trend": "stable", "path": "/admin/support"},
            {"key": "failed_transactions", "label": "Failed Transactions", "count": failed_transactions, "sla": "4h", "trend": "down", "path": "/admin/finance"},
        ],
        "charts": {
            "booking_trend": group_count(bookings, "booking_status"),
            "revenue_trend": group_sum(transactions, "status"),
            "property_growth": group_count(properties, "status"),
            "host_registration_trend": group_count(await db.users.find({"role": "host"}, {"_id": 0}).to_list(length=5000), "city"),
            "category_bookings": group_count(properties, "category"),
            "city_revenue": group_sum(properties, "city", "price_per_night"),
            "approval_turnaround": [{"label": "Pending", "value": pending_properties}, {"label": "Rejected", "value": rejected_properties}, {"label": "Live", "value": live_properties}],
            "payout_status": group_count(payouts, "status"),
            "refund_trend": group_count(refunds, "status"),
            "support_ticket_trend": group_count(await db.support_tickets.find({}, {"_id": 0}).to_list(length=5000), "status"),
        },
        "recent_activity": recent_activity,
        "quick_actions": [
            {"label": "Create User", "path": "/admin/users"},
            {"label": "Review Host KYC", "path": "/admin/users"},
            {"label": "Assign Property", "path": "/admin/properties"},
            {"label": "Review Property", "path": "/admin/properties"},
            {"label": "Approve Payout", "path": "/admin/finance"},
            {"label": "Review Refund", "path": "/admin/finance"},
            {"label": "View Escalations", "path": "/admin/escalation-matrix"},
        ],
        "filters": {
            "branches": await db.users.distinct("branch", {}),
            "franchises": await db.users.distinct("franchise", {}),
            "cities": await db.users.distinct("city", {}),
            "departments": await db.users.distinct("department", {}),
            "property_categories": await db.properties.distinct("category", {}),
        },
    }
    return api_response("Executive dashboard loaded", data)


@router.get("/analytics/overview")
async def analytics_overview(
    module: str = "all",
    status_filter: Optional[str] = Query(None, alias="status"),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    created_range = {}
    if date_from:
        created_range["$gte"] = _parse_date_start(date_from)
    if date_to:
        created_range["$lte"] = _parse_date_end(date_to)

    def with_date(query: dict) -> dict:
        return {**query, "created_at": created_range} if created_range else query

    users_query = with_date({})
    properties_query = with_date({})
    bookings_query = with_date({})
    transactions_query = with_date({})
    support_query = with_date({})
    leads_query = with_date({})
    cms_query = with_date({})
    if status_filter:
        properties_query["status"] = status_filter
        bookings_query["booking_status"] = status_filter
        transactions_query["status"] = status_filter
        support_query["status"] = status_filter
        leads_query["status"] = status_filter
        cms_query["is_active"] = status_filter in {"active", "published", "live"}

    users = await db.users.find(users_query, {"_id": 0, "password_hash": 0}).to_list(length=10000)
    properties = await db.properties.find(properties_query, {"_id": 0}).to_list(length=10000)
    bookings = await db.bookings.find(bookings_query, {"_id": 0}).to_list(length=10000)
    transactions = await db.transactions.find(transactions_query, {"_id": 0}).to_list(length=10000)
    support_tickets = await db.support_tickets.find(support_query, {"_id": 0}).to_list(length=5000)
    leads = await db.crm_leads.find(leads_query, {"_id": 0}).to_list(length=5000)
    cms_content = await db.cms_content.find(cms_query, {"_id": 0}).to_list(length=5000)

    def group_count(items: list[dict], key: str, default: str = "Unassigned") -> list[dict]:
        counts = {}
        for item in items:
            label = item.get(key) or default
            counts[label] = counts.get(label, 0) + 1
        return [{"label": label, "count": count} for label, count in sorted(counts.items(), key=lambda row: row[1], reverse=True)[:10]]

    paid_transactions = [row for row in transactions if row.get("status") in {"success", "completed", "paid"}]
    revenue = sum(float(row.get("amount") or 0) for row in paid_transactions)
    confirmed_bookings = len([row for row in bookings if row.get("booking_status") in {"confirmed", "completed"}])
    converted_leads = len([row for row in leads if row.get("status") in {"converted", "won"}])
    open_support = len([row for row in support_tickets if row.get("status") not in {"resolved", "closed"}])
    active_cms = len([row for row in cms_content if row.get("is_active") is not False])
    audit_modules = await db.audit_logs.distinct("module", {})
    total_audits = await db.audit_logs.count_documents({})
    approved_hosts = len([row for row in users if row.get("role") == "host" and row.get("kyc_status") == "approved"])
    total_hosts = len([row for row in users if row.get("role") == "host"])
    live_properties = len([row for row in properties if row.get("status") == "live"])
    security_doc = await db.platform_settings.find_one({"key": "security_settings"}, {"_id": 0}) or {}
    maintenance_doc = await db.platform_settings.find_one({"key": "maintenance_settings"}, {"_id": 0}) or {}
    security_settings = {**_default_security_settings(), **(security_doc.get("value") or {})}
    maintenance_settings = {**_default_maintenance_settings(), **(maintenance_doc.get("value") or {})}
    checklist = maintenance_settings.get("checklist") or []
    backup_completed = len([item for item in checklist if item.get("status") == "completed"])

    return api_response("Analytics overview loaded", {
        "phase_steps": [
            {"step": "Step 1", "label": "Analytics Overview Dashboard", "status": "completed"},
            {"step": "Step 2", "label": "Advanced Reports & Filters", "status": "completed"},
            {"step": "Step 3", "label": "Export Center", "status": "completed"},
            {"step": "Step 4", "label": "Compliance Readiness", "status": "completed"},
            {"step": "Step 5", "label": "Phase 9 Testing & Hardening", "status": "completed"},
        ],
        "kpis": {
            "users_total": len(users),
            "properties_total": len(properties),
            "bookings_total": len(bookings),
            "revenue_total": round(revenue, 2),
            "confirmed_bookings": confirmed_bookings,
            "support_open": open_support,
            "crm_leads": len(leads),
            "crm_converted": converted_leads,
            "cms_active_sections": active_cms,
        },
        "charts": {
            "users_by_role": group_count(users, "role"),
            "properties_by_status": group_count(properties, "status"),
            "bookings_by_status": group_count(bookings, "booking_status"),
            "revenue_by_status": group_count(transactions, "status"),
            "support_by_status": group_count(support_tickets, "status"),
            "leads_by_status": group_count(leads, "status"),
            "cms_by_page": group_count(cms_content, "page"),
        },
        "health": {
            "booking_conversion_rate": round((confirmed_bookings / len(bookings)) * 100, 1) if bookings else 0,
            "lead_conversion_rate": round((converted_leads / len(leads)) * 100, 1) if leads else 0,
            "support_resolution_rate": round((len(support_tickets) - open_support) / len(support_tickets) * 100, 1) if support_tickets else 0,
            "cms_publish_rate": round((active_cms / len(cms_content)) * 100, 1) if cms_content else 0,
        },
        "recent_activity": await db.audit_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(20).to_list(length=20),
        "compliance": {
            "score": round((
                (100 if total_audits else 0)
                + (100 if security_settings.get("require_admin_reason_for_sensitive_actions") else 0)
                + ((approved_hosts / total_hosts) * 100 if total_hosts else 100)
                + ((live_properties / len(properties)) * 100 if properties else 100)
                + ((active_cms / len(cms_content)) * 100 if cms_content else 100)
                + ((backup_completed / len(checklist)) * 100 if checklist else 0)
            ) / 6, 1),
            "items": [
                {"key": "audit_coverage", "label": "Audit Coverage", "status": "ready" if total_audits else "needs_review", "value": f"{total_audits} events / {len(audit_modules)} modules"},
                {"key": "security_policy", "label": "Security Policy", "status": "ready" if security_settings.get("require_admin_reason_for_sensitive_actions") else "needs_review", "value": f"{security_settings.get('min_password_length', 8)} char password baseline"},
                {"key": "host_kyc", "label": "Host KYC Readiness", "status": "ready" if total_hosts == approved_hosts else "attention", "value": f"{approved_hosts}/{total_hosts} approved"},
                {"key": "property_compliance", "label": "Property Compliance", "status": "ready" if len(properties) == live_properties else "attention", "value": f"{live_properties}/{len(properties)} live"},
                {"key": "legal_cms", "label": "Legal & CMS Publishing", "status": "ready" if active_cms else "needs_review", "value": f"{active_cms}/{len(cms_content)} active sections"},
                {"key": "backup_readiness", "label": "Backup Readiness", "status": "ready" if checklist and backup_completed == len(checklist) else "attention", "value": f"{backup_completed}/{len(checklist)} checklist"},
            ],
            "audit_modules": audit_modules,
        },
        "filters": {"module": module, "status": status_filter or "", "date_from": date_from or "", "date_to": date_to or ""},
        "report_rows": {
            "users": users[:50],
            "properties": properties[:50],
            "bookings": bookings[:50],
            "finance": transactions[:50],
            "support": support_tickets[:50],
            "crm": leads[:50],
            "cms": cms_content[:50],
        }.get(module, []),
    })


@router.get("/analytics/export-csv")
async def export_analytics_csv(
    module: str = "users",
    status_filter: Optional[str] = Query(None, alias="status"),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    module_config = _analytics_export_config()
    if module not in module_config:
        raise HTTPException(status_code=400, detail="Invalid export module")
    collection_name, date_field, fields = module_config[module]
    query = {"is_deleted": {"$ne": True}}
    metric_base_query = {"is_deleted": {"$ne": True}}
    created_range = {}
    if date_from:
        created_range["$gte"] = _parse_date_start(date_from)
    if date_to:
        created_range["$lte"] = _parse_date_end(date_to)
    if created_range:
        query[date_field] = created_range
    if status_filter:
        if module == "bookings":
            query["booking_status"] = status_filter
        elif module == "cms":
            query["is_active"] = status_filter in {"active", "published", "live"}
        elif module == "users":
            query["is_active"] = status_filter == "active"
        else:
            query["status"] = status_filter
    rows = await getattr(db, collection_name).find(query, {"_id": 0}).sort(date_field, -1).limit(10000).to_list(length=10000)
    import csv
    import io

    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow({field: row.get(field, "") for field in fields})
    buf.seek(0)
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="reports_analytics", action="analytics_exported", record_id=module, new_value={"count": len(rows), "module": module})
    filename = f"{module}_analytics_{_now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={filename}"})


@router.get("/users")
async def users(
    role: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    active_record_query = {"is_deleted": {"$ne": True}}
    query = dict(active_record_query)
    if role and role != "all":
        query["role"] = role
    if status_filter == "inactive":
        query["is_active"] = False
    elif status_filter == "active":
        query["is_active"] = True
    else:
        query["is_active"] = {"$ne": False}
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"user_id": {"$regex": search, "$options": "i"}},
            {"uid": {"$regex": search, "$options": "i"}},
            {"employee_code": {"$regex": search, "$options": "i"}},
            {"designation": {"$regex": search, "$options": "i"}},
            {"department": {"$regex": search, "$options": "i"}},
            {"business_division": {"$regex": search, "$options": "i"}},
            {"branch": {"$regex": search, "$options": "i"}},
            {"franchise": {"$regex": search, "$options": "i"}},
            {"work_location": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}},
            {"state": {"$regex": search, "$options": "i"}},
            {"pin_code": {"$regex": search, "$options": "i"}},
            {"admin_role_key": {"$regex": search, "$options": "i"}},
        ]
    items = await db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    total = await db.users.count_documents(query)
    return api_response("Users loaded", {"users": items}, {"total": total, "limit": limit, "skip": skip})


@router.get("/branch-franchise")
async def branch_franchise_management(current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    branches = await db.branches.find({}, {"_id": 0}).sort("created_at", -1).to_list(length=500)
    franchises = await db.franchises.find({}, {"_id": 0}).sort("created_at", -1).to_list(length=500)
    return api_response(
        "Branch and franchise records loaded",
        {"branches": branches, "franchises": franchises},
        {"branch_count": len(branches), "franchise_count": len(franchises)},
    )


@router.post("/branches", status_code=status.HTTP_201_CREATED)
async def create_branch(payload: BranchFranchisePayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Branch name is required")
    code = (payload.code or _code_from_name("BR", name)).strip().upper()
    if await db.branches.find_one({"code": {"$regex": f"^{re.escape(code)}$", "$options": "i"}}):
        raise HTTPException(status_code=400, detail="Branch code already exists")
    doc = {
        "branch_id": f"branch_{uuid4().hex[:12]}",
        "name": name,
        "code": code,
        "city": payload.city,
        "state": payload.state,
        "manager_id": payload.manager_id,
        "franchise_code": payload.parent_code,
        "status": payload.status or "active",
        "created_at": _now(),
        "updated_at": _now(),
        "created_by": current_user["user_id"],
    }
    await db.branches.insert_one(doc)
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="branch_franchise_management", action="branch_created", record_id=code, new_value=doc)
    return api_response("Branch created", {"branch": doc})


@router.post("/franchises", status_code=status.HTTP_201_CREATED)
async def create_franchise(payload: BranchFranchisePayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Franchise name is required")
    code = (payload.code or _code_from_name("FR", name)).strip().upper()
    if await db.franchises.find_one({"code": {"$regex": f"^{re.escape(code)}$", "$options": "i"}}):
        raise HTTPException(status_code=400, detail="Franchise code already exists")
    doc = {
        "franchise_id": f"franchise_{uuid4().hex[:12]}",
        "name": name,
        "code": code,
        "city": payload.city,
        "state": payload.state,
        "manager_id": payload.manager_id,
        "status": payload.status or "active",
        "created_at": _now(),
        "updated_at": _now(),
        "created_by": current_user["user_id"],
    }
    await db.franchises.insert_one(doc)
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="branch_franchise_management", action="franchise_created", record_id=code, new_value=doc)
    return api_response("Franchise created", {"franchise": doc})


@router.put("/branches/{code}")
async def update_branch(code: str, payload: BranchFranchisePayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    existing = await db.branches.find_one({"code": {"$regex": f"^{re.escape(code)}$", "$options": "i"}}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Branch not found")
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Branch name is required")
    new_code = (payload.code or existing["code"]).strip().upper()
    if new_code.lower() != existing["code"].lower() and await db.branches.find_one({"code": {"$regex": f"^{re.escape(new_code)}$", "$options": "i"}}):
        raise HTTPException(status_code=400, detail="Branch code already exists")
    update = {
        "name": name,
        "code": new_code,
        "city": payload.city,
        "state": payload.state,
        "manager_id": payload.manager_id,
        "franchise_code": payload.parent_code,
        "status": payload.status or existing.get("status") or "active",
        "updated_at": _now(),
        "updated_by": current_user["user_id"],
    }
    await db.branches.update_one({"branch_id": existing["branch_id"]}, {"$set": update})
    if new_code != existing["code"]:
        await db.users.update_many({"branch": existing["code"]}, {"$set": {"branch": new_code}})
    doc = {**existing, **update}
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="branch_franchise_management", action="branch_updated", record_id=new_code, old_value=existing, new_value=doc)
    return api_response("Branch updated", {"branch": doc})


@router.put("/franchises/{code}")
async def update_franchise(code: str, payload: BranchFranchisePayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    existing = await db.franchises.find_one({"code": {"$regex": f"^{re.escape(code)}$", "$options": "i"}}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Franchise not found")
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Franchise name is required")
    new_code = (payload.code or existing["code"]).strip().upper()
    if new_code.lower() != existing["code"].lower() and await db.franchises.find_one({"code": {"$regex": f"^{re.escape(new_code)}$", "$options": "i"}}):
        raise HTTPException(status_code=400, detail="Franchise code already exists")
    update = {
        "name": name,
        "code": new_code,
        "city": payload.city,
        "state": payload.state,
        "manager_id": payload.manager_id,
        "status": payload.status or existing.get("status") or "active",
        "updated_at": _now(),
        "updated_by": current_user["user_id"],
    }
    await db.franchises.update_one({"franchise_id": existing["franchise_id"]}, {"$set": update})
    if new_code != existing["code"]:
        await db.users.update_many({"franchise": existing["code"]}, {"$set": {"franchise": new_code}})
        await db.branches.update_many({"franchise_code": existing["code"]}, {"$set": {"franchise_code": new_code}})
    doc = {**existing, **update}
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="branch_franchise_management", action="franchise_updated", record_id=new_code, old_value=existing, new_value=doc)
    return api_response("Franchise updated", {"franchise": doc})


@router.post("/branches/{code}/delete")
async def delete_branch(code: str, payload: ReasonPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    existing = await db.branches.find_one({"code": {"$regex": f"^{re.escape(code)}$", "$options": "i"}}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Branch not found")
    assigned_users = await db.users.count_documents({"branch": existing["code"]})
    if assigned_users:
        raise HTTPException(status_code=400, detail=f"Branch is assigned to {assigned_users} user(s). Reassign users before deleting.")
    await db.branches.delete_one({"branch_id": existing["branch_id"]})
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="branch_franchise_management", action="branch_deleted", record_id=existing["code"], old_value=existing, reason=payload.reason)
    return api_response("Branch deleted", {"code": existing["code"]})


@router.post("/franchises/{code}/delete")
async def delete_franchise(code: str, payload: ReasonPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    existing = await db.franchises.find_one({"code": {"$regex": f"^{re.escape(code)}$", "$options": "i"}}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Franchise not found")
    assigned_users = await db.users.count_documents({"franchise": existing["code"]})
    linked_branches = await db.branches.count_documents({"franchise_code": existing["code"]})
    if assigned_users or linked_branches:
        raise HTTPException(status_code=400, detail=f"Franchise is linked to {assigned_users} user(s) and {linked_branches} branch(es). Remove links before deleting.")
    await db.franchises.delete_one({"franchise_id": existing["franchise_id"]})
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="branch_franchise_management", action="franchise_deleted", record_id=existing["code"], old_value=existing, reason=payload.reason)
    return api_response("Franchise deleted", {"code": existing["code"]})


@router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_admin_user(payload: AdminUserPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    allowed_roles = {role.value for role in UserRole}
    if payload.role not in allowed_roles:
        raise HTTPException(status_code=400, detail="Invalid base user role")
    if payload.role == "employee" and not payload.employee_code:
        raise HTTPException(status_code=400, detail="Employee code is required for employee users")
    password = payload.password or "Xspace360@123"
    _validate_password_strength(password)
    unique_employee_code = (payload.employee_code or "") if payload.role in {"employee", "broker"} else ""
    await _assert_unique_user_fields(db, email=payload.email, phone=payload.phone, employee_code=unique_employee_code)

    from utils.auth import hash_password

    now = _now()
    stamp = now.strftime("%d%m%Y%H%M%S")
    role = payload.role
    uid = f"{_role_prefix(role)}-{stamp}"
    code_as_user_id_roles = {"employee", "broker"}
    if role in code_as_user_id_roles and payload.employee_code:
        user_id = payload.employee_code.strip()
    elif role == "admin":
        user_id = uid
    else:
        user_id = f"user_{uuid4().hex[:14]}"
    doc = payload.model_dump()
    if role == "admin" and not (doc.get("department") or "").strip():
        doc["department"] = "Administration"
    doc.update({
        "user_id": user_id,
        "uid": uid,
        "password_hash": hash_password(password),
        "role": role,
        "kyc_status": "unverified",
        "is_active": payload.employment_status != "inactive",
        "is_email_verified": False,
        "is_phone_verified": False,
        "registration_fee_paid": False,
        "terms_accepted": True,
        "created_at": now,
        "updated_at": now,
        "created_by": current_user["user_id"],
    })
    doc.pop("password", None)
    await db.users.insert_one(doc)

    if payload.reports_to:
        rel = {
            "relation_id": f"rel_{uuid4().hex[:12]}",
            "employee_id": user_id,
            "reports_to_id": payload.reports_to,
            "relation_type": "primary",
            "status": "active",
            "created_at": now,
            "updated_at": now,
            "created_by": current_user["user_id"],
        }
        await db.reporting_relations.insert_one(rel)

    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="user_organization_management", action="user_created", record_id=user_id, new_value=_public_user(doc))
    return api_response("User created", {"user": _public_user(doc)})


@router.patch("/users/{user_id}")
async def update_admin_user(user_id: str, payload: AdminUserPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    existing = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    await _assert_unique_user_fields(db, email=payload.email, phone=payload.phone, employee_code=payload.employee_code or "", user_id=user_id)
    updates = payload.model_dump()
    updates.pop("password", None)
    if payload.role == "admin" and not (updates.get("department") or "").strip():
        updates["department"] = "Administration"
    updates["updated_at"] = _now()
    updates["is_active"] = payload.employment_status != "inactive"
    await db.users.update_one({"user_id": user_id}, {"$set": updates})
    updated = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="user_organization_management", action="user_updated", record_id=user_id, old_value=_public_user(existing), new_value=updated)
    return api_response("User updated", {"user": updated})


@router.patch("/users/{user_id}/status")
async def update_admin_user_status(user_id: str, payload: UserStatusPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    existing = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    if existing.get("admin_delete_protected") and not payload.is_active:
        raise HTTPException(status_code=400, detail="Protected administrators cannot be deactivated from this action")
    await db.users.update_one({"user_id": user_id}, {"$set": {"is_active": payload.is_active, "employment_status": "active" if payload.is_active else "inactive", "updated_at": _now()}})
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="user_organization_management", action="user_activated" if payload.is_active else "user_deactivated", record_id=user_id, old_value={"is_active": existing.get("is_active", True)}, new_value={"is_active": payload.is_active}, reason=payload.reason)
    return api_response("User status updated")


@router.post("/users/{user_id}/reset-password")
async def reset_admin_user_password(user_id: str, payload: ResetPasswordPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    existing = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    _validate_password_strength(payload.password)
    from utils.auth import hash_password
    await db.users.update_one({"user_id": user_id}, {"$set": {"password_hash": hash_password(payload.password), "updated_at": _now(), "password_reset_required": False}})
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="user_organization_management", action="password_reset", record_id=user_id, reason=payload.reason)
    return api_response("Password reset successfully")


@router.get("/users/{user_id}/audit-logs")
async def user_audit_logs(user_id: str, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    logs = await db.audit_logs.find({"record_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(length=50)
    return api_response("User audit history loaded", {"logs": logs})


@router.delete("/users/{user_id}")
async def delete_inactive_admin_user(user_id: str, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    existing = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    if existing.get("admin_delete_protected"):
        raise HTTPException(status_code=400, detail="Protected admin accounts cannot be deleted")
    if existing.get("is_active", True):
        raise HTTPException(status_code=400, detail="Deactivate this user before deleting")

    await db.users.delete_one({"user_id": user_id})
    await write_audit_log(
        db,
        user_id=current_user["user_id"],
        role=current_user["role"],
        module="user_organization_management",
        action="inactive_user_deleted",
        record_id=user_id,
        old_value=existing,
        reason="Inactive user deleted from User Directory",
    )
    return api_response("Inactive user deleted")


@router.get("/roles")
async def roles(current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    await ensure_default_permissions(db)
    items = await db.roles.find({}, {"_id": 0}).sort("role_name", 1).to_list(length=500)
    return api_response("Roles loaded", {"roles": items})


@router.post("/roles")
async def create_role(payload: RolePayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    role_key = payload.role_key or payload.role_name.lower().replace(" ", "_")
    if await db.roles.find_one({"role_key": role_key}):
        raise HTTPException(status_code=400, detail="Role already exists")
    doc = payload.model_dump()
    doc.update({"role_id": f"role_{uuid4().hex[:12]}", "role_key": role_key, "is_system": False, "created_at": _now(), "updated_at": _now()})
    await db.roles.insert_one(doc)
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="roles_access_permissions", action="role_created", record_id=doc["role_id"], new_value=doc)
    return api_response("Role created", {"role": doc})


@router.put("/roles/{role_id}")
async def update_role(role_id: str, payload: RolePayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    existing = await db.roles.find_one({"role_id": role_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Role not found")
    role_key = payload.role_key or existing.get("role_key") or payload.role_name.lower().replace(" ", "_")
    duplicate = await db.roles.find_one({"role_key": role_key}, {"_id": 0})
    if duplicate and duplicate.get("role_id") != role_id:
        raise HTTPException(status_code=400, detail="Role key already exists")
    updates = payload.model_dump()
    updates.update({"role_key": role_key, "updated_at": _now()})
    if existing.get("is_system"):
        updates["is_system"] = True
    await db.roles.update_one({"role_id": role_id}, {"$set": updates})
    updated = await db.roles.find_one({"role_id": role_id}, {"_id": 0})
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="roles_access_permissions", action="role_updated", record_id=role_id, old_value=existing, new_value=updated)
    return api_response("Role updated", {"role": updated})


@router.patch("/roles/{role_id}/status")
async def update_role_status(role_id: str, payload: RoleStatusPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    existing = await db.roles.find_one({"role_id": role_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Role not found")
    if existing.get("is_system") and not payload.is_active:
        raise HTTPException(status_code=400, detail="System roles cannot be deactivated")
    await db.roles.update_one({"role_id": role_id}, {"$set": {"is_active": payload.is_active, "updated_at": _now()}})
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="roles_access_permissions", action="role_activated" if payload.is_active else "role_deactivated", record_id=role_id, old_value={"is_active": existing.get("is_active", True)}, new_value={"is_active": payload.is_active}, reason=payload.reason)
    return api_response("Role status updated")


@router.post("/roles/bulk-delete")
async def bulk_delete_roles(payload: BulkRoleDeletePayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    role_ids = list(dict.fromkeys([role_id for role_id in payload.role_ids if role_id]))
    if not role_ids:
        raise HTTPException(status_code=400, detail="Select at least one role")

    roles_to_delete = await db.roles.find({"role_id": {"$in": role_ids}}, {"_id": 0}).to_list(length=len(role_ids))
    existing_by_id = {role["role_id"]: role for role in roles_to_delete}
    missing = [role_id for role_id in role_ids if role_id not in existing_by_id]
    deleted = []
    skipped = []

    for role_id in role_ids:
        existing = existing_by_id.get(role_id)
        if not existing:
            skipped.append({"role_id": role_id, "reason": "Role not found"})
            continue

        role_key = existing.get("role_key")
        assigned_user = await db.users.find_one({"admin_role_key": role_key}, {"_id": 0, "user_id": 1, "full_name": 1})
        if assigned_user:
            skipped.append({
                "role_id": role_id,
                "role_name": existing.get("role_name"),
                "reason": f"Assigned to {assigned_user.get('full_name') or assigned_user.get('user_id')}",
            })
            continue

        await db.roles.delete_one({"role_id": role_id})
        deleted.append({"role_id": role_id, "role_name": existing.get("role_name")})
        await write_audit_log(
            db,
            user_id=current_user["user_id"],
            role=current_user["role"],
            module="roles_access_permissions",
            action="role_deleted",
            record_id=role_id,
            old_value=existing,
            reason="Role bulk deleted from Roles & Permissions",
        )

    message = f"Deleted {len(deleted)} role(s)"
    if skipped or missing:
        message = f"{message}; skipped {len(skipped)} role(s)"
    return api_response(message, {"deleted": deleted, "skipped": skipped})


@router.delete("/roles/{role_id}")
async def delete_role(role_id: str, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    existing = await db.roles.find_one({"role_id": role_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Role not found")

    role_key = existing.get("role_key")
    assigned_user = await db.users.find_one({"admin_role_key": role_key}, {"_id": 0, "user_id": 1, "full_name": 1})
    if assigned_user:
        raise HTTPException(status_code=400, detail="This role is assigned to users. Remove user access before deleting")

    await db.roles.delete_one({"role_id": role_id})
    await write_audit_log(
        db,
        user_id=current_user["user_id"],
        role=current_user["role"],
        module="roles_access_permissions",
        action="role_deleted",
        record_id=role_id,
        old_value=existing,
        reason="Role deleted from Roles & Permissions",
    )
    return api_response("Role deleted")


@router.get("/permissions")
async def permissions(current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    await ensure_default_permissions(db)
    items = await db.permissions.find({}, {"_id": 0}).sort("permission_key", 1).to_list(length=1000)
    return api_response("Permissions loaded", {"permissions": items})


@router.post("/users/{user_id}/assign-access")
async def assign_access(user_id: str, payload: UserAssignmentPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    updates = {"updated_at": _now()}
    if payload.role_key:
        updates["admin_role_key"] = payload.role_key
    if payload.permissions is not None:
        updates["access_controls"] = payload.permissions
    if payload.access_scope:
        updates["admin_scope"] = payload.access_scope
    await db.users.update_one({"user_id": user_id}, {"$set": updates})
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="roles_access_permissions", action="user_access_assigned", record_id=user_id, old_value={"admin_role_key": user.get("admin_role_key"), "access_controls": user.get("access_controls")}, new_value=updates, reason=payload.reason or "")
    return api_response("User access updated")


@router.get("/protected-accounts")
async def protected_accounts(current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    users = await db.users.find({"admin_delete_protected": True}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(length=500)
    return api_response("Protected accounts loaded", {"users": users})


@router.get("/access-history")
async def access_history(current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    logs = await db.audit_logs.find({"module": "roles_access_permissions"}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(length=100)
    return api_response("Access history loaded", {"logs": logs})


@router.get("/reporting-hierarchy")
async def reporting_hierarchy(current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    users = await db.users.find({"role": {"$in": ["admin", "employee", "broker"]}}, {"_id": 0, "password_hash": 0}).to_list(length=2000)
    relations = await db.reporting_relations.find({"status": "active"}, {"_id": 0}).to_list(length=2000)
    relation_map = {r["employee_id"]: r for r in relations}
    user_map = {u["user_id"]: u for u in users}
    children = {}
    for rel in relations:
        children.setdefault(rel.get("reports_to_id"), []).append(rel.get("employee_id"))
    nodes = []
    for user in users:
        rel = relation_map.get(user["user_id"], {})
        manager_id = rel.get("reports_to_id") or user.get("reports_to")
        manager = user_map.get(manager_id or "")
        direct_report_ids = children.get(user["user_id"], [])
        nodes.append({
            "user_id": user["user_id"],
            "name": user.get("full_name"),
            "employee_code": user.get("employee_code") or user.get("uid") or user.get("lg_code"),
            "role": user.get("role"),
            "designation": user.get("designation") or user.get("department") or user.get("role"),
            "department": user.get("department"),
            "branch": user.get("branch"),
            "franchise": user.get("franchise"),
            "reports_to": manager_id,
            "reports_to_name": manager.get("full_name") if manager else "",
            "direct_report_ids": direct_report_ids,
            "direct_reports_count": len(direct_report_ids),
            "active_tasks": 0,
            "escalated_tasks": 0,
            "status": "active" if user.get("is_active", True) else "inactive",
        })
    unassigned = [node for node in nodes if node["role"] != "admin" and not node.get("reports_to")]
    inactive_manager_ids = {node["user_id"] for node in nodes if node["status"] == "inactive" and node["direct_reports_count"] > 0}
    exceptions = []
    for node in unassigned:
        exceptions.append({"type": "unassigned_employee", "severity": "warning", "user_id": node["user_id"], "message": "Employee has no reporting manager"})
    for manager_id in inactive_manager_ids:
        exceptions.append({"type": "inactive_manager_with_reports", "severity": "critical", "user_id": manager_id, "message": "Inactive manager has active direct reports"})
    return api_response("Reporting hierarchy loaded", {"nodes": nodes, "relations": relations, "exceptions": exceptions})


@router.post("/reporting-relations")
async def save_reporting_relation(payload: ReportingRelationPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    if payload.employee_id == payload.reports_to_id:
        raise HTTPException(status_code=400, detail="A user cannot report to themselves")
    employee = await db.users.find_one({"user_id": payload.employee_id}, {"_id": 0})
    manager = await db.users.find_one({"user_id": payload.reports_to_id}, {"_id": 0})
    if not employee or not manager:
        raise HTTPException(status_code=404, detail="Employee or manager not found")
    if not manager.get("is_active", True):
        raise HTTPException(status_code=400, detail="Inactive manager cannot receive active direct reports")
    current = await db.reporting_relations.find_one({"employee_id": payload.employee_id, "status": "active"}, {"_id": 0})
    probe = payload.reports_to_id
    seen = {payload.employee_id}
    while probe:
        if probe in seen:
            raise HTTPException(status_code=400, detail="Reporting loop detected")
        seen.add(probe)
        parent = await db.reporting_relations.find_one({"employee_id": probe, "status": "active"}, {"_id": 0})
        probe = parent.get("reports_to_id") if parent else None
    if current:
        await db.reporting_relations.update_one({"relation_id": current["relation_id"]}, {"$set": {"status": "inactive", "ended_at": _now()}})
        await db.reporting_history.insert_one({**current, "history_id": f"rh_{uuid4().hex[:12]}", "changed_at": _now(), "changed_by": current_user["user_id"]})
    doc = payload.model_dump()
    doc.update({"relation_id": f"rel_{uuid4().hex[:12]}", "status": "active", "created_at": _now(), "updated_at": _now(), "created_by": current_user["user_id"]})
    await db.reporting_relations.insert_one(doc)
    await db.users.update_one({"user_id": payload.employee_id}, {"$set": {"reports_to": payload.reports_to_id, "updated_at": _now()}})
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="reporting_hierarchy", action="reporting_manager_changed", record_id=payload.employee_id, old_value=current, new_value=doc, reason=payload.reason or "")
    return api_response("Reporting relation saved", {"relation": doc})


@router.post("/reporting-hierarchy/transfer")
async def transfer_employee(payload: TransferEmployeePayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    employee = await db.users.find_one({"user_id": payload.employee_id}, {"_id": 0, "password_hash": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    updates = {"updated_at": _now()}
    for key, value in {
        "branch": payload.new_branch,
        "department": payload.new_department,
        "franchise": payload.new_franchise,
    }.items():
        if value:
            updates[key] = value
    await db.users.update_one({"user_id": payload.employee_id}, {"$set": updates})
    relation = None
    if payload.new_manager_id:
        relation_payload = ReportingRelationPayload(employee_id=payload.employee_id, reports_to_id=payload.new_manager_id, reason=payload.reason)
        relation_response = await save_reporting_relation(relation_payload, current_user, db)
        relation = relation_response["data"].get("relation")
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="reporting_hierarchy", action="employee_transferred", record_id=payload.employee_id, old_value=employee, new_value={**updates, "relation": relation}, reason=payload.reason)
    return api_response("Employee transferred", {"updates": updates, "relation": relation})


@router.get("/reporting-hierarchy/{user_id}/history")
async def reporting_history(user_id: str, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    history = await db.reporting_history.find({"employee_id": user_id}, {"_id": 0}).sort("changed_at", -1).limit(100).to_list(length=100)
    audits = await db.audit_logs.find({"record_id": user_id, "module": "reporting_hierarchy"}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(length=100)
    return api_response("Reporting history loaded", {"history": history, "audits": audits})


@router.get("/escalation-rules")
async def escalation_rules(current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    if await db.escalation_rules.count_documents({}) == 0:
        await db.escalation_rules.insert_one({
            "rule_id": f"esc_{uuid4().hex[:12]}",
            "rule_name": "Default Property Verification Rule",
            "process_name": "Property Operations",
            "task_type": "Broker Property Verification",
            "primary_owner_role": "broker",
            "sla_duration_hours": 24,
            "reminder_hours": 12,
            "first_escalation": "Assigned RM",
            "second_escalation": "Team Leader",
            "third_escalation": "Branch Manager",
            "final_escalation": "Property Admin / State Head",
            "notification_channels": ["in_app", "email", "whatsapp"],
            "priority": "high",
            "status": "active",
            "created_at": _now(),
            "updated_at": _now(),
        })
    items = await db.escalation_rules.find({}, {"_id": 0}).sort("created_at", -1).to_list(length=500)
    return api_response("Escalation rules loaded", {"rules": items})


@router.post("/escalation-rules")
async def create_escalation_rule(payload: EscalationRulePayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    doc = payload.model_dump()
    doc.update({"rule_id": f"esc_{uuid4().hex[:12]}", "created_at": _now(), "updated_at": _now(), "created_by": current_user["user_id"]})
    await db.escalation_rules.insert_one(doc)
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="escalation_sla_matrix", action="escalation_rule_created", record_id=doc["rule_id"], new_value=doc)
    return api_response("Escalation rule created", {"rule": doc})


@router.put("/escalation-rules/{rule_id}")
async def update_escalation_rule(rule_id: str, payload: EscalationRulePayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    existing = await db.escalation_rules.find_one({"rule_id": rule_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Escalation rule not found")
    updates = payload.model_dump()
    updates["updated_at"] = _now()
    await db.escalation_rules.update_one({"rule_id": rule_id}, {"$set": updates})
    updated = await db.escalation_rules.find_one({"rule_id": rule_id}, {"_id": 0})
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="escalation_sla_matrix", action="escalation_rule_updated", record_id=rule_id, old_value=existing, new_value=updated)
    return api_response("Escalation rule updated", {"rule": updated})


@router.patch("/escalation-rules/{rule_id}/status")
async def update_escalation_rule_status(rule_id: str, payload: EscalationRuleStatusPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    existing = await db.escalation_rules.find_one({"rule_id": rule_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Escalation rule not found")
    await db.escalation_rules.update_one({"rule_id": rule_id}, {"$set": {"status": payload.status, "updated_at": _now()}})
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="escalation_sla_matrix", action="escalation_rule_status_changed", record_id=rule_id, old_value={"status": existing.get("status")}, new_value={"status": payload.status}, reason=payload.reason)
    return api_response("Escalation rule status updated")


async def _ensure_default_sla_and_notifications(db):
    if await db.sla_policies.count_documents({}) == 0:
        now = _now()
        for name, process, task, hours in [
            ("Host KYC SLA", "Host Management", "Host KYC", 24),
            ("Property Verification SLA", "Property Operations", "Broker verification", 24),
            ("Support Ticket SLA", "Support & Ticket Management", "Support tickets", 8),
            ("Refund Approval SLA", "Finance & Settlements", "Refund approval", 24),
            ("Payout Approval SLA", "Finance & Settlements", "Payout approval", 48),
        ]:
            await db.sla_policies.insert_one({
                "policy_id": f"sla_{uuid4().hex[:12]}",
                "policy_name": name,
                "process_name": process,
                "task_type": task,
                "sla_duration_hours": hours,
                "warning_before_hours": max(2, min(12, hours // 2)),
                "breach_priority": "high",
                "business_hours_only": False,
                "status": "active",
                "created_at": now,
                "updated_at": now,
            })
    if await db.notification_rules.count_documents({}) == 0:
        await db.notification_rules.insert_one({
            "notification_rule_id": f"nr_{uuid4().hex[:12]}",
            "rule_name": "Default Escalation Notifications",
            "event_name": "sla_escalation",
            "channels": ["in_app", "email", "whatsapp"],
            "recipient_roles": ["rm", "team_leader", "branch_manager", "admin"],
            "template": "Task {{task_id}} requires attention. Current status: {{status}}.",
            "retry_enabled": True,
            "status": "active",
            "created_at": _now(),
            "updated_at": _now(),
        })


@router.get("/sla-policies")
async def sla_policies(current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    await _ensure_default_sla_and_notifications(db)
    items = await db.sla_policies.find({}, {"_id": 0}).sort("created_at", -1).to_list(length=500)
    return api_response("SLA policies loaded", {"policies": items})


@router.post("/sla-policies")
async def create_sla_policy(payload: SLAPolicyPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    doc = payload.model_dump()
    doc.update({"policy_id": f"sla_{uuid4().hex[:12]}", "created_at": _now(), "updated_at": _now(), "created_by": current_user["user_id"]})
    await db.sla_policies.insert_one(doc)
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="escalation_sla_matrix", action="sla_policy_created", record_id=doc["policy_id"], new_value=doc)
    return api_response("SLA policy created", {"policy": doc})


@router.put("/sla-policies/{policy_id}")
async def update_sla_policy(policy_id: str, payload: SLAPolicyPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    existing = await db.sla_policies.find_one({"policy_id": policy_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="SLA policy not found")
    updates = payload.model_dump()
    updates["updated_at"] = _now()
    await db.sla_policies.update_one({"policy_id": policy_id}, {"$set": updates})
    updated = await db.sla_policies.find_one({"policy_id": policy_id}, {"_id": 0})
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="escalation_sla_matrix", action="sla_policy_updated", record_id=policy_id, old_value=existing, new_value=updated)
    return api_response("SLA policy updated", {"policy": updated})


def _hours_since(value):
    if not value:
        return 0
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return 0
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return max(0, int((_now() - value).total_seconds() // 3600))


def _escalation_status(age_hours, sla_hours):
    if age_hours >= sla_hours * 4:
        return "critical"
    if age_hours >= sla_hours * 3:
        return "level_3_escalated"
    if age_hours >= sla_hours * 2:
        return "level_2_escalated"
    if age_hours >= sla_hours:
        return "level_1_escalated"
    if age_hours >= max(0, sla_hours - 4):
        return "due_soon"
    return "within_sla"


@router.get("/active-escalations")
async def active_escalations(current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    await _ensure_default_sla_and_notifications(db)
    instances = await db.escalation_instances.find({"status": {"$nin": ["resolved", "closed"]}}, {"_id": 0}).sort("created_at", -1).to_list(length=500)
    pending_properties = await db.properties.find({"status": {"$in": ["pending_verification", "under_review"]}}, {"_id": 0}).sort("submitted_at", -1).limit(100).to_list(length=100)
    pending_tickets = await db.support_tickets.find({"status": {"$nin": ["resolved", "closed"]}}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(length=100)
    derived = []
    for prop in pending_properties:
        age = _hours_since(prop.get("submitted_at") or prop.get("updated_at") or prop.get("created_at"))
        derived.append({
            "instance_id": f"derived_property_{prop.get('property_id')}",
            "record_id": prop.get("property_id"),
            "title": prop.get("title") or prop.get("property_name") or prop.get("property_id"),
            "process_name": "Property Operations",
            "task_type": "Property verification",
            "owner": prop.get("broker_id") or prop.get("owner_id") or "",
            "sla_duration_hours": 24,
            "age_hours": age,
            "status": _escalation_status(age, 24),
            "priority": "high" if age >= 24 else "medium",
            "source": "properties",
        })
    for ticket in pending_tickets:
        age = _hours_since(ticket.get("created_at") or ticket.get("updated_at"))
        derived.append({
            "instance_id": f"derived_ticket_{ticket.get('ticket_id')}",
            "record_id": ticket.get("ticket_id"),
            "title": ticket.get("subject") or ticket.get("category") or ticket.get("ticket_id"),
            "process_name": "Support & Ticket Management",
            "task_type": "Support ticket",
            "owner": ticket.get("assigned_agent") or ticket.get("user_id") or "",
            "sla_duration_hours": 8,
            "age_hours": age,
            "status": _escalation_status(age, 8),
            "priority": ticket.get("priority", "medium"),
            "source": "support_tickets",
        })
    return api_response("Active escalations loaded", {"instances": instances + derived})


@router.get("/escalation-history")
async def escalation_history(current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    instances = await db.escalation_instances.find({"status": {"$in": ["resolved", "closed"]}}, {"_id": 0}).sort("updated_at", -1).limit(100).to_list(length=100)
    audits = await db.audit_logs.find({"module": "escalation_sla_matrix"}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(length=100)
    return api_response("Escalation history loaded", {"instances": instances, "audits": audits})


@router.get("/notification-rules")
async def notification_rules(current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    await _ensure_default_sla_and_notifications(db)
    items = await db.notification_rules.find({}, {"_id": 0}).sort("created_at", -1).to_list(length=500)
    return api_response("Notification rules loaded", {"rules": items})


@router.post("/notification-rules")
async def create_notification_rule(payload: NotificationRulePayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    doc = payload.model_dump()
    doc.update({"notification_rule_id": f"nr_{uuid4().hex[:12]}", "created_at": _now(), "updated_at": _now(), "created_by": current_user["user_id"]})
    await db.notification_rules.insert_one(doc)
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="escalation_sla_matrix", action="notification_rule_created", record_id=doc["notification_rule_id"], new_value=doc)
    return api_response("Notification rule created", {"rule": doc})


@router.put("/notification-rules/{rule_id}")
async def update_notification_rule(rule_id: str, payload: NotificationRulePayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    existing = await db.notification_rules.find_one({"notification_rule_id": rule_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Notification rule not found")
    updates = payload.model_dump()
    updates["updated_at"] = _now()
    updates["updated_by"] = current_user["user_id"]
    await db.notification_rules.update_one({"notification_rule_id": rule_id}, {"$set": updates})
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="communication_center", action="notification_rule_updated", record_id=rule_id, old_value=existing, new_value=updates, reason=f"Updated notification rule {payload.rule_name}")
    return api_response("Notification rule updated")


@router.patch("/notification-rules/{rule_id}/status")
async def update_notification_rule_status(rule_id: str, payload: NotificationRuleStatusPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    if payload.status not in {"active", "inactive", "disabled"}:
        raise HTTPException(status_code=400, detail="Invalid notification rule status")
    existing = await db.notification_rules.find_one({"notification_rule_id": rule_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Notification rule not found")
    updates = {"status": payload.status, "updated_at": _now(), "updated_by": current_user["user_id"]}
    await db.notification_rules.update_one({"notification_rule_id": rule_id}, {"$set": updates})
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="communication_center", action="notification_rule_status_changed", record_id=rule_id, old_value={"status": existing.get("status")}, new_value=updates, reason=payload.reason)
    return api_response("Notification rule status updated")


@router.get("/audit-logs")
async def audit_logs(
    module: Optional[str] = None,
    action: Optional[str] = None,
    user_id: Optional[str] = None,
    record_id: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    active_record_query = {"is_deleted": {"$ne": True}}
    query = dict(active_record_query)
    if module:
        query["module"] = module
    if action:
        query["action"] = {"$regex": action, "$options": "i"}
    if user_id:
        query["user_id"] = {"$regex": user_id, "$options": "i"}
    if record_id:
        query["record_id"] = {"$regex": record_id, "$options": "i"}
    if status_filter:
        query["status"] = status_filter
    created_range = {}
    if date_from:
        created_range["$gte"] = _parse_date_start(date_from)
    if date_to:
        created_range["$lte"] = _parse_date_end(date_to)
    if created_range:
        query["created_at"] = created_range
    if search:
        query["$or"] = [
            {"user_id": {"$regex": search, "$options": "i"}},
            {"action": {"$regex": search, "$options": "i"}},
            {"record_id": {"$regex": search, "$options": "i"}},
            {"module": {"$regex": search, "$options": "i"}},
            {"reason": {"$regex": search, "$options": "i"}},
        ]
    items = await db.audit_logs.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    total = await db.audit_logs.count_documents(query)
    return api_response("Audit logs loaded", {"logs": items}, {"total": total, "limit": limit, "skip": skip})


@router.get("/audit-logs/export-csv")
async def export_audit_logs(
    module: Optional[str] = None,
    action: Optional[str] = None,
    user_id: Optional[str] = None,
    record_id: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    query = {}
    if module:
        query["module"] = module
    if action:
        query["action"] = {"$regex": action, "$options": "i"}
    if user_id:
        query["user_id"] = {"$regex": user_id, "$options": "i"}
    if record_id:
        query["record_id"] = {"$regex": record_id, "$options": "i"}
    if status_filter:
        query["status"] = status_filter
    created_range = {}
    if date_from:
        created_range["$gte"] = _parse_date_start(date_from)
    if date_to:
        created_range["$lte"] = _parse_date_end(date_to)
    if created_range:
        query["created_at"] = created_range
    if search:
        query["$or"] = [
            {"user_id": {"$regex": search, "$options": "i"}},
            {"action": {"$regex": search, "$options": "i"}},
            {"record_id": {"$regex": search, "$options": "i"}},
            {"module": {"$regex": search, "$options": "i"}},
            {"reason": {"$regex": search, "$options": "i"}},
        ]

    logs = await db.audit_logs.find(query, {"_id": 0}).sort("created_at", -1).limit(10000).to_list(length=10000)
    import csv
    import io

    buf = io.StringIO()
    fields = ["created_at", "audit_id", "user_id", "role", "module", "action", "record_id", "branch", "reason", "status", "ip_address", "device", "immutable"]
    writer = csv.DictWriter(buf, fieldnames=fields)
    writer.writeheader()
    for log in logs:
        writer.writerow({field: log.get(field, "") for field in fields})
    buf.seek(0)
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="audit_activity_logs", action="audit_logs_exported", record_id="audit_logs", new_value={"count": len(logs)})
    filename = f"audit_logs_{_now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={filename}"})


@router.get("/hosts")
async def host_management(
    tab: Optional[str] = "all",
    search: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    query = {"role": "host"}
    if tab == "pending_kyc":
        query["kyc_status"] = "pending"
    elif tab == "kyc_approved":
        query["kyc_status"] = "approved"
    elif tab == "kyc_rejected":
        query["kyc_status"] = "rejected"
    elif tab == "suspended":
        query["is_active"] = False
    elif tab == "agreement_pending":
        query["agreement_signature"] = {"$exists": False}
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"user_id": {"$regex": search, "$options": "i"}},
        ]
    hosts = await db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    broker_ids = list({host.get("broker_id") for host in hosts if host.get("broker_id")})
    rm_ids = list({host.get("rm_id") for host in hosts if host.get("rm_id")})
    branch_manager_ids = list({host.get("branch_manager_id") for host in hosts if host.get("branch_manager_id")})
    branch_manager_codes = list({host.get("branch_manager_code") for host in hosts if host.get("branch_manager_code")})
    brokers = await db.users.find({"user_id": {"$in": broker_ids}}, {"_id": 0, "password_hash": 0}).to_list(length=len(broker_ids) or 1)
    rms = await db.users.find({"user_id": {"$in": rm_ids}}, {"_id": 0, "password_hash": 0}).to_list(length=len(rm_ids) or 1)
    branch_managers = await db.users.find(
        {
            "role": "employee",
            "admin_role_key": "branch_manager",
            "$or": [
                {"user_id": {"$in": branch_manager_ids}},
                {"employee_code": {"$in": branch_manager_codes}},
            ],
        },
        {"_id": 0, "password_hash": 0},
    ).to_list(length=(len(branch_manager_ids) + len(branch_manager_codes)) or 1)
    broker_map = {broker["user_id"]: broker for broker in brokers}
    rm_map = {rm["user_id"]: rm for rm in rms}
    branch_manager_map = {manager["user_id"]: manager for manager in branch_managers}
    branch_manager_code_map = {manager.get("employee_code"): manager for manager in branch_managers if manager.get("employee_code")}
    enriched_hosts = []
    for host in hosts:
        host_id = host.get("user_id")
        broker = broker_map.get(host.get("broker_id")) or {}
        rm = rm_map.get(host.get("rm_id")) or {}
        branch_manager = branch_manager_map.get(host.get("branch_manager_id")) or branch_manager_code_map.get(host.get("branch_manager_code")) or {}
        host["kyc_verification"] = _normalise_host_kyc(host)
        host["broker"] = {
            "user_id": broker.get("user_id") or host.get("broker_id") or "",
            "full_name": broker.get("full_name") or "",
            "lg_code": broker.get("lg_code") or broker.get("employee_code") or broker.get("uid") or "",
            "email": broker.get("email") or "",
        }
        host["rm"] = {
            "user_id": rm.get("user_id") or host.get("rm_id") or "",
            "full_name": rm.get("full_name") or "",
            "employee_code": rm.get("employee_code") or host.get("employee_code") or rm.get("uid") or "",
            "designation": rm.get("designation") or "",
        }
        host["branch_manager"] = {
            "user_id": branch_manager.get("user_id") or host.get("branch_manager_id") or "",
            "full_name": branch_manager.get("full_name") or "",
            "employee_code": branch_manager.get("employee_code") or host.get("branch_manager_code") or branch_manager.get("uid") or "",
            "designation": branch_manager.get("designation") or "",
        }
        host["total_properties"] = await db.properties.count_documents({"owner_id": host_id})
        host["live_properties"] = await db.properties.count_documents({"owner_id": host_id, "status": "live"})
        host["total_bookings"] = await db.bookings.count_documents({"host_id": host_id})
        host["pending_payout"] = await db.payouts.count_documents({"host_id": host_id, "status": {"$nin": ["processed", "paid", "completed"]}})
        host_subscriptions = await db.subscriptions.find(
            {"user_id": host_id, "is_deleted": {"$ne": True}},
            {"_id": 0},
        ).sort("created_at", -1).to_list(length=50)
        current_subscription = next(
            (sub for sub in host_subscriptions if sub.get("status") in {"active", "trial"}),
            host_subscriptions[0] if host_subscriptions else {},
        )
        host["subscription_summary"] = {
            "total": len(host_subscriptions),
            "trial": len([sub for sub in host_subscriptions if sub.get("status") == "trial"]),
            "active": len([sub for sub in host_subscriptions if sub.get("status") == "active"]),
            "expired": len([sub for sub in host_subscriptions if sub.get("status") == "expired"]),
            "cancelled": len([sub for sub in host_subscriptions if sub.get("status") == "cancelled"]),
            "current": current_subscription,
        }
        if tab != "subscription_status" or host["subscription_summary"]["total"] > 0:
            enriched_hosts.append(host)
    hosts = enriched_hosts
    total = len(hosts) if tab == "subscription_status" else await db.users.count_documents(query)
    return api_response("Hosts loaded", {"hosts": hosts}, {"total": total, "limit": limit, "skip": skip})


@router.patch("/hosts/{host_id}/kyc")
async def decide_host_kyc(host_id: str, payload: HostKycDecisionPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    if payload.status not in {"approved", "rejected", "pending"}:
        raise HTTPException(status_code=400, detail="Invalid KYC status")
    host = await db.users.find_one({"user_id": host_id, "role": "host"}, {"_id": 0})
    if not host:
        raise HTTPException(status_code=404, detail="Host not found")
    updates = {"kyc_status": payload.status, "kyc_remarks": payload.remarks or "", "updated_at": _now()}
    await db.users.update_one({"user_id": host_id}, {"$set": updates})
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="host_management", action=f"host_kyc_{payload.status}", record_id=host_id, old_value={"kyc_status": host.get("kyc_status")}, new_value=updates, reason=payload.remarks or "")
    return api_response("Host KYC updated")


@router.get("/hosts/{host_id}/kyc")
async def host_kyc_detail(host_id: str, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    host = await db.users.find_one({"user_id": host_id, "role": "host"}, {"_id": 0, "password_hash": 0})
    if not host:
        raise HTTPException(status_code=404, detail="Host not found")
    host["kyc_verification"] = _normalise_host_kyc(host)
    return api_response("Host KYC detail loaded", {"host": host})


async def _append_host_kyc_history(db, host_id: str, event: dict):
    event_doc = {
        "event_id": f"HKYC-{uuid4().hex[:10].upper()}",
        "created_at": _now().isoformat(),
        **event,
    }
    await db.users.update_one({"user_id": host_id}, {"$push": {"kyc_review_history": {"$each": [event_doc], "$position": 0, "$slice": 50}}})
    return event_doc


@router.patch("/hosts/{host_id}/kyc/document")
async def decide_host_kyc_document(host_id: str, payload: HostKycDocumentPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    if payload.status not in {"approved", "rejected", "pending"}:
        raise HTTPException(status_code=400, detail="Invalid document status")
    host = await db.users.find_one({"user_id": host_id, "role": "host"}, {"_id": 0})
    if not host:
        raise HTTPException(status_code=404, detail="Host not found")
    docs = list(host.get("kyc_documents") or [])
    updated = False
    for doc in docs:
        if doc.get("document_type") == payload.document_type:
            doc["status"] = payload.status
            doc["rejection_reason"] = payload.remarks if payload.status == "rejected" else ""
            doc["reviewed_by"] = current_user["user_id"]
            doc["reviewed_at"] = _now().isoformat()
            updated = True
            break
    if not updated:
        raise HTTPException(status_code=404, detail="Document not found")
    await db.users.update_one({"user_id": host_id}, {"$set": {"kyc_documents": docs, "updated_at": _now()}})
    await _append_host_kyc_history(db, host_id, {"action": f"document_{payload.status}", "document_type": payload.document_type, "remarks": payload.remarks or "", "admin_id": current_user["user_id"]})
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="host_management", action=f"host_document_{payload.status}", record_id=host_id, old_value={"document_type": payload.document_type}, new_value={"status": payload.status}, reason=payload.remarks or "")
    return api_response("Host KYC document updated")


@router.patch("/hosts/{host_id}/kyc/bank")
async def decide_host_bank(host_id: str, payload: HostBankVerificationPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    if payload.status not in {"approved", "rejected", "pending"}:
        raise HTTPException(status_code=400, detail="Invalid bank verification status")
    host = await db.users.find_one({"user_id": host_id, "role": "host"}, {"_id": 0})
    if not host:
        raise HTTPException(status_code=404, detail="Host not found")
    updates = {"bank_verification_status": payload.status, "bank_verification_remarks": payload.remarks or "", "bank_verified_by": current_user["user_id"], "bank_verified_at": _now().isoformat(), "updated_at": _now()}
    await db.users.update_one({"user_id": host_id}, {"$set": updates})
    await _append_host_kyc_history(db, host_id, {"action": f"bank_{payload.status}", "remarks": payload.remarks or "", "admin_id": current_user["user_id"]})
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="host_management", action=f"host_bank_{payload.status}", record_id=host_id, old_value={"bank_verification_status": host.get("bank_verification_status")}, new_value=updates, reason=payload.remarks or "")
    return api_response("Host bank verification updated")


@router.patch("/hosts/{host_id}/kyc/agreement")
async def decide_host_agreement(host_id: str, payload: HostAgreementVerificationPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    if payload.status not in {"approved", "rejected", "pending"}:
        raise HTTPException(status_code=400, detail="Invalid agreement status")
    host = await db.users.find_one({"user_id": host_id, "role": "host"}, {"_id": 0})
    if not host:
        raise HTTPException(status_code=404, detail="Host not found")
    updates = {"agreement_status": payload.status, "agreement_remarks": payload.remarks or "", "agreement_reviewed_by": current_user["user_id"], "agreement_reviewed_at": _now().isoformat(), "updated_at": _now()}
    await db.users.update_one({"user_id": host_id}, {"$set": updates})
    await _append_host_kyc_history(db, host_id, {"action": f"agreement_{payload.status}", "remarks": payload.remarks or "", "admin_id": current_user["user_id"]})
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="host_management", action=f"host_agreement_{payload.status}", record_id=host_id, old_value={"agreement_status": host.get("agreement_status")}, new_value=updates, reason=payload.remarks or "")
    return api_response("Host agreement verification updated")


@router.post("/hosts/{host_id}/kyc/request-reupload")
async def request_host_kyc_reupload(host_id: str, payload: HostKycRevisionPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    if not payload.reason.strip():
        raise HTTPException(status_code=400, detail="Reason is required")
    host = await db.users.find_one({"user_id": host_id, "role": "host"}, {"_id": 0})
    if not host:
        raise HTTPException(status_code=404, detail="Host not found")
    docs = list(host.get("kyc_documents") or [])
    selected = set(payload.document_types or [])
    for doc in docs:
        if not selected or doc.get("document_type") in selected:
            doc["status"] = "rejected"
            doc["rejection_reason"] = payload.reason
            doc["reviewed_by"] = current_user["user_id"]
            doc["reviewed_at"] = _now().isoformat()
    updates = {"kyc_status": "rejected", "kyc_documents": docs, "kyc_remarks": payload.reason, "updated_at": _now()}
    await db.users.update_one({"user_id": host_id}, {"$set": updates})
    await _append_host_kyc_history(db, host_id, {"action": "reupload_requested", "document_types": payload.document_types, "remarks": payload.reason, "admin_id": current_user["user_id"]})
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="host_management", action="host_kyc_reupload_requested", record_id=host_id, old_value={"kyc_status": host.get("kyc_status")}, new_value=updates, reason=payload.reason)
    return api_response("Host KYC re-upload requested")


@router.post("/hosts/{host_id}/assign")
async def assign_host_team(host_id: str, payload: AssignmentPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    host = await db.users.find_one({"user_id": host_id, "role": "host"}, {"_id": 0})
    if not host:
        raise HTTPException(status_code=404, detail="Host not found")
    now = _now()
    set_updates = {"updated_at": now}
    unset_updates = {}
    broker_value = (payload.broker_id or "").strip()
    rm_value = (payload.rm_id or "").strip()
    if broker_value:
        primary_user, primary_type = await _resolve_broker_or_rm(db, broker_value)
        if not primary_user:
            raise HTTPException(status_code=400, detail="Broker / RM code not found")
        if primary_type == "broker":
            set_updates["broker_id"] = primary_user["user_id"]
            set_updates["lg_code"] = primary_user.get("lg_code") or primary_user.get("employee_code") or primary_user.get("uid") or primary_user["user_id"]
            unset_updates["branch_manager_id"] = ""
            unset_updates["branch_manager_code"] = ""
            if rm_value:
                rm = await _resolve_assignee_user(db, rm_value, "employee")
                if not rm or not _is_rm_user(rm):
                    raise HTTPException(status_code=400, detail="RM code not found")
                set_updates["rm_id"] = rm["user_id"]
                set_updates["employee_code"] = rm.get("employee_code") or rm.get("uid") or rm["user_id"]
            else:
                unset_updates["rm_id"] = ""
                unset_updates["employee_code"] = ""
        else:
            unset_updates["broker_id"] = ""
            set_updates["rm_id"] = primary_user["user_id"]
            set_updates["lg_code"] = primary_user.get("employee_code") or primary_user.get("uid") or primary_user["user_id"]
            set_updates["employee_code"] = primary_user.get("employee_code") or primary_user.get("uid") or primary_user["user_id"]
            if rm_value:
                branch_manager = await _resolve_assignee_user(db, rm_value, "employee")
                if not branch_manager or not _is_branch_manager_user(branch_manager):
                    raise HTTPException(status_code=400, detail="Branch Manager code not found")
                set_updates["branch_manager_id"] = branch_manager["user_id"]
                set_updates["branch_manager_code"] = branch_manager.get("employee_code") or branch_manager.get("uid") or branch_manager["user_id"]
            else:
                unset_updates["branch_manager_id"] = ""
                unset_updates["branch_manager_code"] = ""
    else:
        unset_updates["broker_id"] = ""
        unset_updates["rm_id"] = ""
        unset_updates["branch_manager_id"] = ""
        unset_updates["lg_code"] = ""
        unset_updates["employee_code"] = ""
        unset_updates["branch_manager_code"] = ""

    update_doc = {"$set": set_updates}
    property_set_updates = {k: v for k, v in set_updates.items() if k in {"broker_id", "rm_id", "branch_manager_id", "branch_manager_code", "employee_code", "updated_at"}}
    property_update_doc = {"$set": property_set_updates}
    if unset_updates:
        update_doc["$unset"] = unset_updates
        property_update_doc["$unset"] = {k: "" for k in unset_updates if k in {"broker_id", "rm_id", "branch_manager_id", "branch_manager_code", "employee_code"}}

    await db.users.update_one({"user_id": host_id}, update_doc)
    await db.properties.update_many({"owner_id": host_id}, property_update_doc)
    audit_new_value = {**set_updates, **{key: None for key in unset_updates}}
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="host_management", action="host_team_assigned", record_id=host_id, old_value={"broker_id": host.get("broker_id"), "rm_id": host.get("rm_id"), "branch_manager_id": host.get("branch_manager_id"), "lg_code": host.get("lg_code"), "employee_code": host.get("employee_code")}, new_value=audit_new_value, reason=payload.reason)
    return api_response("Host assignment updated")


@router.get("/properties-operations")
async def property_operations(
    tab: Optional[str] = "all",
    search: Optional[str] = None,
    category: Optional[str] = None,
    property_type: Optional[str] = None,
    host: Optional[str] = None,
    broker: Optional[str] = None,
    rm: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    query = {}
    created_range = {}
    if date_from:
        created_range["$gte"] = _parse_date_start(date_from)
    if date_to:
        created_range["$lte"] = _parse_date_end(date_to)
    if created_range:
        query["created_at"] = created_range
    status_map = {
        "draft": "draft",
        "submitted": "pending_verification",
        "document_check": "pending_verification",
        "approved": "live",
        "live": "live",
        "rejected": "rejected",
        "suspended": "blocked",
    }
    if tab in status_map:
        query["status"] = status_map[tab]
    elif tab == "boosted":
        query["is_boosted"] = True
    elif tab in {"broker_verification", "rm_verification", "branch_manager_review"}:
        query["status"] = {"$in": ["pending_verification", "under_review"]}
    elif tab == "admin_review":
        query["status"] = {"$in": ["pending_verification", "under_review"]}
    if category:
        query["category"] = category
    if property_type:
        query["property_type"] = property_type
    and_conditions = []
    user_filter_ids = {}
    for filter_key, role in (("host", "host"), ("broker", "broker"), ("rm", "employee")):
        value = {"host": host, "broker": broker, "rm": rm}[filter_key]
        if value:
            user_matches = await db.users.find(
                {
                    "role": role,
                    "$or": [
                        {"user_id": {"$regex": value, "$options": "i"}},
                        {"full_name": {"$regex": value, "$options": "i"}},
                        {"employee_code": {"$regex": value, "$options": "i"}},
                    ],
                },
                {"_id": 0, "user_id": 1},
            ).to_list(length=100)
            user_filter_ids[filter_key] = [item["user_id"] for item in user_matches]
            if not user_filter_ids[filter_key]:
                return api_response("Properties loaded", {"properties": []}, {"total": 0, "limit": limit, "skip": skip})
    if user_filter_ids.get("host"):
        query["owner_id"] = {"$in": user_filter_ids["host"]}
    if user_filter_ids.get("broker"):
        assigned_hosts = await db.users.find({"broker_id": {"$in": user_filter_ids["broker"]}}, {"_id": 0, "user_id": 1}).to_list(length=500)
        assigned_host_ids = [item["user_id"] for item in assigned_hosts]
        broker_or = []
        if assigned_host_ids:
            broker_or.append({"owner_id": {"$in": assigned_host_ids}})
        and_conditions.append({"$or": broker_or or [{"owner_id": {"$in": []}}]})
    if user_filter_ids.get("rm"):
        assigned_hosts = await db.users.find({"rm_id": {"$in": user_filter_ids["rm"]}}, {"_id": 0, "user_id": 1}).to_list(length=500)
        assigned_host_ids = [item["user_id"] for item in assigned_hosts]
        rm_or = []
        if assigned_host_ids:
            rm_or.append({"owner_id": {"$in": assigned_host_ids}})
        and_conditions.append({"$or": rm_or or [{"owner_id": {"$in": []}}]})
    if search:
        matching_users = await db.users.find(
            {
                "$or": [
                    {"full_name": {"$regex": search, "$options": "i"}},
                    {"user_id": {"$regex": search, "$options": "i"}},
                    {"employee_code": {"$regex": search, "$options": "i"}},
                ]
            },
            {"_id": 0, "user_id": 1},
        ).to_list(length=100)
        matching_user_ids = [item["user_id"] for item in matching_users]
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"property_id": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}},
            {"owner_id": {"$regex": search, "$options": "i"}},
            {"property_type": {"$regex": search, "$options": "i"}},
            {"bhk_type": {"$regex": search, "$options": "i"}},
        ]
        if matching_user_ids:
            matching_assigned_hosts = await db.users.find(
                {"$or": [{"broker_id": {"$in": matching_user_ids}}, {"rm_id": {"$in": matching_user_ids}}]},
                {"_id": 0, "user_id": 1},
            ).to_list(length=500)
            matching_assigned_host_ids = [item["user_id"] for item in matching_assigned_hosts]
            query["$or"].extend([
                {"owner_id": {"$in": matching_user_ids}},
            ])
            if matching_assigned_host_ids:
                query["$or"].append({"owner_id": {"$in": matching_assigned_host_ids}})
    if and_conditions:
        query["$and"] = and_conditions
    sort_fields = [("created_at", -1)]
    if tab == "boosted":
        sort_fields = [("boost_rank", 1), ("created_at", -1)]
    workflow_tabs = {"broker_verification", "rm_verification", "branch_manager_review", "admin_review"}
    fetch_skip = 0 if tab in workflow_tabs else skip
    fetch_limit = 10000 if tab in workflow_tabs else limit
    props = await db.properties.find(query, {"_id": 0}).sort(sort_fields).skip(fetch_skip).limit(fetch_limit).to_list(length=fetch_limit)
    owner_ids = list({p.get("owner_id") for p in props if p.get("owner_id")})
    owners = await db.users.find({"user_id": {"$in": owner_ids}}, {"_id": 0, "password_hash": 0}).to_list(length=len(owner_ids) or 1)
    owner_map = {u["user_id"]: u for u in owners}
    team_ids = list({
        value
        for p in props
        for value in (p.get("broker_id"), p.get("rm_id"), p.get("branch_manager_id"))
        if value
    })
    team_ids = list(set(team_ids + [
        value
        for owner in owners
        for value in (owner.get("broker_id"), owner.get("rm_id"), owner.get("branch_manager_id"))
        if value
    ]))
    team_users = await db.users.find({"user_id": {"$in": team_ids}}, {"_id": 0, "password_hash": 0}).to_list(length=len(team_ids) or 1)
    team_map = {u["user_id"]: u for u in team_users}
    for prop in props:
        owner = owner_map.get(prop.get("owner_id"), {})
        assignment = _property_team_assignment(prop, owner)
        prop["host_name"] = owner.get("full_name")
        prop["assigned_broker"] = assignment["broker"]
        prop["assigned_rm"] = assignment["rm"]
        prop["assigned_branch_manager"] = assignment["branch_manager"]
        broker_user = team_map.get(prop.get("assigned_broker"), {})
        rm_user = team_map.get(prop.get("assigned_rm"), {})
        branch_manager_user = team_map.get(prop.get("assigned_branch_manager"), {})
        prop["broker_name"] = broker_user.get("full_name")
        prop["broker_code"] = _team_code(broker_user, prop.get("assigned_broker"))
        prop["rm_name"] = rm_user.get("full_name")
        prop["rm_code"] = _team_code(rm_user, prop.get("assigned_rm"))
        prop["branch_manager_name"] = branch_manager_user.get("full_name")
        prop["branch_manager_code"] = _team_code(branch_manager_user, assignment["branch_manager_code"] or prop.get("assigned_branch_manager"))
        verification = await db.property_verifications.find_one({"property_id": prop.get("property_id")}, {"_id": 0})
        prop["verification"] = verification or {}
        prop["workflow_stage"] = _property_operations_stage(prop, assignment, verification)
        prop["operations_review"] = _normalise_property_review(prop, owner, verification)
    if tab in workflow_tabs:
        props = [prop for prop in props if prop.get("workflow_stage") == tab]
        total = len(props)
        props = props[skip: skip + limit]
    else:
        total = await db.properties.count_documents(query)
    return api_response("Properties loaded", {"properties": props}, {"total": total, "limit": limit, "skip": skip})


@router.get("/properties-operations/{property_id}")
async def property_operation_detail(property_id: str, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    prop = await db.properties.find_one({"property_id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    owner = await db.users.find_one({"user_id": prop.get("owner_id")}, {"_id": 0, "password_hash": 0}) or {}
    verification = await db.property_verifications.find_one({"property_id": property_id}, {"_id": 0}) or {}
    prop["host"] = owner
    assignment = _property_team_assignment(prop, owner)
    prop["assigned_broker"] = assignment["broker"]
    prop["assigned_rm"] = assignment["rm"]
    prop["assigned_branch_manager"] = assignment["branch_manager"]
    team_ids = [value for value in (prop.get("assigned_broker"), prop.get("assigned_rm"), prop.get("assigned_branch_manager")) if value]
    team_users = await db.users.find({"user_id": {"$in": team_ids}}, {"_id": 0, "password_hash": 0}).to_list(length=len(team_ids) or 1)
    team_map = {u["user_id"]: u for u in team_users}
    broker_user = team_map.get(prop.get("assigned_broker"), {})
    rm_user = team_map.get(prop.get("assigned_rm"), {})
    prop["broker_name"] = broker_user.get("full_name")
    prop["broker_code"] = _team_code(broker_user, prop.get("assigned_broker"))
    prop["rm_name"] = rm_user.get("full_name")
    prop["rm_code"] = _team_code(rm_user, prop.get("assigned_rm"))
    branch_manager_user = team_map.get(prop.get("assigned_branch_manager"), {})
    prop["branch_manager_name"] = branch_manager_user.get("full_name")
    prop["branch_manager_code"] = _team_code(branch_manager_user, assignment["branch_manager_code"] or prop.get("assigned_branch_manager"))
    prop["operations_review"] = _normalise_property_review(prop, owner, verification)
    return api_response("Property operation detail loaded", {"property": prop})


@router.post("/properties-operations/{property_id}/assign")
async def assign_property_team(property_id: str, payload: AssignmentPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    prop = await db.properties.find_one({"property_id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    set_updates = {"updated_at": _now()}
    unset_updates = {}
    broker_value = (payload.broker_id or "").strip()
    rm_value = (payload.rm_id or "").strip()
    if broker_value:
        broker = await _resolve_assignee_user(db, broker_value, "broker")
        if not broker:
            raise HTTPException(status_code=400, detail="Broker not found")
        set_updates["broker_id"] = broker["user_id"]
    else:
        unset_updates["broker_id"] = ""
    if rm_value:
        rm = await _resolve_assignee_user(db, rm_value, "employee")
        if not rm:
            raise HTTPException(status_code=400, detail="RM not found")
        set_updates["rm_id"] = rm["user_id"]
    else:
        unset_updates["rm_id"] = ""

    update_doc = {"$set": set_updates}
    if unset_updates:
        update_doc["$unset"] = unset_updates
    await db.properties.update_one({"property_id": property_id}, update_doc)
    audit_new_value = {**set_updates, **{key: None for key in unset_updates}}
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="property_operations", action="property_team_assigned", record_id=property_id, old_value={"broker_id": prop.get("broker_id"), "rm_id": prop.get("rm_id")}, new_value=audit_new_value, reason=payload.reason)
    return api_response("Property assignment updated")


@router.patch("/properties-operations/{property_id}/checklist")
async def update_property_checklist(property_id: str, payload: PropertyChecklistPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    if payload.status not in {"approved", "rejected", "pending"}:
        raise HTTPException(status_code=400, detail="Invalid checklist status")
    if payload.item_key not in {item[0] for item in PROPERTY_REVIEW_ITEMS}:
        raise HTTPException(status_code=400, detail="Invalid checklist item")
    prop = await db.properties.find_one({"property_id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    update_key = f"checklist.{payload.item_key}"
    item = {"status": payload.status, "remarks": payload.remarks or "", "reviewed_by": current_user["user_id"], "reviewed_at": _now().isoformat()}
    await db.property_verifications.update_one(
        {"property_id": property_id},
        {"$set": {update_key: item, "updated_at": _now()}, "$setOnInsert": {"property_id": property_id, "created_at": _now()}},
        upsert=True,
    )
    await _append_property_review_history(db, property_id, {"action": f"checklist_{payload.status}", "item_key": payload.item_key, "remarks": payload.remarks or "", "admin_id": current_user["user_id"]})
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="property_operations", action=f"property_checklist_{payload.status}", record_id=property_id, new_value={payload.item_key: item}, reason=payload.remarks or "")
    return api_response("Property checklist updated")


@router.patch("/properties-operations/{property_id}/stage")
async def update_property_stage(property_id: str, payload: PropertyStagePayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    allowed_stages = {"document_check", "broker_verification", "rm_verification", "branch_manager_review", "admin_review"}
    if payload.stage not in allowed_stages:
        raise HTTPException(status_code=400, detail="Invalid review stage")
    if payload.status not in {"approved", "rejected", "pending"}:
        raise HTTPException(status_code=400, detail="Invalid review stage status")
    prop = await db.properties.find_one({"property_id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    stage = {"status": payload.status, "remarks": payload.remarks or "", "reviewed_by": current_user["user_id"], "reviewed_at": _now().isoformat()}
    updates = {f"stages.{payload.stage}": stage, "updated_at": _now()}
    property_updates = {"updated_at": _now()}
    if payload.status == "approved" and payload.stage in {"broker_verification", "rm_verification", "branch_manager_review", "admin_review"}:
        property_updates["status"] = "under_review"
    if payload.status == "rejected":
        property_updates["status"] = "rejected"
        property_updates["verification_remarks"] = payload.remarks or f"{payload.stage} rejected"
    await db.property_verifications.update_one(
        {"property_id": property_id},
        {"$set": updates, "$setOnInsert": {"property_id": property_id, "created_at": _now()}},
        upsert=True,
    )
    await db.properties.update_one({"property_id": property_id}, {"$set": property_updates})
    await _append_property_review_history(db, property_id, {"action": f"{payload.stage}_{payload.status}", "remarks": payload.remarks or "", "admin_id": current_user["user_id"]})
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="property_operations", action=f"property_stage_{payload.status}", record_id=property_id, old_value={"status": prop.get("status")}, new_value={"stage": payload.stage, **stage, **property_updates}, reason=payload.remarks or "")
    return api_response("Property review stage updated")


@router.patch("/properties-operations/{property_id}/status")
async def update_property_operation_status(property_id: str, payload: PropertyStatusPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    allowed = {"draft", "pending_verification", "under_review", "live", "rejected", "blocked"}
    if payload.status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid property status")
    prop = await db.properties.find_one({"property_id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    updates = {"status": payload.status, "verification_remarks": payload.reason, "updated_at": _now()}
    if payload.status == "live":
        updates["approved_at"] = _now()
    await db.properties.update_one({"property_id": property_id}, {"$set": updates})
    await db.property_status_history.insert_one({"history_id": f"psh_{uuid4().hex[:12]}", "property_id": property_id, "old_status": prop.get("status"), "new_status": payload.status, "reason": payload.reason, "changed_by": current_user["user_id"], "created_at": _now()})
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="property_operations", action="property_status_changed", record_id=property_id, old_value={"status": prop.get("status")}, new_value=updates, reason=payload.reason)
    return api_response("Property status updated")


class PropertyBoostPayload(BaseModel):
    is_boosted: bool
    boost_days: Optional[int] = None
    boost_rank: Optional[int] = None


@router.patch("/properties-operations/{property_id}/boost")
async def update_property_boost(property_id: str, payload: PropertyBoostPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    prop = await db.properties.find_one({"property_id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    expires_at = None
    rank = None
    if payload.is_boosted:
        rank = payload.boost_rank
        if not rank or rank < 1 or rank > 5:
            raise HTTPException(status_code=400, detail="Boost rank must be between 1 and 5.")

        # Collision validation: check if another property in the same category has this rank active
        other = await db.properties.find_one({
            "category": prop["category"],
            "is_boosted": True,
            "boost_rank": rank,
            "property_id": {"$ne": property_id}
        })
        if other:
            other_expires = other.get("boost_expires_at")
            is_active = True
            if other_expires:
                try:
                    from datetime import datetime, timezone
                    exp_dt = datetime.fromisoformat(other_expires.replace("Z", "+00:00"))
                    if exp_dt < datetime.now(timezone.utc):
                        is_active = False
                except Exception:
                    pass
            if is_active:
                raise HTTPException(
                    status_code=400,
                    detail=f"Rank #{rank} is already occupied by '{other.get('title')}' in this category. You must stop its boost first."
                )

        if payload.boost_days:
            from datetime import timedelta
            expires_at = (_now() + timedelta(days=payload.boost_days)).isoformat()

    updates = {
        "is_boosted": payload.is_boosted,
        "boost_expires_at": expires_at,
        "boost_rank": rank,
        "updated_at": _now()
    }
    
    await db.properties.update_one({"property_id": property_id}, {"$set": updates})
    await write_audit_log(
        db, 
        user_id=current_user["user_id"], 
        role=current_user["role"], 
        module="property_operations", 
        action="property_boost_changed", 
        record_id=property_id, 
        old_value={"is_boosted": prop.get("is_boosted", False), "boost_expires_at": prop.get("boost_expires_at"), "boost_rank": prop.get("boost_rank")}, 
        new_value=updates, 
        reason=f"Boost toggled to {payload.is_boosted} (rank={rank}, days={payload.boost_days})"
    )
    return api_response("Property boost updated successfully", {"property_id": property_id, **updates})


@router.get("/subscriptions")
async def subscription_management(
    tab: Optional[str] = "all",
    search: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    active_record_query = {"is_deleted": {"$ne": True}}
    query = dict(active_record_query)
    if tab in {"trial", "active", "expired", "cancelled"}:
        query["status"] = tab
    elif tab == "expiring_soon":
        soon = _now().date() + timedelta(days=15)
        query["status"] = {"$in": ["trial", "active"]}
        query["end_date"] = {"$lte": soon}
    if search:
        query["$or"] = [
            {"subscription_id": {"$regex": search, "$options": "i"}},
            {"user_id": {"$regex": search, "$options": "i"}},
            {"property_id": {"$regex": search, "$options": "i"}},
            {"plan_id": {"$regex": search, "$options": "i"}},
        ]
    subscriptions = await db.subscriptions.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    user_ids = list({sub.get("user_id") for sub in subscriptions if sub.get("user_id")})
    property_ids = list({sub.get("property_id") for sub in subscriptions if sub.get("property_id")})
    plan_ids = list({sub.get("plan_id") for sub in subscriptions if sub.get("plan_id")})
    users = await db.users.find({"user_id": {"$in": user_ids}}, {"_id": 0, "password_hash": 0}).to_list(length=len(user_ids) or 1)
    props = await db.properties.find({"property_id": {"$in": property_ids}}, {"_id": 0}).to_list(length=len(property_ids) or 1)
    plans = await db.subscription_plans.find({"plan_id": {"$in": plan_ids}}, {"_id": 0}).to_list(length=len(plan_ids) or 1)
    user_map = {user["user_id"]: user for user in users}
    prop_map = {prop["property_id"]: prop for prop in props}
    plan_map = {plan["plan_id"]: plan for plan in plans}
    for sub in subscriptions:
        sub["host"] = user_map.get(sub.get("user_id"), {})
        sub["property"] = prop_map.get(sub.get("property_id"), {})
        sub["plan"] = plan_map.get(sub.get("plan_id"), {})
        sub["days_remaining"] = _days_until(sub.get("end_date"))
        sub["trial_days_remaining"] = _days_until(sub.get("trial_end_date"))
        sub["payment_reference"] = sub.get("razorpay_subscription_id") or sub.get("razorpay_order_id") or sub.get("upi_transaction_id") or ""
    total = await db.subscriptions.count_documents(query)
    metrics = {
        "trial": await db.subscriptions.count_documents({**active_record_query, "status": "trial"}),
        "active": await db.subscriptions.count_documents({**active_record_query, "status": "active"}),
        "expired": await db.subscriptions.count_documents({**active_record_query, "status": "expired"}),
        "cancelled": await db.subscriptions.count_documents({**active_record_query, "status": "cancelled"}),
        "revenue": sum(float(item.get("amount") or 0) for item in await db.subscriptions.find({**active_record_query, "status": "active"}, {"_id": 0, "amount": 1}).to_list(length=1000)),
    }
    return api_response("Subscriptions loaded", {"subscriptions": subscriptions, "metrics": metrics}, {"total": total, "limit": limit, "skip": skip})


@router.get("/subscription-plans")
async def admin_subscription_plans(current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    plans = await db.subscription_plans.find({"is_deleted": {"$ne": True}}, {"_id": 0}).sort("created_at", -1).to_list(length=200)
    for plan in plans:
        plan["active_subscriptions"] = await db.subscriptions.count_documents({"plan_id": plan.get("plan_id"), "status": "active"})
        plan["trial_subscriptions"] = await db.subscriptions.count_documents({"plan_id": plan.get("plan_id"), "status": "trial"})
    return api_response("Subscription plans loaded", {"plans": plans})


@router.patch("/subscriptions/{subscription_id}/status")
async def update_subscription_status(subscription_id: str, payload: SubscriptionStatusPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    allowed = {"trial", "active", "expired", "cancelled"}
    if payload.status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid subscription status")
    sub = await db.subscriptions.find_one({"subscription_id": subscription_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    updates = {"status": payload.status, "admin_status_reason": payload.reason, "admin_status_updated_by": current_user["user_id"], "updated_at": _now()}
    if payload.status == "cancelled":
        updates["cancelled_at"] = _now()
    await db.subscriptions.update_one({"subscription_id": subscription_id}, {"$set": updates})
    if sub.get("property_id"):
        await db.properties.update_one({"property_id": sub["property_id"]}, {"$set": {"subscription_status": payload.status, "updated_at": _now()}})
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="subscription_management", action="subscription_status_changed", record_id=subscription_id, old_value={"status": sub.get("status")}, new_value=updates, reason=payload.reason)
    return api_response("Subscription status updated")


async def _delete_cancelled_subscription_record(subscription_id: str, payload: ReasonPayload, current_user: dict, db: AsyncIOMotorDatabase):
    sub = await db.subscriptions.find_one({"subscription_id": subscription_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    if sub.get("status") != "cancelled":
        raise HTTPException(status_code=400, detail="Only cancelled subscriptions can be deleted")
    updates = {
        "is_deleted": True,
        "deleted_at": _now(),
        "deleted_by": current_user["user_id"],
        "delete_reason": payload.reason,
        "updated_at": _now(),
    }
    await db.subscriptions.update_one({"subscription_id": subscription_id}, {"$set": updates})
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="subscription_management", action="cancelled_subscription_deleted", record_id=subscription_id, old_value=sub, new_value=updates, reason=payload.reason)
    return api_response("Cancelled subscription deleted")


@router.post("/subscriptions/{subscription_id}/delete")
async def delete_cancelled_subscription(subscription_id: str, payload: ReasonPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    return await _delete_cancelled_subscription_record(subscription_id, payload, current_user, db)


@router.delete("/subscriptions/{subscription_id}")
async def delete_cancelled_subscription_delete_method(subscription_id: str, payload: ReasonPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    return await _delete_cancelled_subscription_record(subscription_id, payload, current_user, db)


@router.patch("/subscription-plans/{plan_id}/status")
async def update_subscription_plan_status(plan_id: str, payload: SubscriptionPlanStatusPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    plan = await db.subscription_plans.find_one({"plan_id": plan_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Subscription plan not found")
    updates = {"is_active": payload.is_active, "updated_at": _now()}
    await db.subscription_plans.update_one({"plan_id": plan_id}, {"$set": updates})
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="subscription_management", action="subscription_plan_status_changed", record_id=plan_id, old_value={"is_active": plan.get("is_active")}, new_value=updates, reason=payload.reason)
    return api_response("Subscription plan status updated")


async def _enrich_bookings(db, bookings: list[dict]) -> list[dict]:
    property_ids = list({b.get("property_id") for b in bookings if b.get("property_id")})
    guest_ids = list({b.get("guest_id") for b in bookings if b.get("guest_id")})
    host_ids = list({b.get("host_id") for b in bookings if b.get("host_id")})
    properties = await db.properties.find({"property_id": {"$in": property_ids}}, {"_id": 0}).to_list(length=len(property_ids) or 1)
    prop_map = {p["property_id"]: p for p in properties}
    broker_ids = [p.get("broker_id") for p in properties if p.get("broker_id")]
    host_rows = await db.users.find({"user_id": {"$in": host_ids}}, {"_id": 0, "password_hash": 0}).to_list(length=len(host_ids) or 1)
    host_broker_ids = [host.get("broker_id") for host in host_rows if host.get("broker_id")]
    users = await db.users.find({"user_id": {"$in": list(set(guest_ids + host_ids + broker_ids + host_broker_ids))}}, {"_id": 0, "password_hash": 0}).to_list(length=len(set(guest_ids + host_ids + broker_ids + host_broker_ids)) or 1)
    user_map = {u["user_id"]: u for u in users}
    for booking in bookings:
        prop = prop_map.get(booking.get("property_id"), {})
        host = user_map.get(booking.get("host_id"), {})
        broker_id = host.get("broker_id") if host.get("user_id") else prop.get("broker_id")
        booking["property"] = prop
        booking["host"] = host
        booking["guest"] = user_map.get(booking.get("guest_id"), {})
        booking["broker_id"] = broker_id
        booking["broker"] = user_map.get(broker_id, {}) if broker_id else {}
        booking["risk_flags"] = []
        if booking.get("booking_status") == "soft_lock":
            booking["risk_flags"].append("payment_hold")
        if booking.get("payment_status") in {"failed", "pending"}:
            booking["risk_flags"].append("payment_attention")
        if prop.get("subscription_status") == "expired":
            booking["risk_flags"].append("property_subscription_expired")
    return bookings


@router.get("/bookings")
async def booking_operations(
    status_filter: Optional[str] = None,
    payment_status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    query = {}
    if status_filter:
        query["booking_status"] = status_filter
    if payment_status:
        query["payment_status"] = payment_status
    if search:
        query["$or"] = [
            {"booking_id": {"$regex": search, "$options": "i"}},
            {"property_id": {"$regex": search, "$options": "i"}},
            {"guest_id": {"$regex": search, "$options": "i"}},
            {"host_id": {"$regex": search, "$options": "i"}},
            {"razorpay_order_id": {"$regex": search, "$options": "i"}},
            {"razorpay_payment_id": {"$regex": search, "$options": "i"}},
        ]
    bookings = await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    bookings = await _enrich_bookings(db, bookings)
    total = await db.bookings.count_documents(query)
    metrics = {
        "soft_lock": await db.bookings.count_documents({"booking_status": "soft_lock"}),
        "confirmed": await db.bookings.count_documents({"booking_status": "confirmed"}),
        "completed": await db.bookings.count_documents({"booking_status": "completed"}),
        "cancelled": await db.bookings.count_documents({"booking_status": "cancelled"}),
        "pending_payment": await db.bookings.count_documents({"payment_status": "pending"}),
        "paid": await db.bookings.count_documents({"payment_status": {"$in": ["paid", "partially_paid"]}}),
        "gross_value": sum(float(item.get("total_amount") or 0) for item in await db.bookings.find({"booking_status": {"$in": ["confirmed", "completed"]}}, {"_id": 0, "total_amount": 1}).to_list(length=1000)),
    }
    return api_response("Bookings loaded", {"bookings": bookings, "metrics": metrics}, {"total": total, "limit": limit, "skip": skip})


@router.get("/bookings/{booking_id}")
async def booking_operation_detail(booking_id: str, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    enriched = (await _enrich_bookings(db, [booking]))[0]
    enriched["refund"] = await db.refunds.find_one({"booking_id": booking_id}, {"_id": 0}) or {}
    enriched["transactions"] = await db.transactions.find({"booking_id": booking_id}, {"_id": 0}).sort("created_at", -1).to_list(length=20)
    enriched["audit_history"] = await db.audit_logs.find({"record_id": booking_id}, {"_id": 0}).sort("created_at", -1).limit(20).to_list(length=20)
    return api_response("Booking detail loaded", {"booking": enriched})


@router.patch("/bookings/{booking_id}/status")
async def update_booking_operation_status(booking_id: str, payload: BookingStatusPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    allowed_booking = {"pending", "soft_lock", "confirmed", "completed", "cancelled"}
    allowed_payment = {"pending", "paid", "partially_paid", "failed", "refunded"}
    if payload.booking_status and payload.booking_status not in allowed_booking:
        raise HTTPException(status_code=400, detail="Invalid booking status")
    if payload.payment_status and payload.payment_status not in allowed_payment:
        raise HTTPException(status_code=400, detail="Invalid payment status")
    if not payload.booking_status and not payload.payment_status:
        raise HTTPException(status_code=400, detail="No status change provided")
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    updates = {"admin_status_reason": payload.reason, "admin_status_updated_by": current_user["user_id"], "updated_at": _now()}
    if payload.booking_status:
        updates["booking_status"] = payload.booking_status
        if payload.booking_status == "confirmed":
            updates["confirmed_at"] = booking.get("confirmed_at") or _now()
        if payload.booking_status == "cancelled":
            updates["cancelled_at"] = _now()
    if payload.payment_status:
        updates["payment_status"] = payload.payment_status
    await db.bookings.update_one({"booking_id": booking_id}, {"$set": updates})
    if payload.booking_status == "cancelled":
        await db.blocked_dates.delete_many({"source": "booking", "source_id": booking_id})
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="booking_operations", action="booking_status_changed", record_id=booking_id, old_value={"booking_status": booking.get("booking_status"), "payment_status": booking.get("payment_status")}, new_value=updates, reason=payload.reason)
    return api_response("Booking status updated")


@router.get("/finance/tax-commission")
async def finance_tax_commission(current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    payouts = await db.payouts.find({}, {"_id": 0}).sort("created_at", -1).limit(500).to_list(length=500)
    booking_txns = await db.transactions.find({"type": "booking_payment", "status": "success"}, {"_id": 0}).sort("created_at", -1).limit(500).to_list(length=500)
    subscription_txns = await db.transactions.find({"type": "subscription", "status": "success"}, {"_id": 0}).sort("created_at", -1).limit(500).to_list(length=500)
    commissions = await db.commissions.find({}, {"_id": 0}).sort("created_at", -1).limit(500).to_list(length=500)
    broker_ids = list({row.get("broker_id") for row in commissions if row.get("broker_id")})
    brokers = await db.users.find({"user_id": {"$in": broker_ids}}, {"_id": 0, "password_hash": 0}).to_list(length=len(broker_ids) or 1)
    broker_map = {broker["user_id"]: broker for broker in brokers}
    for row in commissions:
        row["broker"] = broker_map.get(row.get("broker_id"), {})

    booking_ids = [txn.get("booking_id") for txn in booking_txns if txn.get("booking_id")]
    booking_docs = await db.bookings.find(
        {"booking_id": {"$in": booking_ids}},
        {"_id": 0, "booking_id": 1, "base_amount": 1, "taxes": 1, "tax_percent": 1},
    ).to_list(length=len(booking_ids) or 1)
    booking_map = {booking.get("booking_id"): booking for booking in booking_docs}
    booking_taxable = 0.0
    booking_tax = 0.0
    legacy_booking_total = 0.0
    for txn in booking_txns:
        booking = booking_map.get(txn.get("booking_id"))
        if booking:
            booking_taxable += float(booking.get("base_amount") or 0)
            booking_tax += float(booking.get("taxes") or 0)
        else:
            legacy_booking_total += float(txn.get("amount") or 0)
    if legacy_booking_total:
        # Legacy booking transactions did not store the applied slab.
        # Do not infer a hardcoded booking GST rate for those records.
        booking_taxable += legacy_booking_total
    booking_tax_rate = round((booking_tax / booking_taxable) * 100, 2) if booking_taxable else 0
    subscription_tax = sum(float(txn.get("amount") or 0) * 18 / 118 for txn in subscription_txns)
    tds_hold = sum(float(payout.get("tds_amount") or 0) for payout in payouts)
    platform_commission = sum(float(payout.get("platform_fee") or 0) for payout in payouts)
    broker_commission_total = sum(float(row.get("commission_amount") or 0) for row in commissions)
    broker_commission_paid = sum(float(row.get("commission_amount") or 0) for row in commissions if row.get("payment_status") == "paid")
    tax_ledger = [
        {"tax_id": "TAX-GST-BOOKING", "tax_type": "GST on Booking Payments", "taxable_amount": booking_taxable, "tax_rate": booking_tax_rate, "tax_amount": booking_tax, "status": "payable"},
        {"tax_id": "TAX-GST-SUBSCRIPTION", "tax_type": "GST on Subscriptions", "taxable_amount": sum(float(txn.get("amount") or 0) for txn in subscription_txns) - subscription_tax, "tax_rate": 18, "tax_amount": subscription_tax, "status": "payable"},
        {"tax_id": "TAX-TDS-HOST", "tax_type": "Host TDS Hold", "taxable_amount": sum(float(payout.get("gross_amount") or 0) for payout in payouts), "tax_rate": 1, "tax_amount": tds_hold, "status": "withheld"},
    ]
    return api_response("Tax and commission loaded", {
        "summary": {
            "booking_gst": round(booking_tax),
            "subscription_gst": round(subscription_tax),
            "tds_hold": round(tds_hold),
            "platform_commission": round(platform_commission),
            "broker_commission_total": round(broker_commission_total),
            "broker_commission_paid": round(broker_commission_paid),
            "broker_commission_pending": round(broker_commission_total - broker_commission_paid),
        },
        "tax_ledger": tax_ledger,
        "commissions": commissions,
    })


@router.get("/crm/dashboard")
async def crm_dashboard(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    query = {}
    if status_filter:
        query["status"] = status_filter
    if search:
        query["$or"] = [
            {"lead_id": {"$regex": search, "$options": "i"}},
            {"full_name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}},
            {"property_title": {"$regex": search, "$options": "i"}},
        ]
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).limit(100).to_list(length=100)
    leads = await _enrich_lead_assignments(db, leads)
    metrics = {
        "total": await db.leads.count_documents({}),
        "new": await db.leads.count_documents({"status": "new"}),
        "contacted": await db.leads.count_documents({"status": "contacted"}),
        "converted": await db.leads.count_documents({"status": "converted"}),
        "lost": await db.leads.count_documents({"status": "lost"}),
        "unassigned": await db.leads.count_documents({"$or": [{"broker_id": {"$exists": False}}, {"broker_id": ""}]}),
    }
    city_rows = await db.leads.aggregate([{"$group": {"_id": "$city", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}, {"$limit": 8}]).to_list(length=8)
    type_rows = await db.leads.aggregate([{"$group": {"_id": "$property_type", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]).to_list(length=10)
    broker_rows = await db.leads.aggregate([{"$group": {"_id": "$broker_id", "count": {"$sum": 1}, "converted": {"$sum": {"$cond": [{"$eq": ["$status", "converted"]}, 1, 0]}}}}, {"$sort": {"count": -1}}, {"$limit": 8}]).to_list(length=8)
    return api_response("CRM dashboard loaded", {
        "metrics": metrics,
        "leads": leads,
        "charts": {
            "city_distribution": [{"label": row.get("_id") or "Unknown", "count": row.get("count", 0)} for row in city_rows],
            "property_type_distribution": [{"label": row.get("_id") or "Unknown", "count": row.get("count", 0)} for row in type_rows],
            "broker_performance": [{"broker_id": row.get("_id") or "Unassigned", "count": row.get("count", 0), "converted": row.get("converted", 0)} for row in broker_rows],
        },
    })


@router.get("/crm/leads")
async def crm_leads(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    property_type: Optional[str] = None,
    city: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    query = {}
    if status_filter:
        query["status"] = status_filter
    if property_type:
        query["property_type"] = property_type
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if search:
        query["$or"] = [
            {"lead_id": {"$regex": search, "$options": "i"}},
            {"full_name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}},
            {"property_title": {"$regex": search, "$options": "i"}},
        ]
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    leads = await _enrich_lead_assignments(db, leads)
    total = await db.leads.count_documents(query)
    return api_response("Leads loaded", {"leads": leads}, {"total": total, "limit": limit, "skip": skip})


@router.get("/crm/assignees")
async def crm_assignees(current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    brokers = await db.users.find({"role": "broker", "is_active": {"$ne": False}}, {"_id": 0, "password_hash": 0}).sort("full_name", 1).to_list(length=500)
    sales_query = {
        "role": "employee",
        "is_active": {"$ne": False},
        "$or": [
            {"department": {"$regex": "sales|crm|relationship", "$options": "i"}},
            {"designation": {"$regex": "sales|crm|relationship|manager|lead", "$options": "i"}},
            {"team": {"$regex": "sales|crm|relationship", "$options": "i"}},
        ],
    }
    employees = await db.users.find(sales_query, {"_id": 0, "password_hash": 0}).sort("full_name", 1).to_list(length=500)
    if not employees:
        employees = await db.users.find({"role": "employee", "is_active": {"$ne": False}}, {"_id": 0, "password_hash": 0}).sort("full_name", 1).to_list(length=500)
    relationship_managers = [user for user in employees if _is_rm_user(user)]
    if not relationship_managers:
        relationship_managers = [user for user in employees if not _is_branch_manager_user(user)]
    branch_manager_query = {
        "role": "employee",
        "is_active": {"$ne": False},
        "$or": [
            {"admin_role_key": {"$regex": "branch_manager", "$options": "i"}},
            {"designation": {"$regex": "branch manager", "$options": "i"}},
        ],
    }
    branch_managers = await db.users.find(branch_manager_query, {"_id": 0, "password_hash": 0}).sort("full_name", 1).to_list(length=500)
    team_leaders = [
        user for user in employees
        if re.search("lead|manager|head|tl", f"{user.get('designation', '')} {user.get('admin_role_key', '')}", re.IGNORECASE)
    ] or employees
    return api_response("CRM assignees loaded", {
        "brokers": [_public_user(user) for user in brokers],
        "relationship_managers": [_public_user(user) for user in relationship_managers],
        "branch_managers": [_public_user(user) for user in branch_managers],
        "team_leaders": [_public_user(user) for user in team_leaders],
    })


@router.patch("/crm/leads/{lead_id}")
async def update_crm_lead(lead_id: str, payload: LeadStatusUpdatePayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    updates = {"updated_at": _now()}
    if payload.status:
        if payload.status not in {"new", "contacted", "converted", "lost"}:
            raise HTTPException(status_code=400, detail="Invalid lead status")
        updates["status"] = payload.status
        if payload.status == "contacted":
            updates["contacted_at"] = _now()
        if payload.status == "converted":
            updates["converted_at"] = _now()
    if payload.notes is not None:
        updates["notes"] = payload.notes
    await db.leads.update_one({"lead_id": lead_id}, {"$set": updates})
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="sales_crm", action="lead_updated", record_id=lead_id, old_value={"status": lead.get("status"), "notes": lead.get("notes")}, new_value=updates, reason=payload.reason)
    return api_response("Lead updated")


@router.post("/crm/leads/{lead_id}/assign")
async def assign_crm_lead(lead_id: str, payload: LeadAssignmentPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    updates = {"updated_at": _now(), "assigned_at": _now(), "assigned_by": current_user["user_id"]}
    validations = [
        ("broker_id", payload.broker_id, {"role": "broker"}),
        ("rm_id", payload.rm_id, {"role": "employee"}),
        ("team_leader_id", payload.team_leader_id, {"role": "employee"}),
    ]
    for field, user_id, role_query in validations:
        if not user_id:
            updates[field] = ""
            continue
        user = await db.users.find_one({"user_id": user_id, **role_query, "is_active": {"$ne": False}}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=400, detail=f"Invalid or inactive {field}")
        updates[field] = user_id

    history_item = {
        "assignment_id": f"LEAD-ASG-{uuid4().hex[:10].upper()}",
        "broker_id": updates.get("broker_id", ""),
        "rm_id": updates.get("rm_id", ""),
        "team_leader_id": updates.get("team_leader_id", ""),
        "assigned_by": current_user["user_id"],
        "assigned_at": updates["assigned_at"],
        "reason": payload.reason,
    }
    await db.leads.update_one({"lead_id": lead_id}, {"$set": updates, "$push": {"assignment_history": {"$each": [history_item], "$slice": -50}}})
    await write_audit_log(
        db,
        user_id=current_user["user_id"],
        role=current_user["role"],
        module="sales_crm",
        action="lead_assigned",
        record_id=lead_id,
        old_value={"broker_id": lead.get("broker_id"), "rm_id": lead.get("rm_id"), "team_leader_id": lead.get("team_leader_id")},
        new_value=updates,
        reason=payload.reason,
    )
    return api_response("Lead assigned", {"assignment": history_item})


@router.get("/crm/pipeline")
async def crm_pipeline(current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    now = _now()
    stage_rows = await db.leads.aggregate([
        {"$group": {"_id": {"$ifNull": ["$pipeline_stage", "$status"]}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]).to_list(length=20)
    overdue_query = {
        "next_follow_up_at": {"$lt": now},
        "status": {"$nin": ["converted", "lost"]},
    }
    upcoming_query = {
        "next_follow_up_at": {"$gte": now, "$lte": now + timedelta(days=2)},
        "status": {"$nin": ["converted", "lost"]},
    }
    overdue = await db.leads.find(overdue_query, {"_id": 0}).sort("next_follow_up_at", 1).limit(25).to_list(length=25)
    upcoming = await db.leads.find(upcoming_query, {"_id": 0}).sort("next_follow_up_at", 1).limit(25).to_list(length=25)
    overdue = await _enrich_lead_assignments(db, overdue)
    upcoming = await _enrich_lead_assignments(db, upcoming)
    return api_response("CRM pipeline loaded", {
        "summary": {
            "stages": [{"stage": row.get("_id") or "new", "count": row.get("count", 0)} for row in stage_rows],
            "overdue_followups": await db.leads.count_documents(overdue_query),
            "upcoming_followups": await db.leads.count_documents(upcoming_query),
        },
        "overdue": overdue,
        "upcoming": upcoming,
    })


@router.patch("/crm/leads/{lead_id}/pipeline")
async def update_crm_pipeline(lead_id: str, payload: LeadPipelinePayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    allowed_stages = {"new", "qualified", "site_visit", "proposal", "negotiation", "won", "lost"}
    if payload.pipeline_stage not in allowed_stages:
        raise HTTPException(status_code=400, detail="Invalid pipeline stage")

    next_follow_up = _parse_optional_datetime(payload.next_follow_up_at)
    updates = {
        "pipeline_stage": payload.pipeline_stage,
        "updated_at": _now(),
    }
    if next_follow_up is not None:
        updates["next_follow_up_at"] = next_follow_up
    if payload.follow_up_status:
        updates["follow_up_status"] = payload.follow_up_status
        updates["last_follow_up_at"] = _now()
    if payload.notes is not None:
        updates["notes"] = payload.notes
    if payload.pipeline_stage == "won":
        updates["status"] = "converted"
        updates["converted_at"] = _now()
    elif payload.pipeline_stage == "lost":
        updates["status"] = "lost"
    elif lead.get("status") == "new":
        updates["status"] = "contacted"
        updates["contacted_at"] = _now()

    history_item = {
        "follow_up_id": f"LEAD-FUP-{uuid4().hex[:10].upper()}",
        "pipeline_stage": payload.pipeline_stage,
        "next_follow_up_at": next_follow_up,
        "follow_up_status": payload.follow_up_status or "",
        "notes": payload.notes or "",
        "updated_by": current_user["user_id"],
        "updated_at": updates["updated_at"],
        "reason": payload.reason,
    }
    await db.leads.update_one({"lead_id": lead_id}, {"$set": updates, "$push": {"follow_up_history": {"$each": [history_item], "$slice": -100}}})
    await write_audit_log(
        db,
        user_id=current_user["user_id"],
        role=current_user["role"],
        module="sales_crm",
        action="lead_pipeline_updated",
        record_id=lead_id,
        old_value={"pipeline_stage": lead.get("pipeline_stage"), "next_follow_up_at": lead.get("next_follow_up_at"), "status": lead.get("status")},
        new_value=updates,
        reason=payload.reason,
    )
    return api_response("Lead pipeline updated", {"follow_up": history_item})


@router.get("/crm/reports")
async def crm_reports(current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    total = await db.leads.count_documents({})
    lost = await db.leads.count_documents({"status": "lost"})
    converted = await db.leads.count_documents({"status": "converted"})
    contacted = await db.leads.count_documents({"status": "contacted"})
    unassigned = await db.leads.count_documents({"$or": [{"broker_id": {"$exists": False}}, {"broker_id": ""}]})
    lost_leads = await db.leads.find({"status": "lost"}, {"_id": 0}).sort("updated_at", -1).limit(50).to_list(length=50)
    lost_leads = await _enrich_lead_assignments(db, lost_leads)
    lost_reason_rows = await db.leads.aggregate([
        {"$match": {"status": "lost"}},
        {"$group": {"_id": {"$ifNull": ["$lost_reason", "$notes"]}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]).to_list(length=10)
    owner_rows = await db.leads.aggregate([
        {"$group": {"_id": "$broker_id", "total": {"$sum": 1}, "converted": {"$sum": {"$cond": [{"$eq": ["$status", "converted"]}, 1, 0]}}, "lost": {"$sum": {"$cond": [{"$eq": ["$status", "lost"]}, 1, 0]}}}},
        {"$sort": {"total": -1}},
        {"$limit": 10},
    ]).to_list(length=10)
    zoho_required = ["full_name", "phone", "email", "city", "property_type", "status", "broker_id"]
    sample_leads = await db.leads.find({}, {"_id": 0}).sort("created_at", -1).limit(200).to_list(length=200)
    missing_counts = {field: 0 for field in zoho_required}
    ready_count = 0
    for lead in sample_leads:
        missing = [field for field in zoho_required if not lead.get(field)]
        if not missing:
            ready_count += 1
        for field in missing:
            missing_counts[field] += 1
    readiness_total = len(sample_leads)
    return api_response("CRM reports loaded", {
        "summary": {
            "total": total,
            "contacted": contacted,
            "converted": converted,
            "lost": lost,
            "unassigned": unassigned,
            "conversion_rate": round((converted / total) * 100, 2) if total else 0,
            "lost_rate": round((lost / total) * 100, 2) if total else 0,
        },
        "lost_leads": lost_leads,
        "lost_reasons": [{"reason": row.get("_id") or "Not captured", "count": row.get("count", 0)} for row in lost_reason_rows],
        "owner_performance": [{"broker_id": row.get("_id") or "Unassigned", "total": row.get("total", 0), "converted": row.get("converted", 0), "lost": row.get("lost", 0)} for row in owner_rows],
        "zoho_readiness": {
            "sample_size": readiness_total,
            "ready_count": ready_count,
            "ready_percent": round((ready_count / readiness_total) * 100, 2) if readiness_total else 0,
            "required_fields": zoho_required,
            "missing_counts": missing_counts,
            "field_mapping": {
                "Lead Name": "full_name",
                "Phone": "phone",
                "Email": "email",
                "City": "city",
                "Property Type": "property_type",
                "Lead Status": "status",
                "Lead Owner": "broker_id",
                "Next Follow-up": "next_follow_up_at",
            },
        },
    })


@router.get("/communication/overview")
async def communication_overview(current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    notifications = await db.notifications.find({}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(length=50)
    contact_messages = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(length=50)
    support_tickets = await db.support_tickets.find({}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(length=50)
    channel_rows = await db.notifications.aggregate([
        {"$group": {"_id": "$channel", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]).to_list(length=20)
    status_rows = await db.notifications.aggregate([
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]).to_list(length=20)
    metrics = {
        "notifications_total": await db.notifications.count_documents({}),
        "notifications_failed": await db.notifications.count_documents({"status": "failed"}),
        "notifications_unread": await db.notifications.count_documents({"status": {"$in": ["pending", "sent"]}, "channel": "in_app"}),
        "contact_messages_pending": await db.contact_messages.count_documents({"status": {"$in": ["pending", "new", None]}}),
        "support_tickets_open": await db.support_tickets.count_documents({"status": {"$nin": ["resolved", "closed"]}}),
    }
    return api_response("Communication overview loaded", {
        "metrics": metrics,
        "recent_notifications": notifications,
        "recent_contact_messages": contact_messages,
        "recent_support_tickets": support_tickets,
        "charts": {
            "channel_distribution": [{"label": row.get("_id") or "unknown", "count": row.get("count", 0)} for row in channel_rows],
            "notification_status": [{"label": row.get("_id") or "unknown", "count": row.get("count", 0)} for row in status_rows],
        },
    })


@router.get("/communication/notifications")
async def communication_notifications(
    channel: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    query = {}
    if channel:
        query["channel"] = channel
    if status_filter:
        query["status"] = status_filter
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"message": {"$regex": search, "$options": "i"}},
            {"recipient": {"$regex": search, "$options": "i"}},
            {"user_id": {"$regex": search, "$options": "i"}},
            {"type": {"$regex": search, "$options": "i"}},
        ]
    items = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    total = await db.notifications.count_documents(query)
    return api_response("Notifications loaded", {"notifications": items}, {"total": total, "limit": limit, "skip": skip})


@router.post("/communication/notifications/test")
async def send_communication_test(payload: CommunicationTestPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    allowed_channels = {"sms", "whatsapp", "email", "in_app"}
    channels = [channel for channel in payload.channels if channel in allowed_channels]
    if not channels:
        raise HTTPException(status_code=400, detail="At least one valid channel is required")
    user = await db.users.find_one({"user_id": payload.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    from models.notification import NotificationChannel, NotificationType
    from services.notification_service import send_multi_channel_notification
    result = await send_multi_channel_notification(
        db=db,
        user_id=payload.user_id,
        notification_type=NotificationType.SUPPORT_TICKET_UPDATED,
        channels=[NotificationChannel(channel) for channel in channels],
        title=payload.title,
        message=payload.message,
        data={"admin_test": True, "sent_by": current_user["user_id"]},
    )
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="communication_center", action="test_notification_sent", record_id=payload.user_id, new_value={"channels": channels, "title": payload.title}, reason=payload.reason)
    return api_response("Test notification sent", {"result": result})


@router.get("/communication/delivery-audit")
async def communication_delivery_audit(current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    failed = await db.notifications.find({"status": "failed"}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(length=50)
    recent_audits = await db.audit_logs.find({"module": "communication_center"}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(length=50)
    active_escalation_items = await db.escalation_instances.find({"status": {"$nin": ["resolved", "closed"]}}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(length=50)
    failed_by_channel = await db.notifications.aggregate([
        {"$match": {"status": "failed"}},
        {"$group": {"_id": "$channel", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]).to_list(length=20)
    delivery_by_status = await db.notifications.aggregate([
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]).to_list(length=20)
    metrics = {
        "failed_notifications": await db.notifications.count_documents({"status": "failed"}),
        "sent_notifications": await db.notifications.count_documents({"status": "sent"}),
        "pending_notifications": await db.notifications.count_documents({"status": "pending"}),
        "communication_audits": await db.audit_logs.count_documents({"module": "communication_center"}),
        "active_escalations": await db.escalation_instances.count_documents({"status": {"$nin": ["resolved", "closed"]}}),
    }
    return api_response("Communication delivery audit loaded", {
        "metrics": metrics,
        "failed_notifications": failed,
        "recent_audits": recent_audits,
        "active_escalations": active_escalation_items,
        "charts": {
            "failed_by_channel": [{"label": row.get("_id") or "unknown", "count": row.get("count", 0)} for row in failed_by_channel],
            "delivery_by_status": [{"label": row.get("_id") or "unknown", "count": row.get("count", 0)} for row in delivery_by_status],
        },
    })


@router.get("/support/overview")
async def support_overview(current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    tickets = await db.support_tickets.find({}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(length=100)
    assignee_ids = list({ticket.get("assigned_admin_id") for ticket in tickets if ticket.get("assigned_admin_id")})
    assignees = await db.users.find({"user_id": {"$in": assignee_ids}}, {"_id": 0, "password_hash": 0}).to_list(length=len(assignee_ids) or 1)
    assignee_map = {user["user_id"]: user for user in assignees}
    status_rows = await db.support_tickets.aggregate([
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]).to_list(length=20)
    priority_rows = await db.support_tickets.aggregate([
        {"$group": {"_id": "$priority", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]).to_list(length=20)
    category_rows = await db.support_tickets.aggregate([
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 8},
    ]).to_list(length=8)
    open_query = {"status": {"$nin": ["resolved", "closed"]}}
    metrics = {
        "total": await db.support_tickets.count_documents({}),
        "open": await db.support_tickets.count_documents({"status": "open"}),
        "in_progress": await db.support_tickets.count_documents({"status": "in_progress"}),
        "resolved": await db.support_tickets.count_documents({"status": "resolved"}),
        "urgent": await db.support_tickets.count_documents({"priority": "urgent"}),
        "sla_risk": await db.support_tickets.count_documents({**open_query, "created_at": {"$lt": _now() - timedelta(hours=8)}}),
    }
    for ticket in tickets:
        ticket["age_hours"] = _hours_since(ticket.get("created_at"))
        ticket["assignee"] = assignee_map.get(ticket.get("assigned_admin_id"), {})
        if ticket.get("sla_due_at"):
            due = ticket["sla_due_at"]
            if isinstance(due, str):
                due = _parse_optional_datetime(due)
            ticket["sla_status"] = "breached" if due and due < _now() and ticket.get("status") not in {"resolved", "closed"} else "within_sla"
        else:
            ticket["sla_status"] = _escalation_status(ticket["age_hours"], 8)
    return api_response("Support overview loaded", {
        "metrics": metrics,
        "tickets": tickets,
        "charts": {
            "status_distribution": [{"label": row.get("_id") or "unknown", "count": row.get("count", 0)} for row in status_rows],
            "priority_distribution": [{"label": row.get("_id") or "unknown", "count": row.get("count", 0)} for row in priority_rows],
            "category_distribution": [{"label": row.get("_id") or "unknown", "count": row.get("count", 0)} for row in category_rows],
        },
    })


@router.get("/support/assignees")
async def support_assignees(current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    support_query = {
        "role": {"$in": ["admin", "employee"]},
        "is_active": {"$ne": False},
        "$or": [
            {"department": {"$regex": "support|operations|customer", "$options": "i"}},
            {"designation": {"$regex": "support|operations|customer|admin|manager", "$options": "i"}},
            {"role": "admin"},
        ],
    }
    users = await db.users.find(support_query, {"_id": 0, "password_hash": 0}).sort("full_name", 1).to_list(length=500)
    if not users:
        users = await db.users.find({"role": {"$in": ["admin", "employee"]}, "is_active": {"$ne": False}}, {"_id": 0, "password_hash": 0}).sort("full_name", 1).to_list(length=500)
    return api_response("Support assignees loaded", {"assignees": [_public_user(user) for user in users]})


@router.get("/support/reports")
async def support_reports(current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    tickets = await db.support_tickets.find({}, {"_id": 0}).sort("created_at", -1).limit(1000).to_list(length=1000)
    now = _now()
    resolved_tickets = [ticket for ticket in tickets if ticket.get("status") in {"resolved", "closed"}]
    open_tickets = [ticket for ticket in tickets if ticket.get("status") not in {"resolved", "closed"}]

    def resolved_hours(ticket: dict) -> float:
        created_at = ticket.get("created_at")
        resolved_at = ticket.get("resolved_at") or ticket.get("updated_at")
        if isinstance(created_at, str):
            created_at = _parse_optional_datetime(created_at)
        if isinstance(resolved_at, str):
            resolved_at = _parse_optional_datetime(resolved_at)
        if not created_at or not resolved_at:
            return 0
        return max(0, (resolved_at - created_at).total_seconds() / 3600)

    def is_breached(ticket: dict) -> bool:
        if ticket.get("status") in {"resolved", "closed"}:
            return False
        due_at = ticket.get("sla_due_at")
        if isinstance(due_at, str):
            due_at = _parse_optional_datetime(due_at)
        if due_at:
            return due_at < now
        return _hours_since(ticket.get("created_at")) >= 8

    avg_resolution_hours = round(sum(resolved_hours(ticket) for ticket in resolved_tickets) / len(resolved_tickets), 1) if resolved_tickets else 0
    unassigned_count = len([ticket for ticket in open_tickets if not ticket.get("assigned_admin_id")])
    sla_breached_count = len([ticket for ticket in open_tickets if is_breached(ticket)])
    escalation_logs = await db.audit_logs.find(
        {"module": {"$in": ["support_ticket_management", "marketing_cms"]}},
        {"_id": 0},
    ).sort("created_at", -1).limit(30).to_list(length=30)
    assignee_rows = await db.support_tickets.aggregate([
        {"$match": {"assigned_admin_id": {"$exists": True, "$ne": None}}},
        {"$group": {
            "_id": "$assigned_admin_id",
            "total": {"$sum": 1},
            "resolved": {"$sum": {"$cond": [{"$in": ["$status", ["resolved", "closed"]]}, 1, 0]}},
            "open": {"$sum": {"$cond": [{"$in": ["$status", ["resolved", "closed"]]}, 0, 1]}},
        }},
        {"$sort": {"total": -1}},
        {"$limit": 10},
    ]).to_list(length=10)

    return api_response("Support reports loaded", {
        "metrics": {
            "tickets_sampled": len(tickets),
            "open_backlog": len(open_tickets),
            "resolved_total": len(resolved_tickets),
            "avg_resolution_hours": avg_resolution_hours,
            "unassigned_open": unassigned_count,
            "sla_breached_open": sla_breached_count,
            "resolution_rate": round((len(resolved_tickets) / len(tickets)) * 100, 1) if tickets else 0,
        },
        "assignee_performance": [{"assignee_id": row.get("_id") or "unassigned", "total": row.get("total", 0), "resolved": row.get("resolved", 0), "open": row.get("open", 0)} for row in assignee_rows],
        "sla_watchlist": [ticket for ticket in open_tickets if is_breached(ticket)][:30],
        "recent_audits": escalation_logs,
    })


@router.get("/settings/booking-tax-slabs")
async def booking_tax_slabs(current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    await _ensure_booking_tax_slabs_table(db)
    slabs = await db.booking_tax_slabs.find({}, {"_id": 0}).sort("from_amount", 1).to_list(500)
    return api_response("Booking tax slabs loaded", {"slabs": slabs})


@router.post("/settings/booking-tax-slabs", status_code=status.HTTP_201_CREATED)
async def create_booking_tax_slab(
    payload: BookingTaxSlabPayload,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    from_amount, to_amount, gst_percent = await _validate_booking_tax_slab(db, payload)
    now = _now()
    slab = {
        "slab_id": f"bts_{uuid4().hex[:14]}",
        "from_amount": from_amount,
        "to_amount": to_amount,
        "gst_percent": gst_percent,
        "is_active": bool(payload.is_active),
        "created_at": now,
        "updated_at": now,
        "created_by": current_user.get("user_id"),
        "updated_by": current_user.get("user_id"),
    }
    await db.booking_tax_slabs.insert_one(slab)
    await write_audit_log(
        db,
        user_id=current_user.get("user_id"),
        role=current_user.get("role", "admin"),
        action="create_booking_tax_slab",
        module="platform_settings",
        record_id=slab["slab_id"],
        new_value=slab,
        reason=payload.reason or "Booking tax slab created",
    )
    return api_response("Booking tax slab created", {"slab": {k: v for k, v in slab.items() if k != "_id"}})


@router.put("/settings/booking-tax-slabs/{slab_id}")
async def update_booking_tax_slab(
    slab_id: str,
    payload: BookingTaxSlabPayload,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    existing = await db.booking_tax_slabs.find_one({"slab_id": slab_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Booking tax slab not found")
    from_amount, to_amount, gst_percent = await _validate_booking_tax_slab(db, payload, ignore_slab_id=slab_id)
    update_doc = {
        "from_amount": from_amount,
        "to_amount": to_amount,
        "gst_percent": gst_percent,
        "is_active": bool(payload.is_active),
        "updated_at": _now(),
        "updated_by": current_user.get("user_id"),
    }
    await db.booking_tax_slabs.update_one({"slab_id": slab_id}, {"$set": update_doc})
    updated = await db.booking_tax_slabs.find_one({"slab_id": slab_id}, {"_id": 0})
    await write_audit_log(
        db,
        user_id=current_user.get("user_id"),
        role=current_user.get("role", "admin"),
        action="update_booking_tax_slab",
        module="platform_settings",
        record_id=slab_id,
        old_value=existing,
        new_value=updated,
        reason=payload.reason or "Booking tax slab updated",
    )
    return api_response("Booking tax slab updated", {"slab": updated})


@router.patch("/settings/booking-tax-slabs/{slab_id}/status")
async def update_booking_tax_slab_status(
    slab_id: str,
    payload: BookingTaxSlabStatusPayload,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    existing = await db.booking_tax_slabs.find_one({"slab_id": slab_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Booking tax slab not found")
    await db.booking_tax_slabs.update_one(
        {"slab_id": slab_id},
        {"$set": {"is_active": bool(payload.is_active), "updated_at": _now(), "updated_by": current_user.get("user_id")}},
    )
    await write_audit_log(
        db,
        user_id=current_user.get("user_id"),
        role=current_user.get("role", "admin"),
        action="toggle_booking_tax_slab",
        module="platform_settings",
        record_id=slab_id,
        old_value={"is_active": existing.get("is_active")},
        new_value={"is_active": bool(payload.is_active)},
        reason=payload.reason or "Booking tax slab status updated",
    )
    updated = await db.booking_tax_slabs.find_one({"slab_id": slab_id}, {"_id": 0})
    return api_response("Booking tax slab status updated", {"slab": updated})


@router.delete("/settings/booking-tax-slabs/{slab_id}")
async def delete_booking_tax_slab(
    slab_id: str,
    payload: dict = None,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    existing = await db.booking_tax_slabs.find_one({"slab_id": slab_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Booking tax slab not found")
    await db.booking_tax_slabs.delete_one({"slab_id": slab_id})
    await write_audit_log(
        db,
        user_id=current_user.get("user_id"),
        role=current_user.get("role", "admin"),
        action="delete_booking_tax_slab",
        module="platform_settings",
        record_id=slab_id,
        old_value=existing,
        reason=(payload or {}).get("reason") or "Booking tax slab deleted",
    )
    return api_response("Booking tax slab deleted", {"slab_id": slab_id})


@router.get("/settings/tds")
@router.get("/platform-settings/tds")
async def get_tds_settings(current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    config = await get_active_tds_config(db)
    return api_response("TDS configuration loaded", {"config": config})


@router.put("/settings/tds")
@router.put("/platform-settings/tds")
async def update_tds_settings(payload: dict, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    existing = await get_active_tds_config(db)
    config = await save_tds_config(db, payload, current_user)
    await write_audit_log(
        db,
        user_id=current_user.get("user_id"),
        role=current_user.get("role", "admin"),
        action="update_tds_configuration",
        module="platform_settings",
        record_id=config.get("config_id"),
        old_value=existing,
        new_value=config,
        reason=payload.get("reason") or "TDS configuration updated",
    )
    return api_response("TDS configuration saved", {"config": config})


@router.get("/settings/host-tax-profiles/{host_id}")
@router.get("/platform-settings/host-tax-profiles/{host_id}")
async def get_admin_host_tax_profile(host_id: str, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    profile = await get_host_tax_profile(db, host_id)
    return api_response("Host tax profile loaded", {"profile": profile})


@router.post("/settings/tds/preview")
@router.post("/platform-settings/tds/preview")
async def preview_tds(payload: dict, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    host_id = payload.get("host_id")
    gross_booking_value = payload.get("gross_booking_value")
    if not host_id or gross_booking_value is None:
        raise HTTPException(status_code=400, detail="host_id and gross_booking_value are required")
    breakdown = await calculate_host_payout_tds(
        db,
        host_id=host_id,
        booking_id=payload.get("booking_id"),
        gross_booking_value=gross_booking_value,
        transaction_date=payload.get("transaction_date"),
        payout_id=payload.get("payout_id"),
    )
    return api_response("TDS preview calculated", {"breakdown": breakdown})


@router.post("/settings/host-payout-preview")
@router.post("/platform-settings/host-payout-preview")
async def preview_host_payout(payload: dict, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    booking = payload.get("booking") or dict(payload)
    if not booking.get("host_id") and payload.get("host_id"):
        booking["host_id"] = payload["host_id"]
    if not booking.get("booking_id") and payload.get("booking_id"):
        booking["booking_id"] = payload["booking_id"]
    if not any(booking.get(key) is not None for key in ("base_amount", "host_amount", "total_amount")):
        if payload.get("gross_booking_value") is None:
            raise HTTPException(status_code=400, detail="booking amount is required")
        booking["base_amount"] = payload.get("gross_booking_value")
    breakdown = await calculate_host_payout_breakdown(db, booking)
    return api_response("Host payout preview calculated", {"breakdown": breakdown})


@router.get("/settings/overview")
async def platform_settings_overview(current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    payment_config = await get_booking_payment_config(db)
    tds_config = await get_active_tds_config(db)
    security_doc = await db.platform_settings.find_one({"key": "security_settings"}, {"_id": 0}) or {}
    maintenance_doc = await db.platform_settings.find_one({"key": "maintenance_settings"}, {"_id": 0}) or {}
    security_settings = {**_default_security_settings(), **(security_doc.get("value") or {})}
    maintenance_settings = {**_default_maintenance_settings(), **(maintenance_doc.get("value") or {})}
    active_users = await db.users.count_documents({"is_active": {"$ne": False}})
    admin_users = await db.users.count_documents({"role": "admin", "is_active": {"$ne": False}})
    active_roles = await db.admin_roles.count_documents({"is_active": {"$ne": False}})
    active_escalations = await db.escalation_rules.count_documents({"status": "active"})
    active_notifications = await db.notification_rules.count_documents({"status": "active"})
    active_cms = await db.cms_content.count_documents({"is_active": True})
    pending_operations = {
        "host_kyc": await db.users.count_documents({"role": "host", "kyc_status": {"$in": ["pending", "submitted", "under_review"]}}),
        "property_review": await db.properties.count_documents({"status": {"$in": ["pending", "pending_review", "under_review"]}}),
        "support_tickets": await db.support_tickets.count_documents({"status": {"$nin": ["resolved", "closed"]}}),
        "pending_payouts": await db.host_payouts.count_documents({"status": {"$in": ["pending", "eligible", "processing"]}}),
    }
    recent_audits = await db.audit_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(12).to_list(length=12)
    modules = [
        {"key": "security", "label": "Security & Access", "status": "ready" if active_roles else "needs_review", "value": f"{admin_users} active admins"},
        {"key": "payments", "label": "Payment Gateway", "status": "sandbox" if payment_config.get("is_mock", True) else "live", "value": payment_config.get("gateway") or "Razorpay"},
        {"key": "tax_commission", "label": "Tax & Commission", "status": "configured", "value": f"{payment_config.get('charges', {}).get('platform_fee', {}).get('value', payment_config.get('platform_fee_percent', 10))}% platform fee"},
        {"key": "notifications", "label": "Automation Rules", "status": "ready" if active_notifications else "needs_review", "value": f"{active_notifications} active rules"},
        {"key": "content", "label": "CMS Publishing", "status": "ready" if active_cms else "needs_review", "value": f"{active_cms} active sections"},
        {"key": "operations", "label": "Operational Queue", "status": "attention" if sum(pending_operations.values()) else "clear", "value": f"{sum(pending_operations.values())} pending items"},
        {"key": "maintenance", "label": "Backup & Maintenance", "status": "maintenance" if maintenance_settings.get("maintenance_mode") else "ready", "value": f"{maintenance_settings.get('backup_frequency', 'daily')} backups"},
    ]
    return api_response("Platform settings overview loaded", {
        "business_profile": {
            "brand_name": "X-Space360",
            "admin_scope": "central_admin",
            "timezone": "Asia/Kolkata",
            "currency": payment_config.get("currency", "INR"),
        },
        "metrics": {
            "active_users": active_users,
            "active_admins": admin_users,
            "active_roles": active_roles,
            "active_escalations": active_escalations,
            "active_notifications": active_notifications,
            "active_cms_sections": active_cms,
        },
        "security_settings": security_settings,
        "maintenance_settings": maintenance_settings,
        "payment_config": payment_config,
        "tds_config": tds_config,
        "pending_operations": pending_operations,
        "modules": modules,
        "recent_audits": recent_audits,
    })


@router.get("/settings/security")
async def get_security_settings(current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    doc = await db.platform_settings.find_one({"key": "security_settings"}, {"_id": 0}) or {}
    return api_response("Security settings loaded", {"settings": {**_default_security_settings(), **(doc.get("value") or {})}})


@router.put("/settings/security")
async def update_security_settings(payload: SecuritySettingsPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    if payload.min_password_length < 8 or payload.password_max_length > 128 or payload.min_password_length > payload.password_max_length:
        raise HTTPException(status_code=400, detail="Invalid password length policy")
    if payload.session_timeout_minutes < 15 or payload.admin_session_timeout_minutes < 15:
        raise HTTPException(status_code=400, detail="Session timeout must be at least 15 minutes")
    if payload.max_failed_login_attempts < 3 or payload.lockout_minutes < 5:
        raise HTTPException(status_code=400, detail="Login lockout policy is too weak")
    existing = await db.platform_settings.find_one({"key": "security_settings"}, {"_id": 0}) or {}
    settings = payload.model_dump(exclude={"reason"})
    doc = {
        "key": "security_settings",
        "value": settings,
        "updated_by": current_user["user_id"],
        "updated_at": _now(),
    }
    await db.platform_settings.update_one({"key": "security_settings"}, {"$set": doc, "$setOnInsert": {"created_at": _now()}}, upsert=True)
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="platform_settings", action="security_settings_updated", record_id="security_settings", old_value=existing.get("value"), new_value=settings, reason=payload.reason or "Security settings updated")
    return api_response("Security settings updated", {"settings": settings})


@router.get("/settings/operations")
async def get_operational_settings(current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    doc = await db.platform_settings.find_one({"key": "maintenance_settings"}, {"_id": 0}) or {}
    settings = {**_default_maintenance_settings(), **(doc.get("value") or {})}
    operational_logs = await db.audit_logs.find(
        {"module": {"$in": ["platform_settings", "system_administration", "audit_activity_logs", "communication_center", "support_ticket_management"]}},
        {"_id": 0},
    ).sort("created_at", -1).limit(50).to_list(length=50)
    collections = ["users", "properties", "bookings", "support_tickets", "cms_content", "audit_logs", "notifications", "transactions"]
    collection_counts = []
    for name in collections:
        try:
            count = await getattr(db, name).count_documents({})
        except Exception:
            count = 0
        collection_counts.append({"collection": name, "count": count})
    checklist = settings.get("checklist") or []
    completed = len([item for item in checklist if item.get("status") == "completed"])
    return api_response("Operational settings loaded", {
        "settings": settings,
        "readiness": {
            "checklist_total": len(checklist),
            "checklist_completed": completed,
            "readiness_percent": round((completed / len(checklist)) * 100, 1) if checklist else 0,
            "maintenance_mode": settings.get("maintenance_mode", False),
        },
        "collection_counts": collection_counts,
        "operational_logs": operational_logs,
    })


@router.put("/settings/operations")
async def update_operational_settings(payload: MaintenanceSettingsPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    if payload.retention_days < 1:
        raise HTTPException(status_code=400, detail="Retention days must be at least 1")
    if payload.backup_frequency not in {"hourly", "daily", "weekly", "monthly"}:
        raise HTTPException(status_code=400, detail="Invalid backup frequency")
    existing = await db.platform_settings.find_one({"key": "maintenance_settings"}, {"_id": 0}) or {}
    settings = payload.model_dump(exclude={"reason"})
    doc = {"key": "maintenance_settings", "value": settings, "updated_by": current_user["user_id"], "updated_at": _now()}
    await db.platform_settings.update_one({"key": "maintenance_settings"}, {"$set": doc, "$setOnInsert": {"created_at": _now()}}, upsert=True)
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="platform_settings", action="maintenance_settings_updated", record_id="maintenance_settings", old_value=existing.get("value"), new_value=settings, reason=payload.reason or "Maintenance and backup settings updated")
    return api_response("Operational settings updated", {"settings": settings})


@router.post("/support/tickets/{ticket_id}/assign")
async def assign_support_ticket(ticket_id: str, payload: SupportTicketAssignmentPayload, current_user: dict = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)):
    ticket = await db.support_tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Support ticket not found")
    assignee = await db.users.find_one({"user_id": payload.assigned_admin_id, "role": {"$in": ["admin", "employee"]}, "is_active": {"$ne": False}}, {"_id": 0})
    if not assignee:
        raise HTTPException(status_code=400, detail="Invalid or inactive support assignee")
    updates = {
        "assigned_admin_id": payload.assigned_admin_id,
        "assigned_by": current_user["user_id"],
        "assigned_at": _now(),
        "updated_at": _now(),
    }
    if payload.priority:
        if payload.priority not in {"low", "normal", "high", "urgent"}:
            raise HTTPException(status_code=400, detail="Invalid priority")
        updates["priority"] = payload.priority
    if payload.sla_due_at:
        updates["sla_due_at"] = _parse_optional_datetime(payload.sla_due_at)
    history_item = {
        "assignment_id": f"TKT-ASG-{uuid4().hex[:10].upper()}",
        "assigned_admin_id": payload.assigned_admin_id,
        "assigned_by": current_user["user_id"],
        "assigned_at": updates["assigned_at"],
        "priority": updates.get("priority", ticket.get("priority")),
        "sla_due_at": updates.get("sla_due_at"),
        "reason": payload.reason,
    }
    await db.support_tickets.update_one({"ticket_id": ticket_id}, {"$set": updates, "$push": {"assignment_history": {"$each": [history_item], "$slice": -50}}})
    await write_audit_log(db, user_id=current_user["user_id"], role=current_user["role"], module="support_ticket_management", action="ticket_assigned", record_id=ticket_id, old_value={"assigned_admin_id": ticket.get("assigned_admin_id"), "priority": ticket.get("priority"), "sla_due_at": ticket.get("sla_due_at")}, new_value=updates, reason=payload.reason)
    return api_response("Support ticket assigned", {"assignment": history_item})
