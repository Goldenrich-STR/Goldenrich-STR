from production_launch_cleanup import (
    PROTECTED_TABLES,
    TRANSACTION_TABLES,
    cleanup_tables,
)


def test_default_cleanup_only_targets_transactional_data():
    selected = set(cleanup_tables())
    assert selected == set(TRANSACTION_TABLES)
    assert selected.isdisjoint(PROTECTED_TABLES)
    assert "notifications" not in selected
    assert "search_logs" not in selected


def test_optional_launch_data_is_explicit():
    selected = set(cleanup_tables(
        include_notifications=True,
        include_analytics=True,
    ))
    assert {"notifications", "search_logs", "calendar_sync_logs"} <= selected
    assert selected.isdisjoint(PROTECTED_TABLES)
