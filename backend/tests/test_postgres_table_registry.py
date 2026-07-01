import ast
import re
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
INFRASTRUCTURE_ATTRIBUTES = {
    "close",
    "connect",
    "ensure_table",
    "pool",
}


def _startup_tables():
    tree = ast.parse((BACKEND_ROOT / "server.py").read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if not isinstance(node, ast.Assign):
            continue
        if any(isinstance(target, ast.Name) and target.id == "tables" for target in node.targets):
            return set(ast.literal_eval(node.value))
    raise AssertionError("PostgreSQL startup table registry was not found")


def _used_collections():
    collections = set()
    for directory in ("routes", "services"):
        for path in (BACKEND_ROOT / directory).rglob("*.py"):
            source = path.read_text(encoding="utf-8")
            collections.update(re.findall(r"\bdb\.([A-Za-z_][A-Za-z0-9_]*)", source))
    return collections - INFRASTRUCTURE_ATTRIBUTES


def test_every_database_collection_has_a_postgres_table():
    missing = _used_collections() - _startup_tables()
    assert not missing, f"Missing PostgreSQL startup tables: {sorted(missing)}"
