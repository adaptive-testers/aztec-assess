"""
Tests for Course and CourseMembership models.
"""

from typing import TYPE_CHECKING, cast

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError

if TYPE_CHECKING:
    from apps.accounts.models import User

from apps.courses.models import Course, CourseMembership, CourseRole

UserModel = cast("type[User]", get_user_model())


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


@pytest.mark.django_db
def test_course_creation(user):
    """Test that a course can be created successfully."""
    course = Course.objects.create(
        title="Introduction to Python",
        owner=user,
    )
    assert course.title == "Introduction to Python"
    assert course.owner == user
    assert course.status == Course.CourseStatus.DRAFT
    assert course.join_code is None
    assert course.join_code_enabled is False
    assert course.slug is not None
    assert course.created_at is not None
    assert course.updated_at is not None


@pytest.mark.django_db
def test_course_slug_generation(user):
    """Test that slug is automatically generated from title."""
    course = Course.objects.create(
        title="Advanced Django Development",
        owner=user,
    )
    assert course.slug == "advanced-django-development"


@pytest.mark.django_db
def test_course_slug_uniqueness(user):
    """Test that duplicate slugs are handled with numeric suffixes."""
    course1 = Course.objects.create(title="Python 101", owner=user)
    course2 = Course.objects.create(title="Python 101", owner=user)
    course3 = Course.objects.create(title="Python 101", owner=user)

    assert course1.slug == "python-101"
    assert course2.slug == "python-101-2"
    assert course3.slug == "python-101-3"


@pytest.mark.django_db
def test_course_slug_short_title(user):
    """Test slug generation for very short titles."""
    course = Course.objects.create(title="A", owner=user)
    assert course.slug == "a"


@pytest.mark.django_db
def test_course_slug_special_characters(user):
    """Test slug generation handles special characters."""
    course = Course.objects.create(
        title="Course: Advanced Topics (2024)",
        owner=user,
    )
    assert "course" in course.slug
    assert "advanced" in course.slug
    assert "topics" in course.slug
    assert "2024" in course.slug


@pytest.mark.django_db
def test_course_is_archived_property(user):
    """Test the is_archived property."""
    course = Course.objects.create(
        title="Test Course",
        owner=user,
        status=Course.CourseStatus.DRAFT,
    )
    assert course.is_archived is False

    course.status = Course.CourseStatus.ACTIVE
    course.save()
    assert course.is_archived is False

    course.status = Course.CourseStatus.ARCHIVED
    course.save()
    assert course.is_archived is True


@pytest.mark.django_db
def test_course_str_representation(course):
    """Test the string representation of a course."""
    assert str(course) == f"Test Course ({Course.CourseStatus.DRAFT})"


@pytest.mark.django_db
def test_course_membership_creation(course, user):
    """Test that a course membership can be created."""
    membership = CourseMembership.objects.create(
        course=course,
        user=user,
        role=CourseRole.STUDENT,
    )
    assert membership.course == course
    assert membership.user == user
    assert membership.role == CourseRole.STUDENT
    assert membership.joined_at is not None


@pytest.mark.django_db
def test_course_membership_default_role(course, user):
    """Test that membership defaults to STUDENT role."""
    membership = CourseMembership.objects.create(
        course=course,
        user=user,
    )
    assert membership.role == CourseRole.STUDENT


@pytest.mark.django_db
def test_course_membership_unique_constraint(course, user):
    """Test that a user can only have one membership per course."""
    CourseMembership.objects.create(
        course=course,
        user=user,
        role=CourseRole.STUDENT,
    )
    with pytest.raises(IntegrityError):
        CourseMembership.objects.create(
            course=course,
            user=user,
            role=CourseRole.INSTRUCTOR,
        )


@pytest.mark.django_db
def test_course_membership_multiple_courses(user):
    """Test that a user can be a member of multiple courses."""
    course1 = Course.objects.create(title="Course 1", owner=user)
    course2 = Course.objects.create(title="Course 2", owner=user)

    membership1 = CourseMembership.objects.create(
        course=course1,
        user=user,
        role=CourseRole.OWNER,
    )
    membership2 = CourseMembership.objects.create(
        course=course2,
        user=user,
        role=CourseRole.STUDENT,
    )

    assert membership1.course == course1
    assert membership2.course == course2
    assert membership1.role == CourseRole.OWNER
    assert membership2.role == CourseRole.STUDENT


@pytest.mark.django_db
def test_course_membership_str_representation(course, user):
    """Test the string representation of a membership."""
    membership = CourseMembership.objects.create(
        course=course,
        user=user,
        role=CourseRole.INSTRUCTOR,
    )
    assert str(membership) == f"{user.id} in {course.id} as {CourseRole.INSTRUCTOR}"


@pytest.mark.django_db
def test_course_join_code_nullable(user):
    """Test that join_code can be None."""
    course = Course.objects.create(
        title="Test Course",
        owner=user,
        join_code=None,
    )
    assert course.join_code is None


@pytest.mark.django_db
def test_course_status_choices(user):
    """Test that status must be a valid choice."""
    course = Course.objects.create(
        title="Test Course",
        owner=user,
        status=Course.CourseStatus.DRAFT,
    )
    assert course.status == Course.CourseStatus.DRAFT

    course.status = Course.CourseStatus.ACTIVE
    course.save()
    assert course.status == Course.CourseStatus.ACTIVE

    course.status = Course.CourseStatus.ARCHIVED
    course.save()
    assert course.status == Course.CourseStatus.ARCHIVED


@pytest.mark.django_db
def test_course_role_choices(course, user):
    """Test that role must be a valid choice."""
    membership = CourseMembership.objects.create(
        course=course,
        user=user,
        role=CourseRole.OWNER,
    )
    assert membership.role == CourseRole.OWNER

    membership.role = CourseRole.INSTRUCTOR
    membership.save()
    assert membership.role == CourseRole.INSTRUCTOR

    membership.role = CourseRole.TA
    membership.save()
    assert membership.role == CourseRole.TA

    membership.role = CourseRole.STUDENT
    membership.save()
    assert membership.role == CourseRole.STUDENT

