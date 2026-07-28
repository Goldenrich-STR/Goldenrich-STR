from datetime import datetime, timezone
from uuid import uuid4


async def write_audit_log(
    db,
    *,
    user_id: str,
    role: str,
    module: str,
    action: str,
    record_id: str = "",
    old_value=None,
    new_value=None,
    ip_address: str = "",
    device: str = "",
    branch: str = "",
    reason: str = "",
    status: str = "success",
):
    log = {
        "audit_id": f"audit_{uuid4().hex[:14]}",
        "user_id": user_id,
        "role": role,
        "module": module,
        "action": action,
        "record_id": record_id,
        "old_value": old_value,
        "new_value": new_value,
        "ip_address": ip_address,
        "device": device,
        "branch": branch,
        "reason": reason,
        "status": status,
        "created_at": datetime.now(timezone.utc),
        "immutable": True,
    }
    await db.audit_logs.insert_one(log)
    return log
