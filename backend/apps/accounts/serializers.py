from typing import Any

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User, UserRole


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.

    Handles:
    - Email validation and uniqueness
    - Password validation and confirmation
    - Role validation
    - Password hashing
    """

    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = [
            "email",
            "first_name",
            "last_name",
            "password",
            "role",
        ]

    def validate_email(self, value: str) -> str:
        """Validate email format and uniqueness."""
        value = value.lower().strip()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_role(self, value: str) -> str:
        """Validate role is a valid choice."""
        value = value.lower().strip()
        if value not in [role.value.lower() for role in UserRole]:
            raise serializers.ValidationError(
                "Invalid role. Must be one of: " + ", ".join([role.value.lower() for role in UserRole])
            )
        return value

    def create(self, validated_data: dict[str, Any]) -> User:
        """Create user with hashed password."""
        return User.objects.create_user(**validated_data)

class UserLoginSerializer(serializers.ModelSerializer):
    """
    Serializer for user login.

    Validates:
    - presence of email/password
    - normalizes email
    - authenticates against the backend
    """

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    # Set after successful validation
    user: User | None = None

    class Meta:
        model = User
        fields = ["email", "password"]

    def validate_email(self, value: str) -> str:
        """Normalize email format."""
        return str(value).strip().lower()


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for user profile.

    Validates:
    - first name and last name are not empty
    """

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_verified",
            "created_at",
        ]
        read_only_fields = ["id", "email", "created_at", "role"]

    def validate_first_name(self, value: str) -> str:
        value = value.strip()
        if len(value) == 0:
            raise serializers.ValidationError("First name cannot be empty.")
        return value

    def validate_last_name(self, value: str) -> str:
        value = value.strip()
        if len(value) == 0:
            raise serializers.ValidationError("Last name cannot be empty.")
        return value


class GoogleOAuthSerializer(serializers.Serializer):
    """
    Serializer for Google OAuth authentication.

    Validates:
    - OAuth code is present
    - Role is optional (required for sign-up, optional for login)
    """

    code = serializers.CharField(required=True, help_text="OAuth authorization code from Google")
    role = serializers.CharField(
        required=False, allow_blank=True, help_text="User role: admin, instructor, or student (required for sign-up)"
    )

    def validate_role(self, value: str) -> str | None:
        """Validate role is a valid choice if provided."""
        if not value or not value.strip():
            return None
        value = value.lower().strip()
        if value not in [role.value.lower() for role in UserRole]:
            raise serializers.ValidationError(
                "Invalid role. Must be one of: " + ", ".join([role.value.lower() for role in UserRole])
            )
        return value

class MicrosoftOAuthSerializer(serializers.Serializer):
    """
    Serializer for Microsoft OAuth authentication.

    Validates:
    - Access token is present
    - Role is optional (required for sign-up, optional for login)
    """

    access_token = serializers.CharField(required=True, help_text="Access token from Microsoft")
    role = serializers.CharField(
        required=False, allow_blank=True, help_text="User role: admin, instructor, or student (required for sign-up)"
    )

    def validate_role(self, value: str) -> str | None:
        """Validate role is a valid choice if provided."""
        if not value or not value.strip():
            return None
        value = value.lower().strip()
        if value not in [role.value.lower() for role in UserRole]:
            raise serializers.ValidationError(
                "Invalid role. Must be one of: " + ", ".join([role.value.lower() for role in UserRole])
            )
        return value
