from typing import TYPE_CHECKING, cast

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

if TYPE_CHECKING:
    from apps.accounts.models import User

# Type alias for the User model
UserModel = cast("type[User]", get_user_model())

pytestmark = pytest.mark.django_db


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
        assert "refresh" in resp.data["tokens"]

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
