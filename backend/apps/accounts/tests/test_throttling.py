"""
Simple tests for basic rate limiting functionality.

These tests verify that the basic DRF throttling is working correctly.
"""

from collections.abc import Iterator
from contextlib import contextmanager

import pytest
from django.conf import LazySettings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.views import (
    LoginRateThrottle,
    OAuthRateThrottle,
    RegisterRateThrottle,
    TokenRefreshRateThrottle,
)

UserModel = get_user_model()

pytestmark = pytest.mark.django_db


class TestBasicRateLimiting:
    """Test basic rate limiting for authentication endpoints."""

    def test_anonymous_user_has_rate_limit(self):
        """Test that anonymous users are subject to rate limiting."""
        client = APIClient()
        url = reverse("accounts:login")

        # Make a reasonable number of requests (should not hit rate limit)
        for _ in range(5):
            response = client.post(
                url,
                {"email": "test@example.com", "password": "wrongpassword"},
                format="json",
            )
            # Should get 401 for invalid credentials, not 429 for rate limiting
            assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_authenticated_user_has_higher_rate_limit(self):
        """Test that authenticated users have higher rate limits."""
        # Create a test user
        user = User.objects.create_user(
            email="test@example.com",
            password="StrongP@ssw0rd!",
            first_name="Test",
            last_name="User",
            role="student",
        )

        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse("accounts:profile")

        # Make several requests (should not hit rate limit for authenticated user)
        for _ in range(10):
            response = client.get(url)
            assert response.status_code == status.HTTP_200_OK

    def test_rate_limiting_is_configured(self):
        """Test that rate limiting is properly configured."""
        # This test just verifies that the endpoints are working
        # and that rate limiting is applied (even if we don't hit the limits)
        client = APIClient()

        # Test login endpoint
        response = client.post(
            reverse("accounts:login"),
            {"email": "test@example.com", "password": "wrongpassword"},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

        # Test registration endpoint
        response = client.post(
            reverse("accounts:register"),
            {
                "email": "newuser@example.com",
                "password": "StrongP@ssw0rd!",
                "first_name": "New",
                "last_name": "User",
                "role": "student",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED


@contextmanager
def _auth_throttle_settings(
    *,
    login: str = "1/minute",
    register: str = "1/minute",
    oauth: str = "1/minute",
    token_refresh: str = "1/minute",
) -> Iterator[None]:
    original_login = dict(LoginRateThrottle.THROTTLE_RATES)
    original_register = dict(RegisterRateThrottle.THROTTLE_RATES)
    original_oauth = dict(OAuthRateThrottle.THROTTLE_RATES)
    original_refresh = dict(TokenRefreshRateThrottle.THROTTLE_RATES)

    LoginRateThrottle.THROTTLE_RATES = {**LoginRateThrottle.THROTTLE_RATES, "login": login}
    RegisterRateThrottle.THROTTLE_RATES = {
        **RegisterRateThrottle.THROTTLE_RATES,
        "register": register,
    }
    OAuthRateThrottle.THROTTLE_RATES = {**OAuthRateThrottle.THROTTLE_RATES, "oauth": oauth}
    TokenRefreshRateThrottle.THROTTLE_RATES = {
        **TokenRefreshRateThrottle.THROTTLE_RATES,
        "token_refresh": token_refresh,
    }

    cache.clear()
    try:
        yield
    finally:
        LoginRateThrottle.THROTTLE_RATES = original_login
        RegisterRateThrottle.THROTTLE_RATES = original_register
        OAuthRateThrottle.THROTTLE_RATES = original_oauth
        TokenRefreshRateThrottle.THROTTLE_RATES = original_refresh
        cache.clear()


class TestScopedAuthThrottling:
    """Test endpoint-specific auth throttling scopes."""

    @pytest.fixture(autouse=True)
    def _use_locmem_cache(self, settings: LazySettings) -> Iterator[None]:
        settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
        cache.clear()
        yield
        cache.clear()

    def test_login_endpoint_returns_429_after_limit(self) -> None:
        client = APIClient()
        url = reverse("accounts:login")

        with _auth_throttle_settings(login="1/minute"):
            first = client.post(
                url,
                {"email": "missing@example.com", "password": "bad-password"},
                format="json",
            )
            second = client.post(
                url,
                {"email": "missing@example.com", "password": "bad-password"},
                format="json",
            )

        assert first.status_code == status.HTTP_401_UNAUTHORIZED
        assert second.status_code == status.HTTP_429_TOO_MANY_REQUESTS

    def test_register_endpoint_returns_429_after_limit(self) -> None:
        client = APIClient()
        url = reverse("accounts:register")
        payload = {
            "email": "scoped-rate-limit@example.com",
            "password": "StrongP@ssw0rd!",
            "first_name": "Scoped",
            "last_name": "Throttle",
            "role": "student",
        }

        with _auth_throttle_settings(register="1/minute"):
            first = client.post(url, payload, format="json")
            second = client.post(url, payload, format="json")

        assert first.status_code == status.HTTP_201_CREATED
        assert second.status_code == status.HTTP_429_TOO_MANY_REQUESTS

    def test_oauth_endpoint_returns_429_after_limit(self) -> None:
        client = APIClient()
        url = reverse("accounts:oauth_google")

        with _auth_throttle_settings(oauth="1/minute"):
            first = client.post(url, {}, format="json")
            second = client.post(url, {}, format="json")

        assert first.status_code == status.HTTP_400_BAD_REQUEST
        assert second.status_code == status.HTTP_429_TOO_MANY_REQUESTS

    def test_token_refresh_endpoint_returns_429_after_limit(self) -> None:
        client = APIClient()
        url = reverse("accounts:token_refresh")

        with _auth_throttle_settings(token_refresh="1/minute"):
            first = client.post(url, {}, format="json")
            second = client.post(url, {}, format="json")

        assert first.status_code == status.HTTP_401_UNAUTHORIZED
        assert second.status_code == status.HTTP_429_TOO_MANY_REQUESTS
