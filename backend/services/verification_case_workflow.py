from datetime import datetime, timezone
from uuid import uuid4

PROPERTY_SUBMITTED = "PROPERTY_SUBMITTED"
VERIFICATION_SLOT_PENDING = "VERIFICATION_SLOT_PENDING"
TELECALLER_CALL_PENDING = "TELECALLER_CALL_PENDING"
VERIFICATION_SCHEDULED = "VERIFICATION_SCHEDULED"
TELECALLER_VERIFICATION_IN_PROGRESS = "TELECALLER_VERIFICATION_IN_PROGRESS"
TELECALLER_REWORK_REQUIRED = "TELECALLER_REWORK_REQUIRED"
TELECALLER_VERIFICATION_FAILED = "TELECALLER_VERIFICATION_FAILED"
TELECALLER_VERIFIED = "TELECALLER_VERIFIED"
BM_REVIEW_PENDING = "BM_REVIEW_PENDING"
BM_REVIEW_IN_PROGRESS = "BM_REVIEW_IN_PROGRESS"
BM_APPROVED = "BM_APPROVED"
BM_REWORK_REQUIRED = "BM_REWORK_REQUIRED"
BM_REJECTED = "BM_REJECTED"
ADMIN_REVIEW_PENDING = "ADMIN_REVIEW_PENDING"
ADMIN_APPROVED = "ADMIN_APPROVED"
ADMIN_CORRECTION_REQUIRED = "ADMIN_CORRECTION_REQUIRED"
ADMIN_ON_HOLD = "ADMIN_ON_HOLD"
ADMIN_REJECTED = "ADMIN_REJECTED"
PUBLISHING = "PUBLISHING"
LIVE = "LIVE"
COMPLETED = "COMPLETED"

TELECALLER_ASSIGNMENT_BATCH_SIZE = 10
TELECALLER_ASSIGNMENT_COUNTER_ID = "verification_telecaller_batch_sequence"

SELF_HOST = "SELF_HOST"
BROKER = "BROKER"
RM = "RM"
TELECALLER = "TELECALLER"

TELECALLER_CHECKLIST_KEYS = [
    "host_identity_confirmed",
    "host_mobile_confirmed",
    "host_name_matches_kyc",
    "property_visible_on_video",
    "property_entrance_verified",
    "property_name_verified",
    "address_location_verified",
    "bedrooms_verified",
    "beds_verified",
    "bathrooms_verified",
    "amenities_verified",
    "property_condition_verified",
    "property_proof_available",
    "document_name_checked",
    "bank_document_checked",
    "video_completed",
    "property_shown_on_video",
    "representative_present",
]

BM_CHECKLIST_KEYS = [
    "host_name_verified",
    "host_kyc_verified",
    "mobile_verified",
    "property_proof_valid",
    "property_name_checked",
    "address_checked",
    "ownership_authorisation_checked",
    "bank_details_reviewed",
    "telecaller_checklist_completed",
    "video_verification_completed",
    "telecaller_remarks_acceptable",
    "no_critical_discrepancy",
    "category_correct",
    "property_information_correct",
    "location_correct",
    "pricing_checked",
    "amenities_checked",
    "images_description_reviewed",
]


def now_utc():
    return datetime.now(timezone.utc)


def workflow_id(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:10].upper()}"


def normalize_registration_source(user: dict | None, host: dict | None = None) -> str:
    if host and host.get("registration_source"):
        return str(host["registration_source"]).upper()
    role = str((user or {}).get("role") or "").lower()
    if role == "broker":
        return BROKER
    if role == "rm":
        return RM
    if role == "telecaller":
        return TELECALLER
    return SELF_HOST


def attribution_from_host(host: dict | None, actor: dict | None = None) -> dict:
    host = host or {}
    actor = actor or {}
    source = normalize_registration_source(actor, host)
    lg_code = host.get("lg_code") or host.get("employee_code") or actor.get("lg_code") or actor.get("employee_code") or actor.get("uid")
    owner_id = host.get("lg_owner_id") or host.get("created_by_user_id") or actor.get("user_id")
    owner_role = host.get("lg_owner_role") or host.get("created_by_role") or actor.get("role")
    return {
        "registration_source": source,
        "created_by_user_id": host.get("created_by_user_id") or actor.get("user_id") or host.get("user_id"),
        "created_by_role": host.get("created_by_role") or actor.get("role") or "host",
        "lg_code": lg_code,
        "lg_owner_id": owner_id,
        "lg_owner_role": str(owner_role or "").upper() if owner_role else "",
        "branch_id": host.get("branch") or host.get("branch_id") or "",
    }


