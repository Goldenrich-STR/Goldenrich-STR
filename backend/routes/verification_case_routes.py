from datetime import datetime, timezone, timedelta
from typing import Optional
import os
from pathlib import Path
import re
import shutil
import subprocess
import threading
import time

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from middleware.auth_middleware import get_current_user
from services.audit_service import write_audit_log
from services.verification_case_workflow import (
    ADMIN_APPROVED,
    ADMIN_CORRECTION_REQUIRED,
    ADMIN_ON_HOLD,
    ADMIN_REJECTED,
    ADMIN_REVIEW_PENDING,
    BM_APPROVED,
    BM_CHECKLIST_KEYS,
    BM_REJECTED,
    BM_REVIEW_IN_PROGRESS,
    BM_REVIEW_PENDING,
    BM_REWORK_REQUIRED,
    COMPLETED,
    LIVE,
    PUBLISHING,
    TELECALLER_CALL_PENDING,
    TELECALLER_CHECKLIST_KEYS,
    TELECALLER_REWORK_REQUIRED,
    TELECALLER_VERIFICATION_FAILED,
    TELECALLER_VERIFICATION_IN_PROGRESS,
    TELECALLER_VERIFIED,
    VERIFICATION_SCHEDULED,
    all_required_done,
    now_utc,
    resolve_host_document_telecaller,
    resolve_verification_telecaller,
    upsert_verification_case,
    workflow_id,
)

router = APIRouter(prefix="/verification-cases", tags=["Verification Cases"])


class SchedulePayload(BaseModel):
    verification_id: str
    scheduled_date: str
    scheduled_start_time: str
    scheduled_end_time: Optional[str] = ""
    telecaller_id: Optional[str] = ""
    notes: Optional[str] = ""


class ChecklistPayload(BaseModel):
    checklist: dict
    remarks: Optional[str] = ""
    video_url: Optional[str] = ""


class DecisionPayload(BaseModel):
    result: str
    remarks: str
    issue_category: Optional[str] = ""
    required_action: Optional[str] = ""
    video_url: Optional[str] = ""


TELECALLER_VISIBLE_CHECKLIST = [
    ("host_identity_confirmed", "Host identity confirmed"),
    ("host_mobile_confirmed", "Host mobile confirmed"),
    ("host_name_matches_kyc", "Host name matches KYC"),
    ("property_visible_on_video", "Property shown live"),
    ("property_entrance_verified", "Entrance verified"),
    ("property_name_verified", "Property name verified"),
    ("address_location_verified", "Address/location confirmed"),
    ("bedrooms_verified", "Rooms verified"),
    ("amenities_verified", "Amenities verified"),
    ("document_name_checked", "Document names checked"),
    ("bank_document_checked", "Bank document checked"),
    ("video_completed", "Video verification completed"),
]


class DocumentDecisionPayload(BaseModel):
    result: str
    remarks: str = ""
    reference_url: Optional[str] = ""


class HostDocumentFinalPayload(BaseModel):
    result: str
    remarks: str = ""


class CallPayload(BaseModel):
    outcome: str
    remarks: Optional[str] = ""
    scheduled_date: Optional[str] = ""
    scheduled_time: Optional[str] = ""
    next_follow_up: Optional[str] = ""
    caller_number: Optional[str] = ""
    caller_user_id: Optional[str] = ""
    call_type: Optional[str] = ""
    call_checklist: Optional[dict] = None
    call_duration_seconds: Optional[int] = 0
    recording_status: Optional[str] = ""


class AdbDialPayload(BaseModel):
    phone: str
    action: Optional[str] = "CALL"
    auto_record: bool = False
    record_delay_seconds: Optional[int] = 6


class TaskPayload(BaseModel):
    status: str = "completed"
    remarks: Optional[str] = ""


SLA_HOURS = 24


