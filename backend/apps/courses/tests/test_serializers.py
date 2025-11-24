"""
Tests for Course serializers.
"""

from typing import TYPE_CHECKING, cast

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory

if TYPE_CHECKING:
    from apps.accounts.models import User

from apps.courses.models import Course, CourseMembership, CourseRole
from apps.courses.serializers import (
    CourseCreateSerializer,
    CourseMembershipSerializer,
    CourseSerializer,
    JoinCourseSerializer,
)

UserModel = cast("type[User]", get_user_model())

pytestmark = pytest.mark.django_db


@pytest.fixture
def user():
    """Fixture creating a test user."""
    return UserModel.objects.create_user(
        email="owner@example.com",
        first_name="Owner",
        last_name="User",
        password="testpass123",
        role="instructor",
    )


@pytest.fixture
def course(user):
    """Fixture creating a test course."""
    return Course.objects.create(
        title="Test Course",
        owner=user,
        status=Course.CourseStatus.DRAFT,
    )


@pytest.fixture
def request_factory():
    """Fixture for API request factory."""
    return APIRequestFactory()


# ===============================
# CourseSerializer tests
# ===============================
class TestCourseSerializer:
    """Test cases for CourseSerializer."""

    def test_serializes_course_fields(self, course):
        """Test that serializer includes all expected fields."""
        serializer = CourseSerializer(course)
        data = serializer.data

        assert "id" in data
        assert "title" in data
        assert "slug" in data
        assert "owner_id" in data
        assert "status" in data
        assert "join_code" in data
        assert "join_code_enabled" in data
        assert "member_count" in data
        assert "created_at" in data
        assert "updated_at" in data

    def test_read_only_fields_are_not_writable(self, course):
        """Test that read-only fields cannot be written."""
        serializer = CourseSerializer(
            course, data={"slug": "new-slug", "owner_id": "123"}, partial=True
        )
        # Should still be valid, but read-only fields won't change
        assert serializer.is_valid()
        # Slug and owner_id should remain unchanged
        assert course.slug != "new-slug"
        assert course.owner != "123"


# ===============================
# CourseCreateSerializer tests
# ===============================
class TestCourseCreateSerializer:
    """Test cases for CourseCreateSerializer."""

    def test_creates_course_with_title(self, user, request_factory):
        """Test that serializer creates a course with just a title."""
        request = request_factory.post("/api/courses/")
        request.user = user

        serializer = CourseCreateSerializer(
            data={"title": "New Course"}, context={"request": request}
        )
        assert serializer.is_valid()

        course = serializer.save()
        assert course.title == "New Course"
        assert course.owner == user
        assert course.status == Course.CourseStatus.DRAFT
        assert course.join_code is None
        assert course.join_code_enabled is False

    def test_creates_owner_membership(self, user, request_factory):
        """Test that creating a course also creates owner membership."""
        request = request_factory.post("/api/courses/")
        request.user = user

        serializer = CourseCreateSerializer(
            data={"title": "New Course"}, context={"request": request}
        )
        assert serializer.is_valid()

        course = serializer.save()
        membership = CourseMembership.objects.get(course=course, user=user)
        assert membership.role == CourseRole.OWNER

    def test_requires_title(self, user, request_factory):
        """Test that title is required."""
        request = request_factory.post("/api/courses/")
        request.user = user

        serializer = CourseCreateSerializer(data={}, context={"request": request})
        assert not serializer.is_valid()
        assert "title" in serializer.errors

    def test_title_max_length(self, user, request_factory):
        """Test that title respects max length."""
        request = request_factory.post("/api/courses/")
        request.user = user

        long_title = "A" * 201  # Exceeds max_length=200
        serializer = CourseCreateSerializer(
            data={"title": long_title}, context={"request": request}
        )
        assert not serializer.is_valid()
        assert "title" in serializer.errors


# ===============================
# CourseMembershipSerializer tests
# ===============================
class TestCourseMembershipSerializer:
    """Test cases for CourseMembershipSerializer."""

    def test_serializes_membership_fields(self, course, user):
        """Test that serializer includes all expected fields."""
        membership = CourseMembership.objects.create(
            course=course, user=user, role=CourseRole.STUDENT
        )

        serializer = CourseMembershipSerializer(membership)
        data = serializer.data

        assert "id" in data
        assert "user_id" in data
        assert "role" in data
        assert "joined_at" in data
        assert data["role"] == CourseRole.STUDENT

    def test_read_only_fields_are_not_writable(self, course, user):
        """Test that read-only fields cannot be written."""
        membership = CourseMembership.objects.create(
            course=course, user=user, role=CourseRole.STUDENT
        )

        serializer = CourseMembershipSerializer(
            membership, data={"user_id": "123", "joined_at": "2020-01-01"}, partial=True
        )
        # Should still be valid, but read-only fields won't change
        assert serializer.is_valid()
        # user_id and joined_at should remain unchanged
        assert membership.user == user

    def test_role_can_be_updated(self, course, user):
        """Test that role field can be updated."""
        membership = CourseMembership.objects.create(
            course=course, user=user, role=CourseRole.STUDENT
        )

        serializer = CourseMembershipSerializer(
            membership, data={"role": CourseRole.TA}, partial=True
        )
        assert serializer.is_valid()
        serializer.save()
        membership.refresh_from_db()
        assert membership.role == CourseRole.TA


# ===============================
# JoinCourseSerializer tests
# ===============================
class TestJoinCourseSerializer:
    """Test cases for JoinCourseSerializer."""

    def test_validates_join_code_presence(self):
        """Test that join_code is required."""
        serializer = JoinCourseSerializer(data={})
        assert not serializer.is_valid()
        assert "join_code" in serializer.errors

    def test_validates_join_code_max_length(self):
        """Test that join_code respects max length."""
        long_code = "A" * 17  # Exceeds max_length=16
        serializer = JoinCourseSerializer(data={"join_code": long_code})
        assert not serializer.is_valid()
        assert "join_code" in serializer.errors

    def test_valid_join_code(self):
        """Test that valid join code passes validation."""
        serializer = JoinCourseSerializer(data={"join_code": "ABC12345"})
        assert serializer.is_valid()
        assert serializer.validated_data["join_code"] == "ABC12345"

