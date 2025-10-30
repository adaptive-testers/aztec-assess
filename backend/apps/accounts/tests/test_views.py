from typing import TYPE_CHECKING, cast

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

if TYPE_CHECKING:
    from apps.accounts.models import User

UserModel = cast("type[User]", get_user_model())

pytestmark = pytest.mark.django_db


# =========================
# Registration View Tests
# =========================
class TestUserRegistrationView:
    def test_register_success_creates_user(self):
        client = APIClient()
        url = reverse("accounts:register")
        payload = {
            "email": "newuser@example.com",
            "password": "StrongP@ssw0rd!",
            "first_name": "New",
            "last_name": "User",
            "role": "student",  # valid: admin | instructor | student
        }
        resp = client.post(url, payload, format="json")
        assert resp.status_code in (status.HTTP_201_CREATED, status.HTTP_200_OK)

        assert UserModel.objects.filter(email="newuser@example.com").exists()

    def test_register_duplicate_email_returns_400(self):
        UserModel.objects.create_user(
            email="taken@example.com",
            password="abc12345",
            first_name="T",
            last_name="A",
            role="student",
        )

        client = APIClient()
        url = reverse("accounts:register")
        payload = {
            "email": "taken@example.com",
            "password": "Another$trong123",
            "first_name": "New",
            "last_name": "User",
            "role": "student",
        }
        resp = client.post(url, payload, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_returns_tokens_on_success(self):
        client = APIClient()
        url = reverse("accounts:register")
        payload = {
            "email": "tokentest@example.com",
            "password": "StrongP@ssw0rd!",
            "first_name": "Tok",
            "last_name": "En",
            "role": "student",
        }
        resp = client.post(url, payload, format="json")
        assert resp.status_code in (status.HTTP_201_CREATED, status.HTTP_200_OK)
        assert "tokens" in resp.data
        assert "access" in resp.data["tokens"]
        # Refresh token is now in cookie, not in response body
        assert "refresh_token" in resp.cookies

    def test_register_rejects_weak_password(self):
        client = APIClient()
        url = reverse("accounts:register")
        payload = {
            "email": "weakpass@example.com",
            "password": "123",  # rejected by validators
            "first_name": "Weak",
            "last_name": "Pass",
            "role": "student",
        }
        resp = client.post(url, payload, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "password" in resp.data

    def test_register_rejects_invalid_role(self):
        client = APIClient()
        url = reverse("accounts:register")
        payload = {
            "email": "badrole@example.com",
            "password": "StrongP@ssw0rd!",
            "first_name": "Bad",
            "last_name": "Role",
            "role": "not_a_role",
        }
        resp = client.post(url, payload, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "role" in resp.data

    def test_register_missing_required_fields(self):
        client = APIClient()
        url = reverse("accounts:register")
        resp = client.post(url, {}, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        for field in ("email", "first_name", "last_name", "password"):
            assert field in resp.data

    def test_register_email_normalized_lowercase(self):
        client = APIClient()
        url = reverse("accounts:register")
        payload = {
            "email": "  NEWUSER@EXAMPLE.COM ",
            "password": "StrongP@ssw0rd!",
            "first_name": "New",
            "last_name": "User",
            "role": "student",
        }
        resp = client.post(url, payload, format="json")
        assert resp.status_code in (status.HTTP_201_CREATED, status.HTTP_200_OK)

        assert UserModel.objects.filter(email="newuser@example.com").exists()

    def test_register_invalid_email_format(self):
        client = APIClient()
        url = reverse("accounts:register")
        payload = {
            "email": "not-an-email",
            "password": "StrongP@ssw0rd!",
            "first_name": "Bad",
            "last_name": "Email",
            "role": "student",
        }
        resp = client.post(url, payload, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in resp.data


# =========================
# Login View Tests (8)
# =========================
class TestUserLoginView:
    # ---------- SUCCESS (4) ----------
    def test_login_success_returns_tokens_and_profile(self):
        user = UserModel.objects.create_user(
            email="loginok@example.com",
            password="StrongP@ssw0rd!",
            first_name="Log",
            last_name="In",
            role="student",
        )
        client = APIClient()
        url = reverse("accounts:login")
        resp = client.post(
            url,
            {"email": "loginok@example.com", "password": "StrongP@ssw0rd!"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["email"] == user.email
        assert "tokens" in resp.data
        assert "access" in resp.data["tokens"]
        # Refresh token is now in cookie, not in response body
        assert "refresh_token" in resp.cookies

    def test_login_success_with_email_normalization_spaces_and_case(self):
        UserModel.objects.create_user(
            email="normalize@example.com",
            password="StrongP@ssw0rd!",
            first_name="Norm",
            last_name="Alize",
            role="student",
        )
        client = APIClient()
        url = reverse("accounts:login")
        resp = client.post(
            url,
            {"email": "   NORMALIZE@EXAMPLE.COM   ", "password": "StrongP@ssw0rd!"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK

    def test_login_success_case_insensitive_email(self):
        UserModel.objects.create_user(
            email="mixcase@example.com",
            password="StrongP@ssw0rd!",
            first_name="Mix",
            last_name="Case",
            role="instructor",
        )
        client = APIClient()
        url = reverse("accounts:login")
        resp = client.post(
            url,
            {"email": "MixCase@Example.com", "password": "StrongP@ssw0rd!"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        for k in ("email", "first_name", "last_name", "role", "tokens"):
            assert k in resp.data

    def test_login_success_returns_expected_token_fields(self):
        UserModel.objects.create_user(
            email="tokencheck@example.com",
            password="StrongP@ssw0rd!",
            first_name="Tok",
            last_name="Check",
            role="admin",
        )
        client = APIClient()
        url = reverse("accounts:login")
        resp = client.post(
            url,
            {"email": "tokencheck@example.com", "password": "StrongP@ssw0rd!"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        # Only access token in response body, refresh token in cookie
        assert set(resp.data["tokens"].keys()) == {"access"}
        assert "refresh_token" in resp.cookies

    # ---------- FAILURE (4) ----------
    def test_login_rejects_invalid_password(self):
        UserModel.objects.create_user(
            email="badpass@example.com",
            password="GoodPass123!",
            first_name="Bad",
            last_name="Cred",
            role="student",
        )
        client = APIClient()
        url = reverse("accounts:login")
        resp = client.post(
            url,
            {"email": "badpass@example.com", "password": "wrong"},
            format="json",
        )
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_400_BAD_REQUEST)
        assert "detail" in resp.data  # "Invalid credentials."

    def test_login_missing_both_fields(self):
        client = APIClient()
        url = reverse("accounts:login")
        resp = client.post(url, {}, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in resp.data and "password" in resp.data

    def test_login_missing_email_only(self):
        client = APIClient()
        url = reverse("accounts:login")
        resp = client.post(url, {"password": "whatever"}, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in resp.data

    def test_login_inactive_user_forbidden(self):
        user = UserModel.objects.create_user(
            email="inactive@example.com",
            password="StrongP@ssw0rd!",
            first_name="Ina",
            last_name="Ctive",
            role="student",
        )
        user.is_active = False
        user.save(update_fields=["is_active"])

        client = APIClient()
        url = reverse("accounts:login")
        resp = client.post(
            url,
            {"email": "inactive@example.com", "password": "StrongP@ssw0rd!"},
            format="json",
        )
        assert resp.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED)


# =========================
# Cookie-Based Auth Tests
# =========================
class TestCookieBasedAuthentication:
    """Test cookie-based authentication flow."""

    def test_login_sets_refresh_cookie(self):
        """Test that login sets a secure refresh token cookie."""
        UserModel.objects.create_user(
            email="cookieuser@example.com",
            password="StrongP@ssw0rd!",
            first_name="Cookie",
            last_name="User",
            role="student",
        )

        client = APIClient()
        url = reverse("accounts:login")
        response = client.post(
            url,
            {"email": "cookieuser@example.com", "password": "StrongP@ssw0rd!"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert "refresh_token" in response.cookies
        assert response.cookies["refresh_token"].value is not None
        assert response.cookies["refresh_token"]["httponly"] is True
        assert response.cookies["refresh_token"]["samesite"] == "Lax"

    def test_login_cookie_security_settings(self):
        """Test that refresh token cookie has proper security settings."""
        UserModel.objects.create_user(
            email="security@example.com",
            password="StrongP@ssw0rd!",
            first_name="Security",
            last_name="Test",
            role="student",
        )

        client = APIClient()
        url = reverse("accounts:login")
        response = client.post(
            url,
            {"email": "security@example.com", "password": "StrongP@ssw0rd!"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK

        cookie = response.cookies["refresh_token"]
        assert cookie["httponly"] is True  # Prevents XSS
        assert cookie["samesite"] == "Lax"  # CSRF protection
        assert cookie["path"] == "/api/auth/"  # Limited scope

    def test_token_refresh_with_cookie(self):
        """Test token refresh using cookie-based refresh token."""
        UserModel.objects.create_user(
            email="refresh@example.com",
            password="StrongP@ssw0rd!",
            first_name="Refresh",
            last_name="User",
            role="student",
        )

        # First login to get refresh token cookie
        client = APIClient()
        login_url = reverse("accounts:login")
        login_response = client.post(
            login_url,
            {"email": "refresh@example.com", "password": "StrongP@ssw0rd!"},
            format="json",
        )

        assert login_response.status_code == status.HTTP_200_OK
        refresh_cookie = login_response.cookies["refresh_token"].value

        # Now test token refresh
        refresh_url = reverse("accounts:token_refresh")
        refresh_response = client.post(
            refresh_url,
            {},
            format="json",
            HTTP_COOKIE=f"refresh_token={refresh_cookie}",
        )

        assert refresh_response.status_code == status.HTTP_200_OK
        assert "tokens" in refresh_response.data
        assert "access" in refresh_response.data["tokens"]

    def test_token_refresh_without_cookie_fails(self):
        """Test that token refresh fails without refresh token cookie."""
        client = APIClient()
        url = reverse("accounts:token_refresh")
        response = client.post(url, {}, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "detail" in response.data
        assert "Missing refresh token" in response.data["detail"]

    def test_logout_blacklists_token(self):
        """Test that logout blacklists the refresh token."""

        UserModel.objects.create_user(
            email="logout@example.com",
            password="StrongP@ssw0rd!",
            first_name="Logout",
            last_name="User",
            role="student",
        )

        # Login to get refresh token
        client = APIClient()
        login_url = reverse("accounts:login")
        login_response = client.post(
            login_url,
            {"email": "logout@example.com", "password": "StrongP@ssw0rd!"},
            format="json",
        )

        assert login_response.status_code == status.HTTP_200_OK
        refresh_cookie = login_response.cookies["refresh_token"].value

        # We'll test blacklisting by attempting to use the token for refresh

        # Logout
        logout_url = reverse("accounts:logout")
        logout_response = client.post(
            logout_url,
            {},
            format="json",
            HTTP_COOKIE=f"refresh_token={refresh_cookie}",
        )

        assert logout_response.status_code == status.HTTP_200_OK
        assert "detail" in logout_response.data
        assert "Logged out" in logout_response.data["detail"]

        # Verify token is blacklisted by trying to use it for refresh
        # This should fail if the token is blacklisted
        refresh_url = reverse("accounts:token_refresh")
        test_response = client.post(
            refresh_url,
            {},
            format="json",
            HTTP_COOKIE=f"refresh_token={refresh_cookie}",
        )
        assert test_response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_logout_clears_cookie(self):
        """Test that logout clears the refresh token cookie."""
        UserModel.objects.create_user(
            email="clearcookie@example.com",
            password="StrongP@ssw0rd!",
            first_name="Clear",
            last_name="Cookie",
            role="student",
        )

        # Login to get refresh token cookie
        client = APIClient()
        login_url = reverse("accounts:login")
        login_response = client.post(
            login_url,
            {"email": "clearcookie@example.com", "password": "StrongP@ssw0rd!"},
            format="json",
        )

        assert login_response.status_code == status.HTTP_200_OK

        # Logout
        logout_url = reverse("accounts:logout")
        logout_response = client.post(logout_url, {}, format="json")

        assert logout_response.status_code == status.HTTP_200_OK

        # Check that cookie is cleared
        assert "refresh_token" in logout_response.cookies
        cookie = logout_response.cookies["refresh_token"]
        assert cookie.value == ""  # Cookie is cleared

    def test_blacklisted_token_cannot_refresh(self):
        """Test that blacklisted tokens cannot be used for refresh."""
        UserModel.objects.create_user(
            email="blacklist@example.com",
            password="StrongP@ssw0rd!",
            first_name="Blacklist",
            last_name="Test",
            role="student",
        )

        # Login to get refresh token
        client = APIClient()
        login_url = reverse("accounts:login")
        login_response = client.post(
            login_url,
            {"email": "blacklist@example.com", "password": "StrongP@ssw0rd!"},
            format="json",
        )

        assert login_response.status_code == status.HTTP_200_OK
        refresh_cookie = login_response.cookies["refresh_token"].value

        # Logout to blacklist the token
        logout_url = reverse("accounts:logout")
        logout_response = client.post(
            logout_url,
            {},
            format="json",
            HTTP_COOKIE=f"refresh_token={refresh_cookie}",
        )

        assert logout_response.status_code == status.HTTP_200_OK

        # Try to use blacklisted token for refresh
        refresh_url = reverse("accounts:token_refresh")
        refresh_response = client.post(
            refresh_url,
            {},
            format="json",
            HTTP_COOKIE=f"refresh_token={refresh_cookie}",
        )

        assert refresh_response.status_code == status.HTTP_401_UNAUTHORIZED


# =========================
# Profile View Tests
# =========================
class TestUserProfileView:
    """Test user profile endpoint functionality."""

    def test_get_profile_success(self):
        """Test that authenticated user can retrieve their profile."""
        user = UserModel.objects.create_user(
            email="profile@example.com",
            password="StrongP@ssw0rd!",
            first_name="Profile",
            last_name="User",
            role="student",
        )

        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse("accounts:profile")
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == user.email
        assert response.data["first_name"] == user.first_name
        assert response.data["last_name"] == user.last_name
        assert response.data["role"] == user.role
        assert "created_at" in response.data

    def test_get_profile_unauthorized(self):
        """Test that unauthenticated user cannot access profile."""
        client = APIClient()
        url = reverse("accounts:profile")
        response = client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_patch_profile_success(self):
        """Test that user can update their profile."""
        user = UserModel.objects.create_user(
            email="update@example.com",
            password="StrongP@ssw0rd!",
            first_name="Original",
            last_name="Name",
            role="student",
        )

        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse("accounts:profile")
        update_data = {
            "first_name": "Updated",
            "last_name": "Name",
        }
        response = client.patch(url, update_data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["first_name"] == "Updated"
        assert response.data["last_name"] == "Name"

        # Verify the user was actually updated
        user.refresh_from_db()
        assert user.first_name == "Updated"
        assert user.last_name == "Name"

    def test_patch_profile_validation_errors(self):
        """Test that profile update validates input properly."""
        user = UserModel.objects.create_user(
            email="validation@example.com",
            password="StrongP@ssw0rd!",
            first_name="Test",
            last_name="User",
            role="student",
        )

        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse("accounts:profile")

        # Test empty first name
        update_data = {"first_name": "   "}
        response = client.patch(url, update_data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "first_name" in response.data

        # Test empty last name
        update_data = {"last_name": ""}
        response = client.patch(url, update_data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "last_name" in response.data

    def test_patch_profile_readonly_fields(self):
        """Test that readonly fields cannot be updated."""
        user = UserModel.objects.create_user(
            email="readonly@example.com",
            password="StrongP@ssw0rd!",
            first_name="Test",
            last_name="User",
            role="student",
        )

        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse("accounts:profile")

        # Try to update readonly fields
        update_data = {
            "email": "hacker@example.com",
            "role": "admin",
            "created_at": "2020-01-01T00:00:00Z",
        }
        response = client.patch(url, update_data, format="json")

        # Should succeed but readonly fields should be ignored
        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == user.email  # Should remain unchanged
        assert response.data["role"] == user.role     # Should remain unchanged

    def test_patch_profile_unauthorized(self):
        """Test that unauthenticated user cannot update profile."""
        client = APIClient()
        url = reverse("accounts:profile")
        update_data = {"first_name": "Hacker"}
        response = client.patch(url, update_data, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_patch_profile_partial_update(self):
        """Test that partial updates work correctly."""
        user = UserModel.objects.create_user(
            email="partial@example.com",
            password="StrongP@ssw0rd!",
            first_name="Original",
            last_name="Name",
            role="student",
        )

        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse("accounts:profile")

        # Update only first name
        update_data = {"first_name": "Updated"}
        response = client.patch(url, update_data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["first_name"] == "Updated"
        assert response.data["last_name"] == "Name"  # Should remain unchanged

        # Verify the user was actually updated
        user.refresh_from_db()
        assert user.first_name == "Updated"
        assert user.last_name == "Name"  # Should remain unchanged
