"""
Tests for the User model.
"""

from typing import cast

import pytest
from django.contrib.auth import get_user_model

from apps.accounts.models import User, UserRole

# Type alias for the User model
UserModel = cast("type[User]", get_user_model())


@pytest.fixture
def user_data():
    """Fixture providing test user data."""
    return {
        "email": "test@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "password": "testpass123",
        "role": UserRole.STUDENT,
    }


@pytest.fixture
def user(user_data):
    """Fixture creating a test user."""
    return UserModel.objects.create_user(**user_data)


@pytest.mark.django_db
def test_user_creation(user_data):
    """Test that a user can be created successfully."""
    user = UserModel.objects.create_user(**user_data)
    assert user.email == "test@example.com"
    assert user.first_name == "John"
    assert user.last_name == "Doe"
    assert user.role == UserRole.STUDENT
    assert user.is_active is True
    assert user.is_verified is False


@pytest.mark.django_db
def test_user_str_representation(user):
    """Test the string representation of a user."""
    assert str(user) == "test@example.com"


@pytest.mark.django_db
def test_user_full_name_property(user):
    """Test the full_name property."""
    assert user.full_name == "John Doe"


@pytest.mark.django_db
def test_user_display_name_property(user):
    """Test the display_name property."""
    assert user.display_name == "John Doe"


@pytest.mark.django_db
def test_user_role_properties_student(user):
    """Test student role properties."""
    assert user.is_student is True
    assert user.is_instructor is False
    assert user.is_admin is False


@pytest.mark.django_db
def test_user_role_properties_instructor(user):
    """Test instructor role properties."""
    user.role = UserRole.INSTRUCTOR
    user.save()
    assert user.is_student is False
    assert user.is_instructor is True
    assert user.is_admin is False


@pytest.mark.django_db
def test_user_role_properties_admin(user):
    """Test admin role properties."""
    user.role = UserRole.ADMIN
    user.save()
    assert user.is_student is False
    assert user.is_instructor is False
    assert user.is_admin is True


@pytest.mark.django_db
def test_user_email_lowercase():
    """Test that email is automatically converted to lowercase."""
    user = UserModel.objects.create_user(
        email="TEST@EXAMPLE.COM",
        first_name="John",
        last_name="Doe",
        password="testpass123",
        role=UserRole.STUDENT,
    )
    assert user.email == "test@example.com"


@pytest.mark.django_db
def test_user_unique_email(user_data):
    """Test that email must be unique."""
    from django.db import IntegrityError

    UserModel.objects.create_user(**user_data)
    with pytest.raises(IntegrityError):
        UserModel.objects.create_user(**user_data)
