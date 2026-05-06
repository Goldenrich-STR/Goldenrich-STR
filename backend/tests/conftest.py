import pytest


# Enable asyncio mode for tests in this directory only.
def pytest_collection_modifyitems(config, items):
    for item in items:
        if "asyncio" in item.keywords:
            continue
        # don't auto-mark; tests opt-in via @pytest.mark.asyncio
        pass
