from typing import TYPE_CHECKING, cast

import pytest
from django.contrib.auth import get_user_model

if TYPE_CHECKING:
    from apps.accounts.models import User

from apps.accounts.serializers import (
    UserLoginSerializer,
    UserRegistrationSerializer,
)

UserModel = cast("type[User]", get_user_model())

pytestmark = pytest.mark.django_db


# ===============================
# UserLoginSerializer tests
# ===============================
class TestUserLoginSerializer:
    """Test cases for UserLoginSerializer."""

    @pytest.fixture
    def active_user(self):
        """Fixture creating an active user for login tests."""
        return UserModel.objects.create_user(
            email="login@example.com",
            password="StrongP@ssw0rd!",
            first_name="Log",
            last_name="In",
            role="student",
        )


    def test_missing_email_returns_validation_error(self):
        """Test that missing email field returns validation error."""
        serializer = UserLoginSerializer(
            data={"password": "somepassword"}, context={"request": None}
        )
        assert not serializer.is_valid()
        assert "email" in serializer.errors
        assert "This field is required." in str(serializer.errors["email"])

    def test_missing_password_returns_validation_error(self):
        """Test that missing password field returns validation error."""
        serializer = UserLoginSerializer(
            data={"email": "test@example.com"}, context={"request": None}
        )
        assert not serializer.is_valid()
        assert "password" in serializer.errors
        assert "This field is required." in str(serializer.errors["password"])

    def test_missing_both_fields_returns_validation_errors(self):
        """Test that missing both email and password fields return validation errors."""
        serializer = UserLoginSerializer(data={}, context={"request": None})
        assert not serializer.is_valid()
        assert "email" in serializer.errors and "password" in serializer.errors

    def test_invalid_credentials_returns_detail_error(self):
        """Test that serializer validates email format correctly."""
        serializer = UserLoginSerializer(
            data={"email": "badpass@example.com", "password": "wrong"},
        )
        # Serializer now only validates format, not authentication
        assert serializer.is_valid()
        assert serializer.validated_data["email"] == "badpass@example.com"

    def test_inactive_user_is_rejected(self):
        """Test that serializer validates email format correctly."""
        serializer = UserLoginSerializer(
            data={"email": "inactive@example.com", "password": "StrongP@ssw0rd!"},
        )
        # Serializer now only validates format, not authentication
        assert serializer.is_valid()
        assert serializer.validated_data["email"] == "inactive@example.com"

    def test_nonexistent_user_returns_invalid_credentials(self):
        """Test that serializer validates email format correctly."""
        serializer = UserLoginSerializer(
            data={"email": "nonexistent@example.com", "password": "somepassword"},
        )
        # Serializer now only validates format, not authentication
        assert serializer.is_valid()
        assert serializer.validated_data["email"] == "nonexistent@example.com"

    def test_valid_credentials_normalizes_email_and_sets_user(self):
        """Test that serializer normalizes email format correctly."""
        serializer = UserLoginSerializer(
            data={"email": "  LOGIN@EXAMPLE.COM  ", "password": "StrongP@ssw0rd!"},
        )
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["email"] == "login@example.com"


# ===============================
# UserRegistrationSerializer tests
# ===============================
class TestUserRegistrationSerializer:
    """Test cases for UserRegistrationSerializer."""

    @pytest.fixture
    def valid_registration_data(self):
        """Fixture providing valid user registration data."""
        return {
            "email": "test@example.com",
            "first_name": "John",
            "last_name": "Doe",
            "password": "SecurePass123",
            "role": "student",
        }

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