def initial_case_status(registration_source: str) -> str:
    return TELECALLER_CALL_PENDING


async def resolve_branch_manager(db, prop: dict, host: dict | None = None):
    host = host or {}
    for value in (
        prop.get("branch_manager_id"),
        host.get("branch_manager_id"),
        prop.get("branch_manager_code"),
        host.get("branch_manager_code"),
    ):
        if value:
            manager = await db.users.find_one(
                {
                    "role": {"$in": ["branch_manager", "employee"]},
                    "$or": [
                        {"user_id": value},
                        {"employee_code": value},
                        {"uid": value},
                    ],
                },
                {"_id": 0},
            )
            if manager:
                return manager
    branch = prop.get("branch") or host.get("branch")
    city = prop.get("city") or host.get("city")
    if branch or city:
        query = {"role": {"$in": ["branch_manager", "employee"]}, "is_active": {"$ne": False}}
        if branch:
            query["branch"] = branch
        elif city:
            query["$or"] = [{"work_location": city}, {"city": city}]
        return await db.users.find_one(query, {"_id": 0})
    return None


def _telecaller_sort_value(user: dict):
    created = user.get("created_at") or user.get("timestamp") or user.get("createdAt") or ""
    return (str(created), str(user.get("user_id") or user.get("uid") or ""))


async def resolve_verification_telecaller(db, prop: dict, host: dict | None = None, existing: dict | None = None):
    """Assign verification cases to active telecallers in registration order, 10 cases per telecaller."""
    active_reassignable_stages = {
        PROPERTY_SUBMITTED,
        TELECALLER_CALL_PENDING,
        VERIFICATION_SCHEDULED,
        TELECALLER_VERIFICATION_IN_PROGRESS,
        TELECALLER_REWORK_REQUIRED,
        TELECALLER_VERIFICATION_FAILED,
    }
    existing_policy = (existing or {}).get("telecaller_assignment_policy") or {}
    existing_stage = (existing or {}).get("current_stage") or (existing or {}).get("workflow_status") or ""
    if (
        existing
        and existing.get("telecaller_id")
    ):
        if existing_policy.get("policy") == "registration_order_batch":
            return existing.get("telecaller_id"), existing_policy
        if existing_stage not in active_reassignable_stages:
            return existing.get("telecaller_id"), {"policy": "preserved_existing"}

    host = host or {}
    host_verification_telecaller = host.get("verification_telecaller_id") or host.get("document_telecaller_id")
    if host_verification_telecaller:
        return host_verification_telecaller, {
            "policy": "preserved_host_verification_assignment",
            "source": "host_document_queue",
        }

    prop_verification_telecaller = prop.get("verification_telecaller_id")
    if prop_verification_telecaller:
        return prop_verification_telecaller, {
            "policy": "preserved_property_verification_assignment",
            "source": "property",
        }

    return await assign_next_verification_telecaller(db, prop, host)


