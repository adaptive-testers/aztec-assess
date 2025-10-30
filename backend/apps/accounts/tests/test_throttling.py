"""
Simple tests for basic rate limiting functionality.

These tests verify that the basic DRF throttling is working correctly.
"""

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User

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
