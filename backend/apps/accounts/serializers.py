from typing import Any

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User


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
        if value.lower().strip() not in ("admin", "instructor", "student"):
            raise serializers.ValidationError(
                "Invalid role. Must be one of: admin, instructor, student."
            )
        return value

    def create(self, validated_data: dict[str, Any]) -> User:
        """Create user with hashed password."""
        return User.objects.create_user(**validated_data)

class UserLoginSerializer(serializers.ModelSerializer):
    """
    Serializer for user login.

    TODO: Implement this serializer with:
    - Email validation
    - Password validation
    """

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["email", "password"]

    # TODO: Add validation methods


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for user profile.

    TODO: Implement this serializer with:
    - Read-only fields
    - Update validation
    """

    class Meta:
        model = User
        fields = [
            "email",
            "first_name",
            "last_name",
            "role",
            "is_verified",
            "created_at",
        ]
        read_only_fields = ["email", "created_at"]

    # TODO: Add validation methods
