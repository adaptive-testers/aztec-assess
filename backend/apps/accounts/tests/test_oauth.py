"""
Comprehensive tests for Google OAuth authentication.

These tests mock Google OAuth API calls to test the authentication flow
without making real requests to Google's servers.
"""

from typing import TYPE_CHECKING, cast
from unittest.mock import Mock, patch

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

if TYPE_CHECKING:
    from apps.accounts.models import User

UserModel = cast("type[User]", get_user_model())

pytestmark = pytest.mark.django_db


# Mock Google OAuth responses
MOCK_GOOGLE_TOKEN_RESPONSE = {
    "access_token": "mock_access_token_12345",
    "expires_in": 3600,
    "refresh_token": "mock_refresh_token",
    "scope": "openid email profile",
    "token_type": "Bearer",
}

MOCK_GOOGLE_USER_INFO = {
    "id": "123456789",
    "email": "testuser@gmail.com",
    "verified_email": True,
    "name": "Test User",
    "given_name": "Test",
    "family_name": "User",
    "picture": "https://example.com/picture.jpg",
}


class TestGoogleOAuthView:
    """Test Google OAuth authentication endpoint."""

    @patch("apps.accounts.views.config")
    @patch("apps.accounts.views.requests.post")
    @patch("apps.accounts.views.requests.get")
    def test_oauth_signup_creates_new_user(self, mock_get, mock_post, mock_config):
        """Test that OAuth sign-up creates a new user with correct data."""
        # Mock config
        mock_config.side_effect = lambda key, default="": {
            "GOOGLE_CLIENT_ID": "test_client_id",
            "GOOGLE_CLIENT_SECRET": "test_secret",
            "GOOGLE_REDIRECT_URI": "http://localhost:5173",
        }.get(key, default)

        # Mock Google token exchange
        mock_token_response = Mock()
        mock_token_response.json.return_value = MOCK_GOOGLE_TOKEN_RESPONSE
        mock_token_response.raise_for_status = Mock()
        mock_post.return_value = mock_token_response

        # Mock Google user info fetch
        mock_user_info_response = Mock()
        mock_user_info_response.json.return_value = MOCK_GOOGLE_USER_INFO
        mock_user_info_response.raise_for_status = Mock()
        mock_get.return_value = mock_user_info_response

        client = APIClient()
        url = reverse("accounts:oauth_google")
        payload = {
            "code": "mock_authorization_code",
            "role": "student",
        }

        response = client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "tokens" in response.data
        assert "access" in response.data["tokens"]
        assert response.data["email"] == "testuser@gmail.com"
        assert response.data["first_name"] == "Test"
        assert response.data["last_name"] == "User"
        assert response.data["role"] == "student"

        # Verify user was created
        user = UserModel.objects.get(email="testuser@gmail.com")
        assert user.oauth_provider == "google"
        assert user.oauth_id == "123456789"
        assert user.is_verified is True
        assert user.first_name == "Test"
        assert user.last_name == "User"

        # Verify refresh token cookie is set
        assert "refresh_token" in response.cookies

    @patch("apps.accounts.views.config")
    @patch("apps.accounts.views.requests.post")
    @patch("apps.accounts.views.requests.get")
    def test_oauth_login_existing_oauth_user(self, mock_get, mock_post, mock_config):
        """Test that OAuth login works for existing OAuth user."""
        # Mock config
        mock_config.side_effect = lambda key, default="": {
            "GOOGLE_CLIENT_ID": "test_client_id",
            "GOOGLE_CLIENT_SECRET": "test_secret",
            "GOOGLE_REDIRECT_URI": "http://localhost:5173",
        }.get(key, default)

        # Create existing OAuth user
        existing_user = UserModel.objects.create_user(
            email="testuser@gmail.com",
            first_name="Existing",
            last_name="User",
            role="student",
            oauth_provider="google",
            oauth_id="123456789",
            password=None,
        )

        # Mock Google token exchange
        mock_token_response = Mock()
        mock_token_response.json.return_value = MOCK_GOOGLE_TOKEN_RESPONSE
        mock_token_response.raise_for_status = Mock()
        mock_post.return_value = mock_token_response

        # Mock Google user info fetch
        mock_user_info_response = Mock()
        mock_user_info_response.json.return_value = MOCK_GOOGLE_USER_INFO
        mock_user_info_response.raise_for_status = Mock()
        mock_get.return_value = mock_user_info_response

        client = APIClient()
        url = reverse("accounts:oauth_google")
        payload = {
            "code": "mock_authorization_code",
            # No role needed for login
        }

        response = client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "tokens" in response.data
        assert response.data["email"] == existing_user.email

        # Verify user was not duplicated
        assert UserModel.objects.filter(email="testuser@gmail.com").count() == 1

    @patch("apps.accounts.views.config")
    @patch("apps.accounts.views.requests.post")
    @patch("apps.accounts.views.requests.get")
    def test_oauth_links_to_existing_email_account(self, mock_get, mock_post, mock_config):
        """Test that OAuth links to existing email/password account."""
        # Mock config
        mock_config.side_effect = lambda key, default="": {
            "GOOGLE_CLIENT_ID": "test_client_id",
            "GOOGLE_CLIENT_SECRET": "test_secret",
            "GOOGLE_REDIRECT_URI": "http://localhost:5173",
        }.get(key, default)

        # Create existing user with email/password (no OAuth)
        existing_user = UserModel.objects.create_user(
            email="testuser@gmail.com",
            password="StrongP@ssw0rd!",
            first_name="Existing",
            last_name="User",
            role="student",
        )
        assert existing_user.oauth_provider == ""
        assert existing_user.oauth_id == ""

        # Mock Google token exchange
        mock_token_response = Mock()
        mock_token_response.json.return_value = MOCK_GOOGLE_TOKEN_RESPONSE
        mock_token_response.raise_for_status = Mock()
        mock_post.return_value = mock_token_response

        # Mock Google user info fetch
        mock_user_info_response = Mock()
        mock_user_info_response.json.return_value = MOCK_GOOGLE_USER_INFO
        mock_user_info_response.raise_for_status = Mock()
        mock_get.return_value = mock_user_info_response

        client = APIClient()
        url = reverse("accounts:oauth_google")
        payload = {
            "code": "mock_authorization_code",
            # Role not required when user already exists
        }

        response = client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "tokens" in response.data

        # Verify OAuth was linked to existing account
        existing_user.refresh_from_db()
        assert existing_user.oauth_provider == "google"
        assert existing_user.oauth_id == "123456789"
        # Original password should still exist
        assert existing_user.check_password("StrongP@ssw0rd!")

        # Verify no duplicate user was created
        assert UserModel.objects.filter(email="testuser@gmail.com").count() == 1

    @patch("apps.accounts.views.config")
    @patch("apps.accounts.views.requests.post")
    @patch("apps.accounts.views.requests.get")
    def test_oauth_signup_requires_role_for_new_user(self, mock_get, mock_post, mock_config):
        """Test that role is required when creating a new user via OAuth."""
        # Mock config
        mock_config.side_effect = lambda key, default="": {
            "GOOGLE_CLIENT_ID": "test_client_id",
            "GOOGLE_CLIENT_SECRET": "test_secret",
            "GOOGLE_REDIRECT_URI": "http://localhost:5173",
        }.get(key, default)

        # Mock Google token exchange
        mock_token_response = Mock()
        mock_token_response.json.return_value = MOCK_GOOGLE_TOKEN_RESPONSE
        mock_token_response.raise_for_status = Mock()
        mock_post.return_value = mock_token_response

        # Mock Google user info fetch
        mock_user_info_response = Mock()
        mock_user_info_response.json.return_value = MOCK_GOOGLE_USER_INFO
        mock_user_info_response.raise_for_status = Mock()
        mock_get.return_value = mock_user_info_response

        client = APIClient()
        url = reverse("accounts:oauth_google")
        payload = {
            "code": "mock_authorization_code",
            # No role provided - should fail for new user
        }

        response = client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "detail" in response.data
        assert "Role is required" in response.data["detail"]

        # Verify no user was created
        assert not UserModel.objects.filter(email="testuser@gmail.com").exists()

    @patch("apps.accounts.views.config")
    @patch("apps.accounts.views.requests.post")
    def test_oauth_rejects_invalid_code(self, mock_post, mock_config):
        """Test that invalid OAuth code is rejected."""
        # Mock config
        mock_config.side_effect = lambda key, default="": {
            "GOOGLE_CLIENT_ID": "test_client_id",
            "GOOGLE_CLIENT_SECRET": "test_secret",
            "GOOGLE_REDIRECT_URI": "http://localhost:5173",
        }.get(key, default)

        # Mock Google token exchange failure
        import requests
        mock_post.side_effect = requests.RequestException("Invalid code")

        client = APIClient()
        url = reverse("accounts:oauth_google")
        payload = {
            "code": "invalid_code",
            "role": "student",
        }

        response = client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "detail" in response.data

    @patch("apps.accounts.views.config")
    def test_oauth_handles_missing_google_credentials(self, mock_config):
        """Test that missing Google OAuth credentials return error."""
        # Mock config with empty credentials
        mock_config.side_effect = lambda key, default="": {
            "GOOGLE_CLIENT_ID": "",
            "GOOGLE_CLIENT_SECRET": "",
            "GOOGLE_REDIRECT_URI": "http://localhost:5173",
        }.get(key, default)

        client = APIClient()
        url = reverse("accounts:oauth_google")
        payload = {
            "code": "mock_code",
            "role": "student",
        }

        response = client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "detail" in response.data
        assert "OAuth service not configured" in response.data["detail"]

    @patch("apps.accounts.views.config")
    @patch("apps.accounts.views.requests.post")
    @patch("apps.accounts.views.requests.get")
    def test_oauth_returns_tokens_on_success(self, mock_get, mock_post, mock_config):
        """Test that OAuth returns JWT tokens on successful authentication."""
        # Mock config
        mock_config.side_effect = lambda key, default="": {
            "GOOGLE_CLIENT_ID": "test_client_id",
            "GOOGLE_CLIENT_SECRET": "test_secret",
            "GOOGLE_REDIRECT_URI": "http://localhost:5173",
        }.get(key, default)

        # Mock Google token exchange
        mock_token_response = Mock()
        mock_token_response.json.return_value = MOCK_GOOGLE_TOKEN_RESPONSE
        mock_token_response.raise_for_status = Mock()
        mock_post.return_value = mock_token_response

        # Mock Google user info fetch
        mock_user_info_response = Mock()
        mock_user_info_response.json.return_value = MOCK_GOOGLE_USER_INFO
        mock_user_info_response.raise_for_status = Mock()
        mock_get.return_value = mock_user_info_response

        client = APIClient()
        url = reverse("accounts:oauth_google")
        payload = {
            "code": "mock_authorization_code",
            "role": "instructor",
        }

        response = client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "tokens" in response.data
        assert "access" in response.data["tokens"]
        assert len(response.data["tokens"]["access"]) > 0  # JWT token should be present

        # Verify refresh token is in cookie
        assert "refresh_token" in response.cookies
        assert response.cookies["refresh_token"].value is not None

    @patch("apps.accounts.views.config")
    @patch("apps.accounts.views.requests.post")
    @patch("apps.accounts.views.requests.get")
    def test_oauth_updates_user_info_on_login(self, mock_get, mock_post, mock_config):
        """Test that OAuth updates user info when logging in."""
        # Mock config
        mock_config.side_effect = lambda key, default="": {
            "GOOGLE_CLIENT_ID": "test_client_id",
            "GOOGLE_CLIENT_SECRET": "test_secret",
            "GOOGLE_REDIRECT_URI": "http://localhost:5173",
        }.get(key, default)

        # Create user with incomplete info
        existing_user = UserModel.objects.create_user(
            email="testuser@gmail.com",
            first_name="Old",
            last_name="Name",
            role="student",
            oauth_provider="google",
            oauth_id="123456789",
            password=None,
            is_verified=False,
        )

        # Mock Google token exchange
        mock_token_response = Mock()
        mock_token_response.json.return_value = MOCK_GOOGLE_TOKEN_RESPONSE
        mock_token_response.raise_for_status = Mock()
        mock_post.return_value = mock_token_response

        # Mock Google user info with updated name
        updated_user_info = MOCK_GOOGLE_USER_INFO.copy()
        updated_user_info["given_name"] = "New"
        updated_user_info["family_name"] = "Name"

        mock_user_info_response = Mock()
        mock_user_info_response.json.return_value = updated_user_info
        mock_user_info_response.raise_for_status = Mock()
        mock_get.return_value = mock_user_info_response

        client = APIClient()
        url = reverse("accounts:oauth_google")
        payload = {
            "code": "mock_authorization_code",
        }

        response = client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK

        # Verify user info was updated
        existing_user.refresh_from_db()
        # Name should be updated if it was missing, but since it exists, it should stay
        # However, is_verified should be updated
        assert existing_user.is_verified is True

    @patch("apps.accounts.views.config")
    @patch("apps.accounts.views.requests.post")
    @patch("apps.accounts.views.requests.get")
    def test_oauth_handles_missing_email_from_google(self, mock_get, mock_post, mock_config):
        """Test that missing email from Google returns error."""
        # Mock config
        mock_config.side_effect = lambda key, default="": {
            "GOOGLE_CLIENT_ID": "test_client_id",
            "GOOGLE_CLIENT_SECRET": "test_secret",
            "GOOGLE_REDIRECT_URI": "http://localhost:5173",
        }.get(key, default)

        # Mock Google token exchange
        mock_token_response = Mock()
        mock_token_response.json.return_value = MOCK_GOOGLE_TOKEN_RESPONSE
        mock_token_response.raise_for_status = Mock()
        mock_post.return_value = mock_token_response

        # Mock Google user info without email
        user_info_no_email = MOCK_GOOGLE_USER_INFO.copy()
        del user_info_no_email["email"]

        mock_user_info_response = Mock()
        mock_user_info_response.json.return_value = user_info_no_email
        mock_user_info_response.raise_for_status = Mock()
        mock_get.return_value = mock_user_info_response

        client = APIClient()
        url = reverse("accounts:oauth_google")
        payload = {
            "code": "mock_authorization_code",
            "role": "student",
        }

        response = client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "detail" in response.data
        assert "Email not provided" in response.data["detail"]

    @patch("apps.accounts.views.config")
    @patch("apps.accounts.views.requests.post")
    @patch("apps.accounts.views.requests.get")
    def test_oauth_handles_inactive_user(self, mock_get, mock_post, mock_config):
        """Test that inactive users cannot authenticate via OAuth."""
        # Mock config
        mock_config.side_effect = lambda key, default="": {
            "GOOGLE_CLIENT_ID": "test_client_id",
            "GOOGLE_CLIENT_SECRET": "test_secret",
            "GOOGLE_REDIRECT_URI": "http://localhost:5173",
        }.get(key, default)

        # Create inactive user
        UserModel.objects.create_user(
            email="testuser@gmail.com",
            first_name="Inactive",
            last_name="User",
            role="student",
            oauth_provider="google",
            oauth_id="123456789",
            password=None,
            is_active=False,
        )

        # Mock Google token exchange
        mock_token_response = Mock()
        mock_token_response.json.return_value = MOCK_GOOGLE_TOKEN_RESPONSE
        mock_token_response.raise_for_status = Mock()
        mock_post.return_value = mock_token_response

        # Mock Google user info fetch
        mock_user_info_response = Mock()
        mock_user_info_response.json.return_value = MOCK_GOOGLE_USER_INFO
        mock_user_info_response.raise_for_status = Mock()
        mock_get.return_value = mock_user_info_response

        client = APIClient()
        url = reverse("accounts:oauth_google")
        payload = {
            "code": "mock_authorization_code",
        }

        response = client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "detail" in response.data
        assert "inactive" in response.data["detail"].lower()

    @patch("apps.accounts.views.config")
    @patch("apps.accounts.views.requests.post")
    @patch("apps.accounts.views.requests.get")
    def test_oauth_handles_missing_name_from_google(self, mock_get, mock_post, mock_config):
        """Test that OAuth handles missing name fields from Google."""
        # Mock config
        mock_config.side_effect = lambda key, default="": {
            "GOOGLE_CLIENT_ID": "test_client_id",
            "GOOGLE_CLIENT_SECRET": "test_secret",
            "GOOGLE_REDIRECT_URI": "http://localhost:5173",
        }.get(key, default)

        # Mock Google token exchange
        mock_token_response = Mock()
        mock_token_response.json.return_value = MOCK_GOOGLE_TOKEN_RESPONSE
        mock_token_response.raise_for_status = Mock()
        mock_post.return_value = mock_token_response

        # Mock Google user info without name
        user_info_no_name = {
            "id": "123456789",
            "email": "testuser@gmail.com",
            "verified_email": True,
        }

        mock_user_info_response = Mock()
        mock_user_info_response.json.return_value = user_info_no_name
        mock_user_info_response.raise_for_status = Mock()
        mock_get.return_value = mock_user_info_response

        client = APIClient()
        url = reverse("accounts:oauth_google")
        payload = {
            "code": "mock_authorization_code",
            "role": "student",
        }

        response = client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        # Should use email prefix as fallback for first name
        user = UserModel.objects.get(email="testuser@gmail.com")
        assert user.first_name == "testuser"  # Email prefix
        assert user.last_name == ""  # Empty string

    @patch("apps.accounts.views.config")
    @patch("apps.accounts.views.requests.post")
    @patch("apps.accounts.views.requests.get")
    def test_oauth_validates_role(self, mock_get, mock_post, mock_config):
        """Test that OAuth validates role is a valid choice."""
        # Mock config
        mock_config.side_effect = lambda key, default="": {
            "GOOGLE_CLIENT_ID": "test_client_id",
            "GOOGLE_CLIENT_SECRET": "test_secret",
            "GOOGLE_REDIRECT_URI": "http://localhost:5173",
        }.get(key, default)

        # Mock Google token exchange
        mock_token_response = Mock()
        mock_token_response.json.return_value = MOCK_GOOGLE_TOKEN_RESPONSE
        mock_token_response.raise_for_status = Mock()
        mock_post.return_value = mock_token_response

        # Mock Google user info fetch
        mock_user_info_response = Mock()
        mock_user_info_response.json.return_value = MOCK_GOOGLE_USER_INFO
        mock_user_info_response.raise_for_status = Mock()
        mock_get.return_value = mock_user_info_response

        client = APIClient()
        url = reverse("accounts:oauth_google")
        payload = {
            "code": "mock_authorization_code",
            "role": "invalid_role",
        }

        response = client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "role" in response.data

    @patch("apps.accounts.views.config")
    @patch("apps.accounts.views.requests.post")
    def test_oauth_handles_google_api_failure(self, mock_post, mock_config):
        """Test that OAuth handles Google API failures gracefully."""
        # Mock config
        mock_config.side_effect = lambda key, default="": {
            "GOOGLE_CLIENT_ID": "test_client_id",
            "GOOGLE_CLIENT_SECRET": "test_secret",
            "GOOGLE_REDIRECT_URI": "http://localhost:5173",
        }.get(key, default)

        # Mock Google token exchange failure
        import requests

        mock_post.side_effect = requests.RequestException("Google API error")

        client = APIClient()
        url = reverse("accounts:oauth_google")
        payload = {
            "code": "mock_authorization_code",
            "role": "student",
        }

        response = client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "detail" in response.data

    @patch("apps.accounts.views.config")
    @patch("apps.accounts.views.requests.post")
    @patch("apps.accounts.views.requests.get")
    def test_oauth_handles_missing_google_id(self, mock_get, mock_post, mock_config):
        """Test that missing Google ID from user info returns error."""
        # Mock config
        mock_config.side_effect = lambda key, default="": {
            "GOOGLE_CLIENT_ID": "test_client_id",
            "GOOGLE_CLIENT_SECRET": "test_secret",
            "GOOGLE_REDIRECT_URI": "http://localhost:5173",
        }.get(key, default)

        # Mock Google token exchange
        mock_token_response = Mock()
        mock_token_response.json.return_value = MOCK_GOOGLE_TOKEN_RESPONSE
        mock_token_response.raise_for_status = Mock()
        mock_post.return_value = mock_token_response

        # Mock Google user info without ID
        user_info_no_id = MOCK_GOOGLE_USER_INFO.copy()
        del user_info_no_id["id"]

        mock_user_info_response = Mock()
        mock_user_info_response.json.return_value = user_info_no_id
        mock_user_info_response.raise_for_status = Mock()
        mock_get.return_value = mock_user_info_response

        client = APIClient()
        url = reverse("accounts:oauth_google")
        payload = {
            "code": "mock_authorization_code",
            "role": "student",
        }

        response = client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "detail" in response.data
        assert "Google ID not provided" in response.data["detail"]

    @patch("apps.accounts.views.config")
    @patch("apps.accounts.views.requests.post")
    @patch("apps.accounts.views.requests.get")
    def test_oauth_handles_user_info_fetch_failure(self, mock_get, mock_post, mock_config):
        """Test that failure to fetch user info from Google returns error."""
        # Mock config
        mock_config.side_effect = lambda key, default="": {
            "GOOGLE_CLIENT_ID": "test_client_id",
            "GOOGLE_CLIENT_SECRET": "test_secret",
            "GOOGLE_REDIRECT_URI": "http://localhost:5173",
        }.get(key, default)

        # Mock Google token exchange success
        mock_token_response = Mock()
        mock_token_response.json.return_value = MOCK_GOOGLE_TOKEN_RESPONSE
        mock_token_response.raise_for_status = Mock()
        mock_post.return_value = mock_token_response

        # Mock Google user info fetch failure
        import requests
        mock_get.side_effect = requests.RequestException("Failed to fetch user info")

        client = APIClient()
        url = reverse("accounts:oauth_google")
        payload = {
            "code": "mock_authorization_code",
            "role": "student",
        }

        response = client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "detail" in response.data
        assert "Failed to fetch user information" in response.data["detail"]

    @patch("apps.accounts.views.config")
    @patch("apps.accounts.views.requests.post")
    def test_oauth_handles_token_exchange_missing_access_token(self, mock_post, mock_config):
        """Test that missing access token in token exchange response returns error."""
        # Mock config
        mock_config.side_effect = lambda key, default="": {
            "GOOGLE_CLIENT_ID": "test_client_id",
            "GOOGLE_CLIENT_SECRET": "test_secret",
            "GOOGLE_REDIRECT_URI": "http://localhost:5173",
        }.get(key, default)

        # Mock Google token exchange without access_token
        token_response_no_access = MOCK_GOOGLE_TOKEN_RESPONSE.copy()
        del token_response_no_access["access_token"]

        mock_token_response = Mock()
        mock_token_response.json.return_value = token_response_no_access
        mock_token_response.raise_for_status = Mock()
        mock_post.return_value = mock_token_response

        client = APIClient()
        url = reverse("accounts:oauth_google")
        payload = {
            "code": "mock_authorization_code",
            "role": "student",
        }

        response = client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "detail" in response.data
        assert "Invalid OAuth code" in response.data["detail"]

