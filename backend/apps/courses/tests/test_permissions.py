"""
Tests for Course permission classes.
"""

from typing import TYPE_CHECKING, cast

import pytest
from django.contrib.auth import get_user_model

if TYPE_CHECKING:
    from apps.accounts.models import User

from apps.courses.models import Course, CourseMembership, CourseRole
from apps.courses.permissions import (
    IsCourseMember,
    IsCourseOwnerOrInstructor,
    IsCourseStaff,
)

UserModel = cast("type[User]", get_user_model())

pytestmark = pytest.mark.django_db


@pytest.fixture
def owner():
    """Fixture creating a course owner."""
    return UserModel.objects.create_user(
        email="owner@example.com",
        first_name="Owner",
        last_name="User",
        password="testpass123",
        role="instructor",
    )


@pytest.fixture
def instructor():
    """Fixture creating an instructor."""
    return UserModel.objects.create_user(
        email="instructor@example.com",
        first_name="Instructor",
        last_name="User",
        password="testpass123",
        role="instructor",
    )


@pytest.fixture
def ta():
    """Fixture creating a TA."""
    return UserModel.objects.create_user(
        email="ta@example.com",
        first_name="TA",
        last_name="User",
        password="testpass123",
        role="instructor",
    )


@pytest.fixture
def student():
    """Fixture creating a student."""
    return UserModel.objects.create_user(
        email="student@example.com",
        first_name="Student",
        last_name="User",
        password="testpass123",
        role="student",
    )


@pytest.fixture
def non_member():
    """Fixture creating a non-member user."""
    return UserModel.objects.create_user(
        email="nonmember@example.com",
        first_name="Non",
        last_name="Member",
        password="testpass123",
        role="student",
    )


@pytest.fixture
def course(owner):
    """Fixture creating a test course."""
    return Course.objects.create(
        title="Test Course",
        owner=owner,
        status=Course.CourseStatus.ACTIVE,
    )


@pytest.fixture
def course_with_members(course, owner, instructor, ta, student):
    """Fixture creating a course with various members."""
    CourseMembership.objects.create(course=course, user=owner, role=CourseRole.OWNER)
    CourseMembership.objects.create(
        course=course, user=instructor, role=CourseRole.INSTRUCTOR
    )
    CourseMembership.objects.create(course=course, user=ta, role=CourseRole.TA)
    CourseMembership.objects.create(course=course, user=student, role=CourseRole.STUDENT)
    return course


# ===============================
# IsCourseStaff tests
# ===============================
class TestIsCourseStaff:
    """Test cases for IsCourseStaff permission."""

    def test_owner_has_staff_permission(self, course_with_members, owner):
        """Test that owner has staff permission."""
        permission = IsCourseStaff()
        request = type("Request", (), {"user": owner})()
        assert permission.has_object_permission(request, None, course_with_members)

    def test_instructor_has_staff_permission(self, course_with_members, instructor):
        """Test that instructor has staff permission."""
        permission = IsCourseStaff()
        request = type("Request", (), {"user": instructor})()
        assert permission.has_object_permission(request, None, course_with_members)

    def test_ta_has_staff_permission(self, course_with_members, ta):
        """Test that TA has staff permission."""
        permission = IsCourseStaff()
        request = type("Request", (), {"user": ta})()
        assert permission.has_object_permission(request, None, course_with_members)

    def test_student_does_not_have_staff_permission(
        self, course_with_members, student
    ):
        """Test that student does not have staff permission."""
        permission = IsCourseStaff()
        request = type("Request", (), {"user": student})()
        assert not permission.has_object_permission(request, None, course_with_members)

    def test_non_member_does_not_have_staff_permission(
        self, course_with_members, non_member
    ):
        """Test that non-member does not have staff permission."""
        permission = IsCourseStaff()
        request = type("Request", (), {"user": non_member})()
        assert not permission.has_object_permission(request, None, course_with_members)


# ===============================
# IsCourseOwnerOrInstructor tests
# ===============================
class TestIsCourseOwnerOrInstructor:
    """Test cases for IsCourseOwnerOrInstructor permission."""

    def test_owner_has_permission(self, course_with_members, owner):
        """Test that owner has permission."""
        permission = IsCourseOwnerOrInstructor()
        request = type("Request", (), {"user": owner})()
        assert permission.has_object_permission(request, None, course_with_members)

    def test_instructor_has_permission(self, course_with_members, instructor):
        """Test that instructor has permission."""
        permission = IsCourseOwnerOrInstructor()
        request = type("Request", (), {"user": instructor})()
        assert permission.has_object_permission(request, None, course_with_members)

    def test_ta_does_not_have_permission(self, course_with_members, ta):
        """Test that TA does not have permission."""
        permission = IsCourseOwnerOrInstructor()
        request = type("Request", (), {"user": ta})()
        assert not permission.has_object_permission(request, None, course_with_members)

    def test_student_does_not_have_permission(self, course_with_members, student):
        """Test that student does not have permission."""
        permission = IsCourseOwnerOrInstructor()
        request = type("Request", (), {"user": student})()
        assert not permission.has_object_permission(request, None, course_with_members)

    def test_non_member_does_not_have_permission(
        self, course_with_members, non_member
    ):
        """Test that non-member does not have permission."""
        permission = IsCourseOwnerOrInstructor()
        request = type("Request", (), {"user": non_member})()
        assert not permission.has_object_permission(request, None, course_with_members)


# ===============================
# IsCourseMember tests
# ===============================
class TestIsCourseMember:
    """Test cases for IsCourseMember permission."""

    def test_owner_is_member(self, course_with_members, owner):
        """Test that owner is considered a member."""
        permission = IsCourseMember()
        request = type("Request", (), {"user": owner})()
        assert permission.has_object_permission(request, None, course_with_members)

    def test_instructor_is_member(self, course_with_members, instructor):
        """Test that instructor is considered a member."""
        permission = IsCourseMember()
        request = type("Request", (), {"user": instructor})()
        assert permission.has_object_permission(request, None, course_with_members)

    def test_ta_is_member(self, course_with_members, ta):
        """Test that TA is considered a member."""
        permission = IsCourseMember()
        request = type("Request", (), {"user": ta})()
        assert permission.has_object_permission(request, None, course_with_members)

    def test_student_is_member(self, course_with_members, student):
        """Test that student is considered a member."""
        permission = IsCourseMember()
        request = type("Request", (), {"user": student})()
        assert permission.has_object_permission(request, None, course_with_members)

    def test_non_member_is_not_member(self, course_with_members, non_member):
        """Test that non-member is not considered a member."""
        permission = IsCourseMember()
        request = type("Request", (), {"user": non_member})()
        assert not permission.has_object_permission(request, None, course_with_members)

