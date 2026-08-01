from datetime import datetime, timezone
from uuid import uuid4


STANDARD_MODULES = [
    "executive_dashboard",
    "user_organization_management",
    "roles_access_permissions",
    "reporting_hierarchy",
    "escalation_sla_matrix",
    "audit_activity_logs",
    "departments",
    "host_management",
    "property_operations",
    "subscription_management",
    "booking_operations",
    "finance_settlements",
    "sales_crm",
    "marketing_cms",
    "communication_center",
    "support_ticket_management",
    "approval_center",
    "reports_analytics",
    "platform_settings",
]

STANDARD_ACTIONS = [
    "view",
    "create",
    "edit",
    "approve",
    "reject",
    "assign",
    "export",
    "delete",
    "manage_settings",
    "view_financial_data",
    "view_sensitive_data",
    "manage_permissions",
]

STANDARD_ROLES = [
    ("super_admin", "Super Admin", "global"),
    ("business_admin", "Business Admin", "global"),
    ("operations_admin", "Operations Admin", "branch"),
    ("finance_admin", "Finance Admin", "global"),
    ("property_admin", "Property Admin", "state"),
    ("support_admin", "Support Admin", "department"),
    ("cms_admin", "CMS Admin", "global"),
    ("branch_admin", "Branch Admin", "branch"),
    ("franchise_admin", "Franchise Admin", "franchise"),
    ("department_head", "Department Head", "department"),
    ("branch_manager", "Branch Manager", "branch"),
    ("team_leader", "Team Leader", "full_team"),
    ("rm", "RM", "assigned_records"),
    ("broker", "Broker", "self"),
    ("telecaller", "Telecaller", "assigned_records"),
    ("employee", "Employee", "self"),
    ("host", "Host", "self"),
    ("guest", "Guest", "self"),
]


async def ensure_default_permissions(db):
    now = datetime.now(timezone.utc)
    for module in STANDARD_MODULES:
        for action in STANDARD_ACTIONS:
            key = f"{module}.{action}"
            existing = await db.permissions.find_one({"permission_key": key})
            if not existing:
                await db.permissions.insert_one({
                    "permission_id": f"perm_{uuid4().hex[:12]}",
                    "permission_key": key,
                    "module": module,
                    "action": action,
                    "description": f"{action.replace('_', ' ').title()} {module.replace('_', ' ').title()}",
                    "created_at": now,
                    "updated_at": now,
                })


async def user_can(current_user: dict, permission_key: str) -> bool:
    if current_user.get("role") == "admin":
        return True
    permissions = current_user.get("permissions") or current_user.get("access_controls") or []
    return permission_key in permissions