async def assign_next_verification_telecaller(db, prop: dict | None = None, host: dict | None = None):
    """Return the next active telecaller using the 10-record registration-order batch policy."""
    prop = prop or {}
    host = host or {}
    ensure_table = getattr(db, "ensure_table", None)
    if callable(ensure_table):
        await ensure_table("platform_settings")
    telecallers = await db.users.find(
        {
            "role": "telecaller",
            "is_active": {"$ne": False},
        },
        {"_id": 0, "user_id": 1, "uid": 1, "employee_code": 1, "lg_code": 1, "full_name": 1, "created_at": 1, "timestamp": 1, "createdAt": 1},
    ).to_list(length=1000)
    telecallers = [row for row in telecallers if row.get("user_id")]
    telecallers.sort(key=_telecaller_sort_value)

    if not telecallers:
        fallback = prop.get("telecaller_id") or host.get("telecaller_id") or ""
        return fallback, {"policy": "fallback_no_active_telecaller"}

    counter_key = f"counter:{TELECALLER_ASSIGNMENT_COUNTER_ID}"
    counter = await db.platform_settings.find_one({"key": counter_key}, {"_id": 0})
    sequence = int((counter or {}).get("value") or 0)
    next_value = sequence + 1
    if counter:
        await db.platform_settings.update_one(
            {"key": counter_key},
            {"$set": {"value": next_value, "updated_at": now_utc()}},
        )
    else:
        await db.platform_settings.insert_one({
            "key": counter_key,
            "setting_type": "workflow_counter",
            "value": next_value,
            "created_at": now_utc(),
            "updated_at": now_utc(),
        })
    telecaller_index = (sequence // TELECALLER_ASSIGNMENT_BATCH_SIZE) % len(telecallers)
    selected = telecallers[telecaller_index]
    return selected["user_id"], {
        "policy": "registration_order_batch",
        "sequence": sequence + 1,
        "batch_size": TELECALLER_ASSIGNMENT_BATCH_SIZE,
        "telecaller_index": telecaller_index,
        "telecaller_name": selected.get("full_name") or "",
        "telecaller_code": selected.get("lg_code") or selected.get("employee_code") or selected.get("uid") or selected["user_id"],
    }


async def resolve_host_document_telecaller(db, host: dict):
    """Assign host document verification to the same telecaller queue used for property verification."""
    existing = host.get("verification_telecaller_id") or host.get("document_telecaller_id")
    if existing:
        return existing, {
            "policy": "preserved_host_verification_assignment",
            "source": "host_document_queue",
        }
    return await assign_next_verification_telecaller(db, {}, host)


async def upsert_verification_case(db, prop: dict, host: dict, actor: dict | None = None):
    existing = await db.property_verifications.find_one({"property_id": prop["property_id"]}, {"_id": 0}, sort=[("created_at", -1)])
    attribution = attribution_from_host(host, actor)
    branch_manager = await resolve_branch_manager(db, prop, host)
    assigned_telecaller_id, assignment_meta = await resolve_verification_telecaller(db, prop, host, existing)
    status = initial_case_status(attribution["registration_source"])
    now = now_utc()
    base = {
        "property_id": prop["property_id"],
        "host_id": prop.get("owner_id") or host.get("user_id"),
        "owner_id": prop.get("owner_id") or host.get("user_id"),
        "registration_source": attribution["registration_source"],
        "created_by_user_id": attribution["created_by_user_id"],
        "created_by_role": attribution["created_by_role"],
        "lg_code": attribution["lg_code"],
        "lg_owner_id": attribution["lg_owner_id"],
        "lg_owner_role": attribution["lg_owner_role"],
        "branch_id": attribution["branch_id"],
        "telecaller_id": assigned_telecaller_id or "",
        "telecaller_assignment_policy": assignment_meta,
        "branch_manager_id": (branch_manager or {}).get("user_id") or prop.get("branch_manager_id") or host.get("branch_manager_id") or "",
        "current_stage": status,
        "current_status": status,
        "workflow_status": status,
        "status": "pending",
        "telecaller_checklist": existing.get("telecaller_checklist", {}) if existing else {},
        "bm_checklist": existing.get("bm_checklist", {}) if existing else {},
        "updated_at": now,
    }
    if existing:
        await db.property_verifications.update_one({"verification_id": existing["verification_id"]}, {"$set": base})
        if assigned_telecaller_id:
            await db.properties.update_one(
                {"property_id": prop["property_id"]},
                {"$set": {"telecaller_id": assigned_telecaller_id, "verification_telecaller_id": assigned_telecaller_id, "updated_at": now}},
            )
            await db.users.update_one(
                {"user_id": base["host_id"]},
                {"$set": {
                    "verification_telecaller_id": assigned_telecaller_id,
                    "document_telecaller_id": assigned_telecaller_id,
                    "document_telecaller_assignment_policy": assignment_meta,
                    "updated_at": now,
                }},
            )
        existing.update(base)
        return existing
    doc = {
        **base,
        "verification_id": workflow_id("XSP-VRF"),
        "created_at": now,
        "history": [{
            "action": "VERIFICATION_CASE_CREATED",
            "actor": (actor or {}).get("user_id") or host.get("user_id"),
            "role": (actor or {}).get("role") or host.get("role"),
            "timestamp": now.isoformat(),
            "details": {"status": status, "telecaller_assignment": assignment_meta},
        }],
    }
    await db.property_verifications.insert_one(doc)
    if assigned_telecaller_id:
        await db.properties.update_one(
            {"property_id": prop["property_id"]},
            {"$set": {"telecaller_id": assigned_telecaller_id, "verification_telecaller_id": assigned_telecaller_id, "updated_at": now}},
        )
        await db.users.update_one(
            {"user_id": base["host_id"]},
            {"$set": {
                "verification_telecaller_id": assigned_telecaller_id,
                "document_telecaller_id": assigned_telecaller_id,
                "document_telecaller_assignment_policy": assignment_meta,
                "updated_at": now,
            }},
        )
    return doc


def all_required_done(checklist: dict, keys: list[str]) -> bool:
    return all(str(checklist.get(key, "")).lower() in {"yes", "true", "na", "not_applicable"} for key in keys)
