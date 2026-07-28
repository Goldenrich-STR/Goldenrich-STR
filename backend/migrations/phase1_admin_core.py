import asyncio
from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT_DIR))

from dotenv import load_dotenv
load_dotenv(ROOT_DIR / ".env")

from server import db_instance
from services.permission_service import ensure_default_permissions


PHASE1_TABLES = [
    "roles",
    "permissions",
    "role_permissions",
    "user_permissions",
    "departments",
    "business_divisions",
    "branches",
    "franchises",
    "teams",
    "reporting_relations",
    "reporting_history",
    "escalation_rules",
    "sla_policies",
    "escalation_instances",
    "notification_rules",
    "property_status_history",
    "audit_logs",
]


async def run():
    if hasattr(db_instance, "connect"):
        await db_instance.connect()
    if hasattr(db_instance, "ensure_table"):
        for table in PHASE1_TABLES:
            await db_instance.ensure_table(table)
    await ensure_default_permissions(db_instance)
    if hasattr(db_instance, "close"):
        await db_instance.close()


if __name__ == "__main__":
    asyncio.run(run())
