import pytest
from django.test import override_settings

from adaptive_testing.urls import build_urlpatterns

pytestmark = pytest.mark.django_db


def _routes_from(patterns: list) -> set[str]:
    return {str(pattern.pattern) for pattern in patterns}


@override_settings(ENABLE_DJANGO_ADMIN=False, ENABLE_API_DOCS=False)
def test_sensitive_routes_excluded_when_flags_disabled() -> None:
    routes = _routes_from(build_urlpatterns())

    assert "admin/" not in routes
    assert "api/schema/" not in routes
    assert "api/docs/" not in routes


@override_settings(ENABLE_DJANGO_ADMIN=True, ENABLE_API_DOCS=True)
def test_sensitive_routes_included_when_flags_enabled() -> None:
    routes = _routes_from(build_urlpatterns())

    assert "admin/" in routes
    assert "api/schema/" in routes
    assert "api/docs/" in routes