def _parse_case_dt(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except Exception:
        return None


def _case_deadline(case: dict):
    start = _parse_case_dt(case.get("created_at")) or _parse_case_dt(case.get("submitted_at")) or now_utc()
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    return start + timedelta(hours=SLA_HOURS)


def _find_adb_executable() -> str:
    adb_path = shutil.which("adb") or shutil.which("adb.exe")
    if adb_path:
        return adb_path
    candidates = [
        Path(os.environ.get("USERPROFILE", "")) / "Downloads" / "platform-tools-latest-windows" / "platform-tools" / "adb.exe",
        Path(os.environ.get("USERPROFILE", "")) / "Downloads" / "platform-tools" / "adb.exe",
        Path("C:/Android/platform-tools/adb.exe"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    return ""


def _clean_phone(value: str) -> str:
    phone = re.sub(r"[^\d+]", "", value or "")
    if phone.startswith("+"):
        return "+" + re.sub(r"\D", "", phone[1:])
    return re.sub(r"\D", "", phone)


def _adb_screen_size(adb_path: str) -> tuple[int, int]:
    result = subprocess.run([adb_path, "shell", "wm", "size"], capture_output=True, text=True, timeout=5, check=False)
    match = re.search(r"(\d+)x(\d+)", f"{result.stdout} {result.stderr}")
    if not match:
        return 720, 1600
    return int(match.group(1)), int(match.group(2))


def _adb_tap(adb_path: str, width: int, height: int, x_ratio: float, y_ratio: float):
    x = max(1, int(width * x_ratio))
    y = max(1, int(height * y_ratio))
    subprocess.run([adb_path, "shell", "input", "tap", str(x), str(y)], capture_output=True, text=True, timeout=5, check=False)


def _start_recording_after_delay(adb_path: str, delay_seconds: int):
    def worker():
        try:
            time.sleep(max(2, min(delay_seconds or 6, 20)))
            width, height = _adb_screen_size(adb_path)
            # OPPO/Android in-call UI: tap More, then tap Record from the opened menu.
            _adb_tap(adb_path, width, height, 0.83, 0.76)
            time.sleep(0.8)
            _adb_tap(adb_path, width, height, 0.35, 0.57)
        except Exception:
            pass

    threading.Thread(target=worker, daemon=True).start()


def _sla_snapshot(case: dict) -> dict:
    terminal = {BM_REVIEW_PENDING, BM_APPROVED, ADMIN_REVIEW_PENDING, LIVE, COMPLETED, TELECALLER_VERIFICATION_FAILED}
    deadline = _case_deadline(case)
    remaining = deadline - now_utc()
    hours = round(remaining.total_seconds() / 3600, 1)
    if case.get("current_stage") in terminal:
        state = "completed"
    elif remaining.total_seconds() < 0:
        state = "overdue"
    elif remaining.total_seconds() <= 4 * 3600:
        state = "due_soon"
    else:
        state = "on_track"
    return {
        "state": state,
        "deadline": deadline.isoformat(),
        "hours_remaining": hours,
        "target_hours": SLA_HOURS,
    }


def _activity_from_case(case: dict) -> list[dict]:
    events = []
    for item in case.get("history") or []:
        events.append({
            "activity_type": item.get("action") or "STATUS_UPDATED",
            "verification_id": case.get("verification_id"),
            "property_id": case.get("property_id"),
            "property": (case.get("property") or {}).get("title") or case.get("property_id"),
            "host": (case.get("host") or {}).get("full_name") or case.get("host_id"),
            "user": item.get("actor") or "",
            "timestamp": item.get("timestamp") or "",
            "details": item.get("details") or {},
        })
    return events


def _task_for_case(case: dict) -> list[dict]:
    stage = case.get("current_stage")
    prop = case.get("property") or {}
    host = case.get("host") or {}
    title = prop.get("title") or case.get("property_id") or "Property"
    due = case.get("scheduled_start_time") or "Today"
    tasks = []
    if stage == TELECALLER_CALL_PENDING:
        tasks.append({"task_id": f"{case.get('verification_id')}-call", "task": "Call host", "case_id": case.get("verification_id"), "property": title, "host": host.get("full_name") or "-", "due_time": due, "priority": "High", "status": "open", "action": "call"})
    if stage == VERIFICATION_SCHEDULED:
        tasks.append({"task_id": f"{case.get('verification_id')}-video", "task": "Video verification", "case_id": case.get("verification_id"), "property": title, "host": host.get("full_name") or "-", "due_time": due, "priority": "High", "status": "scheduled", "action": "video"})
    if stage == TELECALLER_REWORK_REQUIRED:
        tasks.append({"task_id": f"{case.get('verification_id')}-rework", "task": "Follow up rework", "case_id": case.get("verification_id"), "property": title, "host": host.get("full_name") or "-", "due_time": "Today", "priority": "Medium", "status": "open", "action": "rework"})
    return tasks


async def get_db():
    from server import db_instance
    return db_instance


def _is_admin(user: dict) -> bool:
    return user.get("role") == "admin"


def _is_telecaller(user: dict) -> bool:
    return user.get("role") == "telecaller" or user.get("admin_role_key") == "telecaller"


def _is_branch_manager(user: dict) -> bool:
    return user.get("role") == "branch_manager" or user.get("admin_role_key") == "branch_manager"


def _telecaller_identity_terms(user: dict) -> list[str]:
    terms = [
        user.get("user_id"),
        user.get("uid"),
        user.get("employee_code"),
        user.get("lg_code"),
    ]
    seen = set()
    clean = []
    for term in terms:
        value = str(term or "").strip()
        if value and value not in seen:
            seen.add(value)
            clean.append(value)
    return clean


def _telecaller_owned_query(user: dict) -> dict:
    terms = _telecaller_identity_terms(user)
    return {
        "$or": [
            {"telecaller_id": {"$in": terms}},
            {"lg_owner_id": {"$in": terms}},
            {"created_by_user_id": {"$in": terms}},
            {"lg_code": {"$in": terms}},
            {"employee_code": {"$in": terms}},
            {"registration_source": "TELECALLER", "telecaller_id": {"$in": terms}},
        ]
    }


def _host_document_assignment_query(terms: list[str]) -> dict:
    return {
        "$or": [
            {"verification_telecaller_id": {"$in": terms}},
            {"document_telecaller_id": {"$in": terms}},
        ]
    }


def _source_code_from_user(user: dict) -> str:
    return user.get("lg_code") or user.get("employee_code") or user.get("uid") or user.get("user_id") or ""


async def _registration_source_owner(db, host: dict | None = None, prop: dict | None = None, case: dict | None = None) -> dict:
    host = host or {}
    prop = prop or {}
    case = case or {}
    source = (
        case.get("registration_source")
        or prop.get("registration_source")
        or host.get("registration_source")
        or host.get("created_by_role")
        or "SELF_HOST"
    )
    source = str(source or "SELF_HOST").upper()
    owner_id = (
        case.get("lg_owner_id")
        or prop.get("lg_owner_id")
        or host.get("lg_owner_id")
        or host.get("created_by_user_id")
        or prop.get("created_by_user_id")
        or ""
    )
    code = (
        case.get("lg_code")
        or prop.get("lg_code")
        or host.get("lg_code")
        or host.get("broker_lg_code")
        or host.get("rm_code")
        or host.get("employee_code")
        or ""
    )
    owner = None
    lookup_terms = [str(value).strip() for value in [owner_id, code] if str(value or "").strip()]
    if lookup_terms:
        owner = await db.users.find_one(
            {
                "$or": [
                    {"user_id": {"$in": lookup_terms}},
                    {"uid": {"$in": lookup_terms}},
                    {"employee_code": {"$in": lookup_terms}},
                    {"lg_code": {"$in": lookup_terms}},
                ]
            },
            {"_id": 0, "password_hash": 0},
        )
    if not owner and source in {"SELF_HOST", "HOST"}:
        owner = host
    owner = owner or {}
    display_name = owner.get("full_name") or owner.get("name") or owner.get("display_name") or ""
    display_code = _source_code_from_user(owner) or code or owner_id
    if not display_name and source in {"SELF_HOST", "HOST"}:
        display_name = "Self registration"
    return {
        "source": source,
        "owner_id": owner.get("user_id") or owner_id,
        "owner_role": owner.get("role") or host.get("lg_owner_role") or host.get("created_by_role") or source,
        "owner_name": display_name,
        "owner_code": display_code,
    }


async def _case_or_404(db, verification_id: str):
    case = await db.property_verifications.find_one({"verification_id": verification_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Verification case not found")
    return case


async def _enrich_case(db, case: dict):
    prop = await db.properties.find_one({"property_id": case.get("property_id")}, {"_id": 0}) or {}
    host = await db.users.find_one({"user_id": case.get("host_id") or case.get("owner_id")}, {"_id": 0, "password_hash": 0}) or {}
    telecaller = {}
    bm = {}
    if case.get("telecaller_id"):
        telecaller = await db.users.find_one({"user_id": case["telecaller_id"]}, {"_id": 0, "password_hash": 0}) or {}
    if case.get("branch_manager_id"):
        bm = await db.users.find_one({"user_id": case["branch_manager_id"]}, {"_id": 0, "password_hash": 0}) or {}
    return {**case, "property": prop, "host": host, "telecaller": telecaller, "branch_manager": bm}


async def _history(db, case: dict, user: dict, action: str, details: dict | None = None):
    event = {
        "action": action,
        "actor": user.get("user_id"),
        "role": user.get("role"),
        "timestamp": now_utc().isoformat(),
        "details": details or {},
    }
    await db.property_verifications.update_one(
        {"verification_id": case["verification_id"]},
        {"$push": {"history": event}, "$set": {"updated_at": now_utc()}},
    )
    await write_audit_log(
        db,
        user_id=user.get("user_id"),
        role=user.get("role"),
        module="verification_cases",
        action=action.lower(),
        record_id=case["verification_id"],
        new_value=details or {},
    )


async def _ensure_missing_cases_for_submitted_properties(db, current_user: dict):
    query = {
        "$or": [
            {"status": {"$in": ["pending_verification", "under_review"]}},
            {"workflow_status": {"$in": ["PROPERTY_SUBMITTED", "TELECALLER_CALL_PENDING", "VERIFICATION_SCHEDULED", "TELECALLER_VERIFICATION_IN_PROGRESS"]}},
        ],
    }
    if not _is_admin(current_user) and not _is_telecaller(current_user) and not _is_branch_manager(current_user):
        query["owner_id"] = current_user.get("user_id")
    props = await db.properties.find(query, {"_id": 0}).sort("updated_at", -1).to_list(length=100)
    for prop in props:
        if not prop.get("property_id"):
            continue
        existing = await db.property_verifications.find_one({"property_id": prop["property_id"]}, {"_id": 0})
        if existing:
            continue
        host = await db.users.find_one({"user_id": prop.get("owner_id")}, {"_id": 0, "password_hash": 0}) or {}
        await upsert_verification_case(db, prop, host, current_user)


async def _assign_unassigned_telecaller_cases(db):
    active_stages = [
        TELECALLER_CALL_PENDING,
        VERIFICATION_SCHEDULED,
        TELECALLER_VERIFICATION_IN_PROGRESS,
        TELECALLER_REWORK_REQUIRED,
        TELECALLER_VERIFICATION_FAILED,
    ]
    rows = await db.property_verifications.find({"current_stage": {"$in": active_stages}}, {"_id": 0}).sort("created_at", 1).to_list(length=500)
    for case in rows:
        policy = case.get("telecaller_assignment_policy") or {}
        if case.get("telecaller_id") and policy.get("policy") == "registration_order_batch":
            continue
        prop = await db.properties.find_one({"property_id": case.get("property_id")}, {"_id": 0}) or {}
        host = await db.users.find_one({"user_id": case.get("host_id") or case.get("owner_id") or prop.get("owner_id")}, {"_id": 0, "password_hash": 0}) or {}
        telecaller_id, meta = await resolve_verification_telecaller(db, prop, host, case)
        if not telecaller_id and case.get("telecaller_id"):
            telecaller_id = case.get("telecaller_id")
        if not telecaller_id:
            continue
        now = now_utc()
        await db.property_verifications.update_one(
            {"verification_id": case["verification_id"]},
            {
                "$set": {
                    "telecaller_id": telecaller_id,
                    "telecaller_assignment_policy": meta,
                    "updated_at": now,
                },
                "$push": {
                    "history": {
                        "action": "TELECALLER_AUTO_ASSIGNED",
                        "actor": "system",
                        "role": "system",
                        "timestamp": now.isoformat(),
                        "details": meta,
                    }
                },
            },
        )
        if prop.get("property_id"):
            await db.properties.update_one(
                {"property_id": prop["property_id"]},
                {"$set": {"telecaller_id": telecaller_id, "verification_telecaller_id": telecaller_id, "updated_at": now}},
            )
        host_id = case.get("host_id") or case.get("owner_id") or prop.get("owner_id")
        if host_id:
            await db.users.update_one(
                {"user_id": host_id},
                {"$set": {
                    "verification_telecaller_id": telecaller_id,
                    "document_telecaller_id": telecaller_id,
                    "document_telecaller_assignment_policy": meta,
                    "updated_at": now,
                }},
            )


async def _assign_host_document_telecallers(db):
    actionable_statuses = ["pending", "pending_review", "submitted", "under_review", "rejected", "approved"]
    hosts = await db.users.find(
        {"role": "host", "kyc_status": {"$in": actionable_statuses}},
        {"_id": 0, "password_hash": 0},
    ).sort("created_at", 1).to_list(length=1000)
    for host in hosts:
        docs = host.get("kyc_documents") or []
        has_document_signal = bool(docs or host.get("agreement_signature") or host.get("pan_number"))
        if not has_document_signal:
            continue
        host_id = host.get("user_id")
        if not host_id:
            continue
        existing_assignment = host.get("verification_telecaller_id") or host.get("document_telecaller_id")
        if not existing_assignment:
            host_cases = await db.property_verifications.find(
                {"host_id": host_id},
                {"_id": 0, "telecaller_id": 1, "telecaller_assignment_policy": 1, "created_at": 1},
            ).sort("created_at", -1).to_list(length=10)
            assigned_case = next((case for case in host_cases if case.get("telecaller_id")), None)
            if assigned_case:
                telecaller_id = assigned_case.get("telecaller_id")
                meta = assigned_case.get("telecaller_assignment_policy") or {"policy": "preserved_property_verification_assignment"}
            else:
                telecaller_id, meta = await resolve_host_document_telecaller(db, host)
            if not telecaller_id:
                continue
            now = now_utc()
            await db.users.update_one(
                {"user_id": host_id},
                {"$set": {
                    "verification_telecaller_id": telecaller_id,
                    "document_telecaller_id": telecaller_id,
                    "document_telecaller_assignment_policy": meta,
                    "updated_at": now,
                }},
            )


def _kyc_required_documents(host: dict) -> list[dict]:
    host_type = str(host.get("host_association_type") or "property_owner").lower()
    requirements = {
        "property_owner": [
            {"document_type": "pan_host_kyc", "label": "PAN / Host KYC", "required": True},
            {"document_type": "property_proof", "label": "Property Proof", "required": True, "hint": "Electricity Bill / Property Tax Receipt"},
            {"document_type": "shop_act", "label": "Shop Act / Udyam Certificate", "required": False, "hint": "If applicable"},
            {"document_type": "cancelled_cheque", "label": "Cancelled Cheque / Bank Proof", "required": True},
        ],
        "property_manager": [
            {"document_type": "property_proof", "label": "Property Proof", "required": True, "hint": "Electricity Bill / Property Tax Receipt"},
            {"document_type": "authorization_letter", "label": "Authorization Letter", "required": True, "hint": "Download format, get it signed, and re-upload"},
            {"document_type": "representative_kyc", "label": "Host / Representative KYC", "required": True},
            {"document_type": "cancelled_cheque", "label": "Cancelled Cheque / Bank Proof", "required": True},
        ],
        "authorized_representative": [
            {"document_type": "property_proof", "label": "Property Proof", "required": True, "hint": "Electricity Bill / Property Tax Receipt"},
            {"document_type": "authorization_letter", "label": "Authorization Letter", "required": True},
            {"document_type": "owner_noc", "label": "Owner NOC", "required": True},
            {"document_type": "representative_kyc", "label": "Host / Representative KYC", "required": True},
        ],
    }
    return requirements.get(host_type, requirements["property_owner"])


def _merge_document_requirement(documents: list[dict], requirement: dict) -> dict:
    document_type = str(requirement["document_type"]).lower()
    aliases = {
        "shop_act": ["shop_act", "property_tax_receipt", "applicable_license", "udyam_certificate", "shop_act_license"],
        "property_proof": ["property_proof", "property", "utility_bill", "electricity_bill"],
        "cancelled_cheque": ["cancelled_cheque", "cheque", "bank_proof", "bank_document"],
        "pan_host_kyc": ["pan_host_kyc", "pan_kyc", "host_kyc", "aadhar_card"],
        "pan_number": ["pan_number", "pan"],
    }
    candidate_types = aliases.get(document_type, [document_type])
    matching_docs = [
        item
        for item in documents
        if str(item.get("document_type") or "").lower() in candidate_types
    ]
    doc = next(
        (
            item
            for item in matching_docs
            if item.get("document_url") or item.get("text_value") or item.get("value")
        ),
        None,
    )
    if not doc and matching_docs:
        doc = matching_docs[0]
    doc = doc or {}
    status = str(doc.get("status") or "pending").lower()
    if status not in {"approved", "rejected", "pending", "uploaded", "pending_review", "request_reupload", "reupload_requested"}:
        status = "pending"
    normalized = {
        "document_type": requirement["document_type"],
        "label": requirement["label"],
        "required": requirement["required"],
        "hint": requirement.get("hint", ""),
        "status": status,
        "document_url": doc.get("document_url") or "",
        "text_value": doc.get("text_value") or doc.get("value") or "",
        "rejection_reason": doc.get("rejection_reason") or "",
        "review_remarks": doc.get("review_remarks") or doc.get("remarks") or "",
        "reviewed_by": doc.get("reviewed_by") or "",
        "reviewed_at": doc.get("reviewed_at") or "",
        "verification_method": doc.get("verification_method") or "",
        "uploaded_at": doc.get("uploaded_at") or "",
        "source_document_type": doc.get("document_type") or requirement["document_type"],
    }
    if normalized["status"] == "uploaded":
        normalized["status"] = "pending"
    normalized["is_complete"] = normalized["status"] == "approved"
    return normalized


def _host_document_summary(host: dict) -> dict:
    requirements = _kyc_required_documents(host)
    documents = list(host.get("kyc_documents") or [])
    if host.get("pan_number") and not any(str(doc.get("document_type") or "").lower() in {"pan_number", "pan"} for doc in documents):
        documents.append({
            "document_type": "pan_number",
            "text_value": host.get("pan_number"),
            "status": "pending",
            "uploaded_at": host.get("updated_at") or host.get("created_at") or "",
        })
    elif host.get("pan_number"):
        for doc in documents:
            if str(doc.get("document_type") or "").lower() in {"pan_number", "pan"} and not (doc.get("text_value") or doc.get("value")):
                doc["text_value"] = host.get("pan_number")
    items = [_merge_document_requirement(documents, requirement) for requirement in requirements]
    known_types = {item["document_type"] for item in items}
    known_aliases = {
        "property": "property_proof",
        "utility_bill": "property_proof",
        "electricity_bill": "property_proof",
        "cheque": "cancelled_cheque",
        "bank_proof": "cancelled_cheque",
        "property_tax_receipt": "shop_act",
        "applicable_license": "shop_act",
        "udyam_certificate": "shop_act",
        "shop_act_license": "shop_act",
        "pan": "pan_number",
    }
    label_map = {
        "property_tax_receipt": ("Shop Act / Udyam Certificate", "If applicable"),
        "applicable_license": ("Additional Applicable Licence", "If applicable"),
        "shop_act": ("Shop Act / Udyam Certificate", "If applicable"),
        "pan_number": ("PAN Number", "Submitted PAN number"),
        "utility_bill": ("Electricity / Utility Bill", "Supporting property proof"),
        "society_noc": ("Society NOC", "If applicable"),
        "gst_certificate": ("GST Certificate", "If applicable"),
        "aadhar_card": ("Aadhaar / ID Proof", "If applicable"),
    }
    for doc in documents:
        raw_type = str(doc.get("document_type") or "").lower()
        if not raw_type:
            continue
        normalized_type = known_aliases.get(raw_type, raw_type)
        if normalized_type in known_types:
            continue
        label, hint = label_map.get(raw_type, (str(raw_type).replace("_", " ").title(), "Optional document"))
        items.append(_merge_document_requirement(documents, {
            "document_type": raw_type,
            "label": label,
            "required": False,
            "hint": hint,
        }))
        known_types.add(raw_type)
    required_items = [item for item in items if item.get("required")]
    approved = sum(1 for item in required_items if item["status"] == "approved")
    rejected = sum(1 for item in required_items if item["status"] == "rejected")
    pending = sum(1 for item in required_items if item["status"] in {"pending", "pending_review", "request_reupload", "reupload_requested"})
    completed = approved == len(required_items) and len(required_items) > 0
    return {
        "items": items,
        "total": len(required_items),
        "approved": approved,
        "pending": pending,
        "rejected": rejected,
        "completed": completed,
    }


def _update_host_kyc_status(host: dict, doc_summary: dict) -> str:
    if doc_summary["rejected"] > 0:
        return "rejected"
    if doc_summary["completed"]:
        return "approved"
    if doc_summary["approved"] > 0:
        return "pending_review"
    return "pending"


@router.get("")
async def list_cases(stage: Optional[str] = None, current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    await _ensure_missing_cases_for_submitted_properties(db, current_user)
    await _assign_unassigned_telecaller_cases(db)
    await _assign_host_document_telecallers(db)
    query = {}
    if stage:
        query["current_stage"] = stage
    if _is_telecaller(current_user):
        telecaller_stages = [
            TELECALLER_CALL_PENDING,
            VERIFICATION_SCHEDULED,
            TELECALLER_VERIFICATION_IN_PROGRESS,
            TELECALLER_REWORK_REQUIRED,
            TELECALLER_VERIFICATION_FAILED,
            BM_REVIEW_PENDING,
        ]
        if stage and stage in telecaller_stages:
            query["current_stage"] = stage
        else:
            query["current_stage"] = {"$in": telecaller_stages}
        query["telecaller_id"] = {"$in": _telecaller_identity_terms(current_user)}
    elif _is_branch_manager(current_user):
        query["current_stage"] = {"$in": [BM_REVIEW_PENDING, BM_REVIEW_IN_PROGRESS, BM_REWORK_REQUIRED]}
        branch_scope = current_user.get("branch") or current_user.get("branch_id") or ""
        query["$or"] = [
            {"branch_manager_id": current_user["user_id"]},
            {"branch_manager_id": current_user.get("employee_code", "")},
        ]
        if branch_scope:
            query["$or"].append({"branch_manager_id": {"$in": ["", "None"]}, "branch_id": branch_scope})
    elif not _is_admin(current_user):
        query["host_id"] = current_user["user_id"]
    rows = await db.property_verifications.find(query, {"_id": 0}).sort("updated_at", -1).to_list(length=500)
    enriched = []
    for row in rows:
        item = await _enrich_case(db, row)
        item["sla"] = _sla_snapshot(item)
        enriched.append(item)
    return {"cases": enriched, "total": len(rows)}


@router.get("/my-leads")
async def my_leads(current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    if not (_is_admin(current_user) or _is_telecaller(current_user)):
        raise HTTPException(status_code=403, detail="Telecaller access required")
    await _ensure_missing_cases_for_submitted_properties(db, current_user)
    await _assign_unassigned_telecaller_cases(db)
    await _assign_host_document_telecallers(db)

    telecaller_profile = current_user
    if _is_telecaller(current_user):
        telecaller_profile = await db.users.find_one(
            {"user_id": current_user.get("user_id")},
            {"_id": 0, "password_hash": 0},
        ) or current_user

    assigned_case_property_ids: list[str] = []
    assigned_case_host_ids: list[str] = []
    if _is_telecaller(current_user):
        telecaller_terms = _telecaller_identity_terms(telecaller_profile)
        assigned_cases = await db.property_verifications.find(
            {"telecaller_id": {"$in": telecaller_terms}},
            {"_id": 0, "property_id": 1, "host_id": 1, "owner_id": 1},
        ).sort("updated_at", -1).to_list(length=1000)
        assigned_case_property_ids = [case.get("property_id") for case in assigned_cases if case.get("property_id")]
        assigned_case_host_ids = [
            case.get("host_id") or case.get("owner_id")
            for case in assigned_cases
            if case.get("host_id") or case.get("owner_id")
        ]
        assigned_document_hosts = await db.users.find(
            {"role": "host", **_host_document_assignment_query(telecaller_terms)},
            {"_id": 0, "user_id": 1},
        ).to_list(length=1000)
        assigned_case_host_ids.extend([
            host.get("user_id")
            for host in assigned_document_hosts
            if host.get("user_id")
        ])

    host_query = {"role": "host"}
    if _is_telecaller(current_user):
        if not assigned_case_host_ids:
            return {"leads": [], "total": 0, "stats": {"total_leads": 0, "hosts_registered": 0, "properties_listed": 0, "verification_cases": 0}}
        host_query["user_id"] = {"$in": list(set(assigned_case_host_ids))}

    hosts = await db.users.find(host_query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(length=1000)
    host_ids = [host.get("user_id") for host in hosts if host.get("user_id")]
    properties = []
    if _is_telecaller(current_user):
        properties = await db.properties.find({"property_id": {"$in": list(set(assigned_case_property_ids))}}, {"_id": 0}).sort("created_at", -1).to_list(length=1000)
    elif host_ids:
        properties = await db.properties.find({"owner_id": {"$in": host_ids}}, {"_id": 0}).sort("created_at", -1).to_list(length=1000)

    property_by_host: dict[str, list[dict]] = {}
    property_ids = []
    for prop in properties:
        property_by_host.setdefault(prop.get("owner_id"), []).append(prop)
        if prop.get("property_id"):
            property_ids.append(prop["property_id"])

    cases_by_property: dict[str, dict] = {}
    if property_ids:
        cases = await db.property_verifications.find({"property_id": {"$in": property_ids}}, {"_id": 0}).sort("updated_at", -1).to_list(length=len(property_ids) * 3)
        for case in cases:
            pid = case.get("property_id")
            if pid and pid not in cases_by_property:
                cases_by_property[pid] = case

    rows = []
    for host in hosts:
        host_props = property_by_host.get(host.get("user_id")) or []
        if not host_props:
            source_owner = await _registration_source_owner(db, host=host)
            rows.append({
                "lead_id": host.get("user_id"),
                "host": host,
                "property": None,
                "verification_case": None,
                "registration_source": host.get("registration_source") or "TELECALLER",
                "lg_code": host.get("lg_code") or host.get("employee_code") or host.get("uid"),
                "source_owner": source_owner,
                "source_owner_name": source_owner.get("owner_name") or "",
                "source_owner_code": source_owner.get("owner_code") or "",
                "lead_stage": "HOST_REGISTERED",
                "kyc_status": host.get("kyc_status") or "unverified",
                "property_count": 0,
                "created_at": host.get("created_at"),
                "updated_at": host.get("updated_at"),
            })
            continue
        for prop in host_props:
            case = cases_by_property.get(prop.get("property_id"))
            source_owner = await _registration_source_owner(db, host=host, prop=prop, case=case)
            rows.append({
                "lead_id": f"{host.get('user_id')}::{prop.get('property_id')}",
                "host": host,
                "property": prop,
                "verification_case": case,
                "registration_source": prop.get("registration_source") or host.get("registration_source") or "TELECALLER",
                "lg_code": prop.get("lg_code") or host.get("lg_code") or host.get("employee_code") or host.get("uid"),
                "source_owner": source_owner,
                "source_owner_name": source_owner.get("owner_name") or "",
                "source_owner_code": source_owner.get("owner_code") or "",
                "lead_stage": (case or {}).get("current_stage") or prop.get("workflow_status") or "PROPERTY_LISTED",
                "kyc_status": host.get("kyc_status") or "unverified",
                "property_count": len(host_props),
                "created_at": prop.get("created_at") or host.get("created_at"),
                "updated_at": (case or {}).get("updated_at") or prop.get("updated_at") or host.get("updated_at"),
            })

    stats = {
        "total_leads": len(rows),
        "hosts_registered": len({row.get("host", {}).get("user_id") for row in rows if row.get("host", {}).get("user_id")}),
        "properties_listed": sum(1 for row in rows if (row.get("property") or {}).get("property_id")),
        "verification_cases": sum(1 for row in rows if (row.get("verification_case") or {}).get("verification_id")),
    }

    return {"leads": rows, "total": len(rows), "stats": stats}


@router.get("/dashboard-summary")
async def dashboard_summary(current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    if not (_is_admin(current_user) or _is_telecaller(current_user)):
        raise HTTPException(status_code=403, detail="Telecaller dashboard access required")
    await _ensure_missing_cases_for_submitted_properties(db, current_user)
    await _assign_unassigned_telecaller_cases(db)
    await _assign_host_document_telecallers(db)
    case_query: dict = {}
    if _is_telecaller(current_user):
        telecaller_terms = _telecaller_identity_terms(current_user)
        case_query["telecaller_id"] = {"$in": telecaller_terms}
    cases = await db.property_verifications.find(case_query, {"_id": 0}).to_list(length=1000)
    enriched = [await _enrich_case(db, case) for case in cases]
    today = now_utc().date().isoformat()
    docs = await list_document_queue(current_user=current_user, db=db)
    doc_items = docs.get("items", [])
    completed = sum(1 for case in cases if case.get("current_stage") in {BM_REVIEW_PENDING, BM_APPROVED, ADMIN_REVIEW_PENDING, LIVE, COMPLETED})
    rework = sum(1 for case in cases if case.get("current_stage") == TELECALLER_REWORK_REQUIRED)
    total = len(cases)
    kpis = {
        "total_cases": total,
        "awaiting_call": sum(1 for case in cases if case.get("current_stage") == TELECALLER_CALL_PENDING),
        "scheduled_today": sum(1 for case in cases if case.get("scheduled_date") == today),
        "document_queue": len(doc_items),
        "docs_completed": sum(1 for item in doc_items if item.get("kyc_status") == "approved"),
        "rework_issues": rework,
    }
    pipeline = {
        "new_registration": kpis["awaiting_call"],
        "document_verification": sum(1 for item in doc_items if item.get("kyc_status") in {"pending", "pending_review", "rejected"}),
        "video_verification": sum(1 for case in cases if case.get("current_stage") in {VERIFICATION_SCHEDULED, TELECALLER_VERIFICATION_IN_PROGRESS}),
        "pending_approval": sum(1 for case in cases if case.get("current_stage") == BM_REVIEW_PENDING),
        "listed_properties": sum(1 for case in enriched if (case.get("property") or {}).get("status") == "live" or case.get("current_stage") == LIVE),
    }
    performance = {
        "total_assigned": total,
        "completed": completed,
        "in_progress": sum(1 for case in cases if case.get("current_stage") in {VERIFICATION_SCHEDULED, TELECALLER_VERIFICATION_IN_PROGRESS}),
        "pending": kpis["awaiting_call"],
        "rework": rework,
        "document_completed": kpis["docs_completed"],
        "video_completed": sum(
            1 for case in cases
            if case.get("video_status") in {"COMPLETED", "PASSED"}
            or case.get("telecaller_result") == "VERIFIED"
            or case.get("telecaller_checklist", {}).get("video_completed") in {"yes", "true", True}
            or case.get("telecaller_checklist", {}).get("video_verification_completed") in {"yes", "true", True}
        ),
        "sent_to_bm": pipeline["pending_approval"],
        "completion_percent": round((completed / total) * 100, 1) if total else 0,
        "rework_percent": round((rework / total) * 100, 1) if total else 0,
        "avg_verification_time": "-",
    }
    tasks = []
    activities = []
    for case in enriched:
        tasks.extend(_task_for_case(case))
        activities.extend(_activity_from_case(case))
    for item in doc_items:
        if item.get("kyc_status") in {"pending", "pending_review", "submitted", "under_review", "rejected"}:
            host = item.get("host") or {}
            tasks.append({
                "task_id": f"{host.get('user_id')}-documents",
                "task": "Review host documents",
                "case_id": item.get("verification_id") or "",
                "property": (item.get("primary_property") or {}).get("title") or "Host KYC",
                "host": host.get("full_name") or "-",
                "due_time": "Today",
                "priority": "High",
                "status": "open",
                "action": "documents",
            })
            activities.append({
                "activity_type": "HOST_DOCUMENTS_ASSIGNED",
                "verification_id": item.get("verification_id") or "",
                "property_id": (item.get("primary_property") or {}).get("property_id") or "",
                "property": (item.get("primary_property") or {}).get("title") or "Host KYC",
                "host": host.get("full_name") or host.get("user_id"),
                "user": item.get("assigned_telecaller_id") or "",
                "timestamp": item.get("last_updated") or "",
                "details": {"kyc_status": item.get("kyc_status")},
            })
    activities.sort(key=lambda item: item.get("timestamp") or "", reverse=True)
    return {
        "kpis": kpis,
        "pipeline": pipeline,
        "performance": performance,
        "tasks": tasks[:12],
        "recent_activity": activities[:12],
        "generated_at": now_utc().isoformat(),
    }


@router.get("/{verification_id}/tasks")
async def case_tasks(verification_id: str, current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    case = await get_case(verification_id, current_user, db)
    return {"tasks": _task_for_case(case)}


@router.get("/{verification_id}/activity")
async def case_activity(verification_id: str, current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    case = await get_case(verification_id, current_user, db)
    return {"activity": _activity_from_case(case)}


@router.get("/document-queue")
async def list_document_queue(stage: Optional[str] = None, current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    await _ensure_missing_cases_for_submitted_properties(db, current_user)
    await _assign_unassigned_telecaller_cases(db)
    await _assign_host_document_telecallers(db)
    if not (_is_admin(current_user) or _is_telecaller(current_user) or _is_branch_manager(current_user)):
        raise HTTPException(status_code=403, detail="Document queue access required")
    query: dict = {"role": "host"}
    if stage and stage != "all":
        query["kyc_status"] = stage
    else:
        query["kyc_status"] = {"$in": ["pending", "pending_review", "submitted", "under_review", "rejected", "approved"]}
    if _is_telecaller(current_user):
        telecaller_terms = _telecaller_identity_terms(current_user)
        assigned_cases = await db.property_verifications.find(
            {"telecaller_id": {"$in": telecaller_terms}},
            {"_id": 0, "host_id": 1, "owner_id": 1},
        ).to_list(length=1000)
        assigned_host_ids = list({
            case.get("host_id") or case.get("owner_id")
            for case in assigned_cases
            if case.get("host_id") or case.get("owner_id")
        })
        assigned_document_hosts = await db.users.find(
            {"role": "host", **_host_document_assignment_query(telecaller_terms)},
            {"_id": 0, "user_id": 1},
        ).to_list(length=1000)
        assigned_host_ids = list(set(assigned_host_ids + [
            host.get("user_id")
            for host in assigned_document_hosts
            if host.get("user_id")
        ]))
        if not assigned_host_ids:
            return {"items": [], "total": 0}
        query["user_id"] = {"$in": assigned_host_ids}
    hosts = await db.users.find(query, {"_id": 0, "password_hash": 0}).sort("updated_at", -1).to_list(length=500)
    properties = await db.properties.find(
        {"owner_id": {"$in": [host.get("user_id") for host in hosts if host.get("user_id")] }},
        {"_id": 0, "property_id": 1, "title": 1, "city": 1, "address": 1, "category": 1, "property_type": 1, "status": 1, "workflow_status": 1, "verification_stage": 1, "owner_id": 1, "registration_source": 1, "lg_code": 1},
    ).to_list(length=1000)
    property_map: dict[str, list[dict]] = {}
    for prop in properties:
        property_map.setdefault(prop.get("owner_id"), []).append(prop)
    property_ids = [prop.get("property_id") for prop in properties if prop.get("property_id")]
    cases = []
    if property_ids:
        cases = await db.property_verifications.find({"property_id": {"$in": property_ids}}, {"_id": 0}).sort("updated_at", -1).to_list(length=max(len(property_ids) * 3, 100))
    case_by_property: dict[str, dict] = {}
    for case in cases:
        pid = case.get("property_id")
        if pid and pid not in case_by_property:
            case_by_property[pid] = case

    items = []
    for host in hosts:
      summary = _host_document_summary(host)
      host_id = host.get("user_id")
      related_properties = property_map.get(host_id, [])
      primary_property = related_properties[0] if related_properties else {}
      verification_case = case_by_property.get(primary_property.get("property_id")) if primary_property else {}
      sla = _sla_snapshot(verification_case) if verification_case else None
      items.append({
          "host": host,
          "documents": summary["items"],
          "document_total": summary["total"],
          "document_approved": summary["approved"],
          "document_pending": summary["pending"],
          "document_rejected": summary["rejected"],
          "document_completed": summary["completed"],
          "kyc_status": host.get("kyc_status") or "pending",
          "host_association_type": host.get("host_association_type") or "property_owner",
          "property_count": len(related_properties),
          "primary_property": primary_property,
          "verification_case": verification_case,
          "verification_id": verification_case.get("verification_id") if verification_case else "",
          "registration_source": verification_case.get("registration_source") or primary_property.get("registration_source") or host.get("registration_source") or "",
          "lg_code": verification_case.get("lg_code") or primary_property.get("lg_code") or host.get("lg_code") or host.get("employee_code") or host.get("uid") or "",
          "assigned_telecaller_id": host.get("verification_telecaller_id") or host.get("document_telecaller_id") or verification_case.get("telecaller_id") or "",
          "sla": sla,
          "last_updated": (verification_case or {}).get("updated_at") or host.get("updated_at") or host.get("created_at"),
      })
    return {"items": items, "total": len(items)}


@router.post("/document-queue/{host_id}/documents/{document_type}/decision")
async def review_host_document(
    host_id: str,
    document_type: str,
    payload: DocumentDecisionPayload,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    if not (_is_admin(current_user) or _is_telecaller(current_user) or _is_branch_manager(current_user)):
        raise HTTPException(status_code=403, detail="Document review access required")
    host = await db.users.find_one({"user_id": host_id, "role": "host"}, {"_id": 0})
    if not host:
        raise HTTPException(status_code=404, detail="Host not found")

    documents = list(host.get("kyc_documents") or [])
    updated_at = now_utc()
    result = payload.result.strip().lower()
    summary_before = _host_document_summary(host)
    summary_item = next((item for item in summary_before["items"] if item["document_type"] == document_type), None)
    source_document_type = (summary_item or {}).get("source_document_type") or document_type
    matched = False
    for doc in documents:
        if str(doc.get("document_type") or "").lower() in {
            str(document_type or "").lower(),
            str(source_document_type or "").lower(),
        }:
            matched = True
            if result in {"approve", "approved"}:
                doc["status"] = "approved"
                doc["rejection_reason"] = ""
            elif result in {"reject", "rejected"}:
                doc["status"] = "rejected"
                doc["rejection_reason"] = payload.remarks or "Rejected during document verification"
            elif result in {"pending", "reupload", "request_reupload"}:
                doc["status"] = "request_reupload"
                doc["rejection_reason"] = payload.remarks or "Please re-upload the document"
            else:
                raise HTTPException(status_code=400, detail="Invalid document decision")
            doc["reviewed_by"] = current_user.get("user_id")
            doc["reviewed_at"] = updated_at.isoformat()
            if payload.remarks:
                doc["review_remarks"] = payload.remarks
            if payload.reference_url:
                doc["reference_url"] = payload.reference_url
            break
    if not matched:
        requirement = summary_item or next((item for item in _kyc_required_documents(host) if item["document_type"] == document_type), None)
        if not requirement:
            raise HTTPException(status_code=404, detail="Document not found on host profile")
        has_submitted_value = bool(requirement.get("document_url") or requirement.get("text_value"))
        if result in {"approve", "approved"} and not has_submitted_value:
            raise HTTPException(status_code=400, detail="Document file is required before approval")
        if result in {"approve", "approved"}:
            status_value = "approved"
            rejection_reason = ""
        elif result in {"reject", "rejected"}:
            status_value = "rejected"
            rejection_reason = payload.remarks or "Rejected during document verification"
        elif result in {"pending", "reupload", "request_reupload"}:
            status_value = "request_reupload"
            rejection_reason = payload.remarks or "Please re-upload the document"
        else:
            raise HTTPException(status_code=400, detail="Invalid document decision")
        documents.append({
            "document_type": document_type,
            "document_name": requirement["label"],
            "status": status_value,
            "document_url": requirement.get("document_url") or "",
            "text_value": requirement.get("text_value") or "",
            "rejection_reason": rejection_reason,
            "review_remarks": payload.remarks or "",
            "reviewed_by": current_user.get("user_id"),
            "reviewed_at": updated_at.isoformat(),
        })

    doc_summary = _host_document_summary({**host, "kyc_documents": documents})
    kyc_status = _update_host_kyc_status(host, doc_summary)
    await db.users.update_one(
        {"user_id": host_id},
        {"$set": {
            "kyc_documents": documents,
            "kyc_status": kyc_status,
            "kyc_reviewed_at": updated_at,
            "updated_at": updated_at,
        }},
    )

    await write_audit_log(
        db,
        user_id=current_user.get("user_id"),
        role=current_user.get("role"),
        module="host_document_verification",
        action=f"document_{result}",
        record_id=host_id,
        new_value={"document_type": document_type, "remarks": payload.remarks or "", "kyc_status": kyc_status},
    )
    return {"message": "Document decision saved", "kyc_status": kyc_status, "document_type": document_type}


@router.post("/document-queue/{host_id}/submit")
async def submit_host_document_verification(
    host_id: str,
    payload: HostDocumentFinalPayload,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    if not (_is_admin(current_user) or _is_telecaller(current_user) or _is_branch_manager(current_user)):
        raise HTTPException(status_code=403, detail="Document review access required")
    host = await db.users.find_one({"user_id": host_id, "role": "host"}, {"_id": 0})
    if not host:
        raise HTTPException(status_code=404, detail="Host not found")

    result = payload.result.strip().lower()
    summary = _host_document_summary(host)
    updated_at = now_utc()
    if result in {"approve", "approved", "submit"}:
        missing = [
            item["label"]
            for item in summary["items"]
            if item.get("required") and item["status"] != "approved"
        ]
        if missing:
            raise HTTPException(status_code=400, detail=f"Approve required documents first: {', '.join(missing)}")
        kyc_status = "approved"
        update = {
            "kyc_status": kyc_status,
            "kyc_verified_by": current_user.get("user_id"),
            "kyc_verified_at": updated_at,
            "kyc_review_remarks": payload.remarks or "",
            "updated_at": updated_at,
        }
        action = "host_documents_approved"
        message = "Host document verification submitted"
    elif result in {"reject", "rejected"}:
        if not payload.remarks.strip():
            raise HTTPException(status_code=400, detail="Reject reason is required")
        kyc_status = "rejected"
        update = {
            "kyc_status": kyc_status,
            "kyc_rejection_reason": payload.remarks,
            "kyc_reviewed_by": current_user.get("user_id"),
            "kyc_reviewed_at": updated_at,
            "updated_at": updated_at,
        }
        action = "host_documents_rejected"
        message = "Host document verification rejected"
    else:
        raise HTTPException(status_code=400, detail="Invalid final document decision")

    await db.users.update_one({"user_id": host_id}, {"$set": update})
    await write_audit_log(
        db,
        user_id=current_user.get("user_id"),
        role=current_user.get("role"),
        module="host_document_verification",
        action=action,
        record_id=host_id,
        new_value={"kyc_status": kyc_status, "remarks": payload.remarks or ""},
    )
    return {"message": message, "kyc_status": kyc_status, "host_id": host_id}


@router.get("/{verification_id}")
async def get_case(verification_id: str, current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    case = await _case_or_404(db, verification_id)
    if not (_is_admin(current_user) or _is_telecaller(current_user) or _is_branch_manager(current_user) or case.get("host_id") == current_user.get("user_id")):
        raise HTTPException(status_code=403, detail="Not authorized")
    if case.get("current_stage") == VERIFICATION_SCHEDULED and not case.get("jitsi_room_name"):
        room_name = workflow_id("XSPACE-VER")
        await db.property_verifications.update_one(
            {"verification_id": verification_id},
            {"$set": {"jitsi_room_name": room_name, "updated_at": now_utc()}},
        )
        case["jitsi_room_name"] = room_name
    return await _enrich_case(db, case)


@router.post("/schedule")
async def schedule_case(payload: SchedulePayload, current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    case = await _case_or_404(db, payload.verification_id)
    if not (_is_admin(current_user) or _is_telecaller(current_user) or case.get("host_id") == current_user.get("user_id")):
        raise HTTPException(status_code=403, detail="Not authorized to schedule this verification")
    try:
        scheduled_day = datetime.strptime(payload.scheduled_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Schedule date must be in YYYY-MM-DD format")
    if scheduled_day < now_utc().date():
        raise HTTPException(status_code=400, detail="Past dates cannot be selected for video verification")
    for time_value, field_name in (
        (payload.scheduled_start_time, "scheduled_start_time"),
        (payload.scheduled_end_time, "scheduled_end_time"),
    ):
        if time_value:
            try:
                datetime.strptime(time_value, "%H:%M")
            except ValueError:
                raise HTTPException(status_code=400, detail=f"{field_name} must be in 24-hour HH:MM format")
    updates = {
        "scheduled_date": payload.scheduled_date,
        "scheduled_start_time": payload.scheduled_start_time,
        "scheduled_end_time": payload.scheduled_end_time or "",
        "schedule_notes": payload.notes or "",
        "jitsi_room_name": case.get("jitsi_room_name") or workflow_id("XSPACE-VER"),
        "current_stage": VERIFICATION_SCHEDULED,
        "current_status": VERIFICATION_SCHEDULED,
        "workflow_status": VERIFICATION_SCHEDULED,
        "status": "scheduled",
        "updated_at": now_utc(),
    }
    if payload.telecaller_id or _is_telecaller(current_user):
        updates["telecaller_id"] = payload.telecaller_id or current_user["user_id"]
    await db.property_verifications.update_one({"verification_id": payload.verification_id}, {"$set": updates})
    if case.get("property_id"):
        await db.properties.update_one(
            {"property_id": case.get("property_id")},
            {"$set": {
                "verification_stage": VERIFICATION_SCHEDULED,
                "workflow_status": VERIFICATION_SCHEDULED,
                "video_verification": {
                    "verification_id": payload.verification_id,
                    "scheduled_date": payload.scheduled_date,
                    "scheduled_start_time": payload.scheduled_start_time,
                    "scheduled_end_time": payload.scheduled_end_time or "",
                    "notes": payload.notes or "",
                    "action_url": f"/host/properties/{case.get('property_id')}/video-verification?verificationId={payload.verification_id}",
                },
                "updated_at": now_utc(),
            }},
        )
    try:
        if case.get("host_id"):
            await db.notifications.insert_one({
                "notification_id": workflow_id("NOTIF"),
                "user_id": case.get("host_id"),
                "type": "verification_assigned",
                "channel": "in_app",
                "title": "Video verification scheduled",
                "message": f"Your video verification call has been scheduled for {payload.scheduled_date} at {payload.scheduled_start_time}. Please join from your property card at the scheduled time.",
                "recipient": case.get("host_id"),
                "status": "pending",
                "data": {
                    "verification_id": payload.verification_id,
                    "property_id": case.get("property_id"),
                    "scheduled_date": payload.scheduled_date,
                    "scheduled_start_time": payload.scheduled_start_time,
                    "scheduled_end_time": payload.scheduled_end_time or "",
                    "action_url": f"/host/properties/{case.get('property_id')}/video-verification?verificationId={payload.verification_id}",
                },
                "created_at": now_utc(),
                "updated_at": now_utc(),
            })
    except Exception:
        pass
    await _history(db, case, current_user, "VERIFICATION_SCHEDULED", updates)
    return {"message": "Verification scheduled", "verification_id": payload.verification_id}


@router.post("/{verification_id}/start")
async def start_telecaller_verification(verification_id: str, current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    if not (_is_admin(current_user) or _is_telecaller(current_user)):
        raise HTTPException(status_code=403, detail="Telecaller access required")
    case = await _case_or_404(db, verification_id)
    await db.property_verifications.update_one(
        {"verification_id": verification_id},
        {"$set": {
            "telecaller_id": case.get("telecaller_id") or current_user["user_id"],
            "current_stage": TELECALLER_VERIFICATION_IN_PROGRESS,
            "current_status": TELECALLER_VERIFICATION_IN_PROGRESS,
            "workflow_status": TELECALLER_VERIFICATION_IN_PROGRESS,
            "telecaller_started_at": now_utc(),
            "updated_at": now_utc(),
        }},
    )
    await _history(db, case, current_user, "TELECALLER_VERIFICATION_STARTED")
    return {"message": "Telecaller verification started"}


@router.post("/local-adb/dial")
async def local_adb_dial(payload: AdbDialPayload, current_user: dict = Depends(get_current_user)):
    if not (_is_admin(current_user) or _is_telecaller(current_user)):
        raise HTTPException(status_code=403, detail="Telecaller access required")
    phone = _clean_phone(payload.phone)
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number is required")
    adb_path = _find_adb_executable()
    if not adb_path:
        raise HTTPException(status_code=400, detail="ADB not found. Install platform-tools or add adb.exe to PATH.")
    action = "android.intent.action.CALL" if str(payload.action or "CALL").upper() == "CALL" else "android.intent.action.DIAL"
    command = [adb_path, "shell", "am", "start", "-a", action, "-d", f"tel:{phone}"]
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=12, check=False)
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="ADB command timed out. Check USB connection and debugging permission.")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to run ADB: {exc}")
    output = f"{result.stdout}\n{result.stderr}".strip()
    if result.returncode != 0:
        raise HTTPException(status_code=400, detail=output or "ADB failed. Check device authorization.")
    if payload.auto_record:
        _start_recording_after_delay(adb_path, int(payload.record_delay_seconds or 6))
    return {
        "message": "ADB call command sent",
        "phone": phone,
        "auto_record": bool(payload.auto_record),
        "record_delay_seconds": int(payload.record_delay_seconds or 6),
        "output": output,
    }


@router.post("/{verification_id}/call")
async def save_call_outcome(verification_id: str, payload: CallPayload, current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    if not (_is_admin(current_user) or _is_telecaller(current_user)):
        raise HTTPException(status_code=403, detail="Telecaller access required")
    case = await _case_or_404(db, verification_id)
    outcome = payload.outcome.strip().upper().replace(" ", "_")
    valid = {"CONNECTED", "NO_ANSWER", "BUSY", "WRONG_NUMBER", "CALLBACK_REQUESTED", "HOST_NOT_INTERESTED", "COMPLETED", "SCHEDULED", "RESCHEDULED"}
    if outcome not in valid:
        raise HTTPException(status_code=400, detail="Invalid call outcome")
    now = now_utc()
    call_event = {
        "outcome": outcome,
        "remarks": payload.remarks or "",
        "scheduled_date": payload.scheduled_date or "",
        "scheduled_time": payload.scheduled_time or "",
        "next_follow_up": payload.next_follow_up or "",
        "caller_number": payload.caller_number or "",
        "caller_user_id": payload.caller_user_id or current_user.get("user_id"),
        "call_type": payload.call_type or "",
        "call_checklist": payload.call_checklist or {},
        "call_duration_seconds": payload.call_duration_seconds or 0,
        "recording_status": payload.recording_status or "",
        "performed_by": current_user.get("user_id"),
        "performed_at": now.isoformat(),
    }
    next_stage = case.get("current_stage")
    if outcome in {"SCHEDULED", "RESCHEDULED", "CALLBACK_REQUESTED", "NO_ANSWER", "BUSY"}:
        next_stage = TELECALLER_CALL_PENDING
    elif outcome in {"CONNECTED", "COMPLETED"}:
        next_stage = VERIFICATION_SCHEDULED if case.get("scheduled_date") else TELECALLER_VERIFICATION_IN_PROGRESS
    elif outcome in {"HOST_NOT_INTERESTED", "WRONG_NUMBER"}:
        next_stage = TELECALLER_REWORK_REQUIRED
    updates = {
        "call_status": outcome,
        "last_call_outcome": outcome,
        "current_stage": next_stage,
        "current_status": next_stage,
        "workflow_status": next_stage,
        "updated_at": now,
    }
    if payload.scheduled_date:
        updates["scheduled_call_date"] = payload.scheduled_date
    if payload.scheduled_time:
        updates["scheduled_call_time"] = payload.scheduled_time
    await db.property_verifications.update_one(
        {"verification_id": verification_id},
        {"$set": updates, "$push": {"call_history": call_event}},
    )
    await _history(db, case, current_user, f"CALL_{outcome}", call_event)
    return {"message": "Call outcome saved", "workflow_status": next_stage}


@router.patch("/{verification_id}/telecaller-checklist")
async def save_telecaller_checklist(verification_id: str, payload: ChecklistPayload, current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    if not (_is_admin(current_user) or _is_telecaller(current_user)):
        raise HTTPException(status_code=403, detail="Telecaller access required")
    case = await _case_or_404(db, verification_id)
    await db.property_verifications.update_one(
        {"verification_id": verification_id},
        {"$set": {
            "telecaller_checklist": payload.checklist,
            "telecaller_remarks": payload.remarks or "",
            "telecaller_video_url": payload.video_url or case.get("telecaller_video_url") or "",
            "updated_at": now_utc(),
        }},
    )
    await _history(db, case, current_user, "TELECALLER_CHECKLIST_UPDATED")
    return {"message": "Checklist saved", "complete": all_required_done(payload.checklist, [key for key, _ in TELECALLER_VISIBLE_CHECKLIST])}


@router.post("/{verification_id}/telecaller-decision")
async def telecaller_decision(verification_id: str, payload: DecisionPayload, current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    if not (_is_admin(current_user) or _is_telecaller(current_user)):
        raise HTTPException(status_code=403, detail="Telecaller access required")
    if not payload.remarks.strip():
        raise HTTPException(status_code=400, detail="Telecaller remarks are required")
    case = await _case_or_404(db, verification_id)
    result = payload.result.upper()
    checklist = case.get("telecaller_checklist") or {}
    failed_checks = [
        label for key, label in TELECALLER_VISIBLE_CHECKLIST
        if checklist.get(key) not in {"yes", "true", True}
    ]
    if result == "VERIFIED" and len(failed_checks) > 6:
        result = "FAILED"
    decision_remarks = payload.remarks
    if result == "FAILED" and failed_checks:
        decision_remarks = (
            f"{payload.remarks}\n\nRejected checklist points:\n- " + "\n- ".join(failed_checks)
        ).strip()
    next_stage = BM_REVIEW_PENDING if result == "VERIFIED" else TELECALLER_REWORK_REQUIRED if result == "REWORK" else TELECALLER_VERIFICATION_FAILED
    property_status = "under_review" if result == "VERIFIED" else "draft" if result == "REWORK" else "rejected"
    updates = {
        "current_stage": next_stage,
        "current_status": next_stage,
        "workflow_status": next_stage,
        "status": "completed" if result == "VERIFIED" else "rejected" if result == "FAILED" else "pending",
        "telecaller_result": result,
        "telecaller_verified_at": now_utc() if result == "VERIFIED" else None,
        "telecaller_remarks": decision_remarks,
        "telecaller_failed_checkpoints": failed_checks,
        "telecaller_video_url": payload.video_url or case.get("telecaller_video_url") or "",
        "issue_category": payload.issue_category or "",
        "required_action": payload.required_action or "",
        "updated_at": now_utc(),
    }
    await db.property_verifications.update_one({"verification_id": verification_id}, {"$set": updates})
    await db.properties.update_one(
        {"property_id": case["property_id"]},
        {"$set": {
            "status": property_status,
            "workflow_status": next_stage,
            "verification_stage": next_stage,
            "verification_remarks": decision_remarks if result in {"REWORK", "FAILED"} else "",
            "updated_at": now_utc(),
        }},
    )
    if result == "FAILED" and case.get("host_id"):
        host = await db.users.find_one({"user_id": case.get("host_id")}, {"_id": 0})
        property_doc = await db.properties.find_one({"property_id": case.get("property_id")}, {"_id": 0})
        message = (
            "Your property video verification was rejected because these checklist points were not verified: "
            + ", ".join(failed_checks)
        )
        await db.notifications.insert_one({
            "notification_id": workflow_id("NOTIF"),
            "user_id": case.get("host_id"),
            "type": "property_rejected",
            "channel": "in_app",
            "title": "Video verification rejected",
            "message": message,
            "recipient": case.get("host_id"),
            "status": "pending",
            "data": {
                "verification_id": verification_id,
                "property_id": case.get("property_id"),
                "failed_checkpoints": failed_checks,
                "action_url": f"/host/list-property?edit={case.get('property_id')}",
            },
            "created_at": now_utc(),
            "updated_at": now_utc(),
        })
        try:
            if host and host.get("email"):
                from services.email_service import email_service
                email_service.send_template(host["email"], "property_rejected", {
                    "name": host.get("full_name") or host.get("email"),
                    "property_title": (property_doc or {}).get("title") or "your property",
                    "property_id": case.get("property_id"),
                    "reason": "Video verification checklist failed",
                    "remarks": decision_remarks,
                    "message": message,
                    "action_url": f"/host/list-property?edit={case.get('property_id')}",
                })
        except Exception:
            pass
    await _history(db, case, current_user, next_stage, updates)
    return {"message": "Telecaller decision saved", "workflow_status": next_stage}


@router.patch("/{verification_id}/bm-checklist")
async def save_bm_checklist(verification_id: str, payload: ChecklistPayload, current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    if not (_is_admin(current_user) or _is_branch_manager(current_user)):
        raise HTTPException(status_code=403, detail="Branch Manager access required")
    case = await _case_or_404(db, verification_id)
    await db.property_verifications.update_one(
        {"verification_id": verification_id},
        {"$set": {"bm_checklist": payload.checklist, "bm_remarks": payload.remarks or "", "current_stage": BM_REVIEW_IN_PROGRESS, "workflow_status": BM_REVIEW_IN_PROGRESS, "updated_at": now_utc()}},
    )
    await _history(db, case, current_user, "BM_CHECKLIST_UPDATED")
    return {"message": "BM checklist saved", "complete": all_required_done(payload.checklist, BM_CHECKLIST_KEYS)}


@router.post("/{verification_id}/bm-decision")
async def bm_decision(verification_id: str, payload: DecisionPayload, current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    if not (_is_admin(current_user) or _is_branch_manager(current_user)):
        raise HTTPException(status_code=403, detail="Branch Manager access required")
    if not payload.remarks.strip():
        raise HTTPException(status_code=400, detail="BM remarks are required")
    case = await _case_or_404(db, verification_id)
    result = payload.result.upper()
    checklist = case.get("bm_checklist") or {}
    if result == "APPROVE" and not all_required_done(checklist, BM_CHECKLIST_KEYS):
        raise HTTPException(status_code=400, detail="Complete mandatory BM checklist before approval")
    next_stage = ADMIN_REVIEW_PENDING if result == "APPROVE" else BM_REWORK_REQUIRED if result == "REWORK" else BM_REJECTED
    updates = {
        "current_stage": next_stage,
        "current_status": next_stage,
        "workflow_status": next_stage,
        "branch_manager_reviewed": True,
        "branch_manager_approved": result == "APPROVE",
        "bm_approved_at": now_utc() if result == "APPROVE" else None,
        "branch_manager_remarks": payload.remarks,
        "issue_category": payload.issue_category or "",
        "required_action": payload.required_action or "",
        "updated_at": now_utc(),
    }
    await db.property_verifications.update_one({"verification_id": verification_id}, {"$set": updates})
    await db.properties.update_one(
        {"property_id": case["property_id"]},
        {"$set": {
            "status": "under_review" if result == "APPROVE" else "draft" if result == "REWORK" else "rejected",
            "workflow_status": next_stage,
            "verification_stage": next_stage,
            "verification_remarks": payload.remarks if result in {"REWORK", "REJECT"} else "",
            "updated_at": now_utc(),
        }},
    )
    await _history(db, case, current_user, next_stage, updates)
    return {"message": "BM decision saved", "workflow_status": next_stage}


@router.post("/{verification_id}/admin-decision")
async def admin_decision(verification_id: str, payload: DecisionPayload, current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    if not payload.remarks.strip():
        raise HTTPException(status_code=400, detail="Admin remarks are required")
    case = await _case_or_404(db, verification_id)
    result = payload.result.upper()
    status_map = {
        "APPROVE": ADMIN_APPROVED,
        "CORRECTION": ADMIN_CORRECTION_REQUIRED,
        "HOLD": ADMIN_ON_HOLD,
        "REJECT": ADMIN_REJECTED,
    }
    next_stage = status_map.get(result)
    if not next_stage:
        raise HTTPException(status_code=400, detail="Invalid admin decision")
    property_status = "under_review"
    if result == "APPROVE":
        next_stage = LIVE
        property_status = "live"
    elif result in {"CORRECTION", "REJECT"}:
        property_status = "draft" if result == "CORRECTION" else "rejected"
    updates = {
        "current_stage": next_stage,
        "current_status": COMPLETED if result == "APPROVE" else next_stage,
        "workflow_status": next_stage,
        "admin_reviewed": True,
        "admin_approved": result == "APPROVE",
        "admin_remarks": payload.remarks,
        "admin_approved_at": now_utc() if result == "APPROVE" else None,
        "property_live_at": now_utc() if result == "APPROVE" else None,
        "status": "approved" if result == "APPROVE" else "rejected" if result == "REJECT" else "pending",
        "updated_at": now_utc(),
    }
    await db.property_verifications.update_one({"verification_id": verification_id}, {"$set": updates})
    await db.properties.update_one({"property_id": case["property_id"]}, {"$set": {"status": property_status, "workflow_status": next_stage, "approved_at": now_utc() if result == "APPROVE" else None, "updated_at": now_utc()}})
    await _history(db, case, current_user, PUBLISHING if result == "APPROVE" else next_stage, updates)
    return {"message": "Admin decision saved", "workflow_status": next_stage, "property_status": property_status}
