"""
Tests for the UserRegistrationSerializer.
"""

from typing import TYPE_CHECKING, cast

import pytest
from django.contrib.auth import get_user_model

from apps.accounts.serializers import UserRegistrationSerializer

if TYPE_CHECKING:
    from apps.accounts.models import User

# Type alias for the User model
UserModel = cast("type[User]", get_user_model())

pytestmark = pytest.mark.django_db


@pytest.fixture
def valid_registration_data():
    """Fixture providing valid user registration data."""
    return {
        "email": "test@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "password": "SecurePass123",
        "role": "student"
    }


@pytest.fixture
def existing_user():
    """Fixture creating an existing user for duplicate email tests."""
    return UserModel.objects.create_user(
        email="existing@example.com",
        first_name="Existing",
        last_name="User",
        password="testpass123",
        role="instructor"
    )


class TestUserRegistrationSerializer:
    """Test cases for UserRegistrationSerializer."""

    def test_valid_registration_data(self, valid_registration_data):
        """Test serializer with valid data creates user successfully."""
        serializer = UserRegistrationSerializer(data=valid_registration_data)

        assert serializer.is_valid()

        user = serializer.save()
        assert user.email == "test@example.com"
        assert user.first_name == "John"
        assert user.last_name == "Doe"
        assert user.role == "student"
        # Check that password is hashed (not plain text)
        assert user.password != valid_registration_data["password"]
        assert len(user.password) > 20  # Hashed passwords are longer

    def test_duplicate_email(self, valid_registration_data):
        """Test serializer rejects duplicate email."""
        # First create a user
        UserModel.objects.create_user(
            email="existing@example.com",
            first_name="Existing",
            last_name="User",
            password="testpass123",
            role="instructor"
        )

        # Now try to create another user with the same email
        duplicate_data = valid_registration_data.copy()
        duplicate_data["email"] = "existing@example.com"

        serializer = UserRegistrationSerializer(data=duplicate_data)

        assert not serializer.is_valid()
        assert "email" in serializer.errors
        assert "already exists" in str(serializer.errors["email"])

    def test_email_normalization(self, valid_registration_data):
        """Test that email is normalized to lowercase and stripped."""
        data = valid_registration_data.copy()
        data["email"] = "  TEST@EXAMPLE.COM  "

        serializer = UserRegistrationSerializer(data=data)

        assert serializer.is_valid()

        user = serializer.save()
        assert user.email == "test@example.com"

    def test_all_valid_roles(self, valid_registration_data):
        """Test that all valid roles are accepted."""
        valid_roles = ["student", "instructor", "admin"]

        for role in valid_roles:
            data = valid_registration_data.copy()
            data["email"] = f"test_{role}@example.com"  # Unique email for each test
            data["role"] = role

            serializer = UserRegistrationSerializer(data=data)

            assert serializer.is_valid(), f"Role '{role}' should be valid"

            user = serializer.save()
            assert user.role == role

    def test_invalid_email_format(self, valid_registration_data):
        """Test serializer rejects invalid email format."""
        invalid_data = valid_registration_data.copy()
        invalid_data["email"] = "invalid-email"

        serializer = UserRegistrationSerializer(data=invalid_data)

        assert not serializer.is_valid()
        assert "email" in serializer.errors

    def test_invalid_role(self, valid_registration_data):
        """Test serializer rejects invalid role."""
        invalid_data = valid_registration_data.copy()
        invalid_data["role"] = "invalid_role"

        serializer = UserRegistrationSerializer(data=invalid_data)

        assert not serializer.is_valid()
        assert "role" in serializer.errors

    def test_weak_password(self, valid_registration_data):
        """Test serializer rejects weak password."""
        invalid_data = valid_registration_data.copy()
        invalid_data["password"] = "123"  # Too weak

        serializer = UserRegistrationSerializer(data=invalid_data)

        assert not serializer.is_valid()
        assert "password" in serializer.errors

    def test_required_fields(self):
        """Test that all required fields are validated."""
        # Test with completely empty data
        serializer = UserRegistrationSerializer(data={})

        assert not serializer.is_valid()

        # Note: role has a default value, so it's not required
        required_fields = ["email", "first_name", "last_name", "password"]
        for field in required_fields:
            assert field in serializer.errors

    def test_password_is_write_only(self, valid_registration_data):
        """Test that password field is write-only and not returned in data."""
        serializer = UserRegistrationSerializer(data=valid_registration_data)

        assert serializer.is_valid()
        user = serializer.save()

        # Check that password is not in the serialized data
        serialized_data = serializer.data
        assert "password" not in serialized_data

        # But user should have a hashed password
        assert user.password is not None
        assert user.password != valid_registration_data["password"]
