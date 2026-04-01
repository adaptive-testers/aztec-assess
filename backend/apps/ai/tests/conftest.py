"""Shared fixtures for AI app tests."""

from __future__ import annotations

from collections.abc import Generator  # noqa: TC003

import pytest


@pytest.fixture(autouse=True)
def reset_gemini_client_config() -> Generator[None, None, None]:
    """Avoid cross-test leakage of Gemini client configuration."""
    import apps.ai.services.gemini_client as gc

    gc._client_configured = False
    yield
    gc._client_configured = False
