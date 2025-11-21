"""
Tests for CourseViewSet and EnrollmentViewSet API endpoints.
"""

from typing import TYPE_CHECKING, cast

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

if TYPE_CHECKING:
    from apps.accounts.models import User

from apps.courses.models import Course, CourseMembership, CourseRole

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
        status=Course.CourseStatus.DRAFT,
    )


@pytest.fixture
def active_course(owner):
    """Fixture creating an active course with join code."""
    course = Course.objects.create(
        title="Active Course",
        owner=owner,
        status=Course.CourseStatus.ACTIVE,
        join_code="ABC12345",
        join_code_enabled=True,
    )
    CourseMembership.objects.create(course=course, user=owner, role=CourseRole.OWNER)
    return course


# ===============================
# CourseViewSet - CRUD Tests
# ===============================
class TestCourseViewSetCRUD:
    """Test CRUD operations for CourseViewSet."""

    def test_list_courses_shows_only_member_courses(self, owner, student):
        """Test that list only shows courses user is a member of."""
        # Create courses
        course1 = Course.objects.create(title="Course 1", owner=owner)
        Course.objects.create(title="Course 2", owner=owner)
        CourseMembership.objects.create(course=course1, user=student, role=CourseRole.STUDENT)
        # course2 has no membership for student

        client = APIClient()
        client.force_authenticate(user=student)
        url = reverse("course-list")
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["title"] == "Course 1"

    def test_list_excludes_archived_by_default(self, owner, course):
        """Test that archived courses are excluded from list by default."""
        CourseMembership.objects.create(course=course, user=owner, role=CourseRole.OWNER)
        course.status = Course.CourseStatus.ARCHIVED
        course.save()

        client = APIClient()
        client.force_authenticate(user=owner)
        url = reverse("course-list")
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 0
        assert response.data["results"] == []

    def test_list_includes_archived_with_status_param(self, owner, course):
        """Test that archived courses appear when status param is provided."""
        CourseMembership.objects.create(course=course, user=owner, role=CourseRole.OWNER)
        course.status = Course.CourseStatus.ARCHIVED
        course.save()

        client = APIClient()
        client.force_authenticate(user=owner)
        url = reverse("course-list")
        response = client.get(url, {"status": "ARCHIVED"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_create_course(self, owner):
        """Test that authenticated user can create a course."""
        client = APIClient()
        client.force_authenticate(user=owner)
        url = reverse("course-list")
        response = client.post(url, {"title": "New Course"}, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"] == "New Course"
        assert response.data["status"] == Course.CourseStatus.DRAFT
        # Verify owner membership was created
        assert CourseMembership.objects.filter(
            course_id=response.data["id"], user=owner, role=CourseRole.OWNER
        ).exists()

    def test_retrieve_course_as_member(self, owner, course):
        """Test that course members can retrieve course details."""
        CourseMembership.objects.create(course=course, user=owner, role=CourseRole.OWNER)

        client = APIClient()
        client.force_authenticate(user=owner)
        url = reverse("course-detail", kwargs={"pk": course.id})
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == course.title

    def test_retrieve_course_as_non_member_forbidden(self, non_member, course):
        """Test that non-members cannot retrieve course details."""
        client = APIClient()
        client.force_authenticate(user=non_member)
        url = reverse("course-detail", kwargs={"pk": course.id})
        response = client.get(url)

        # Expect 404 because get_queryset usually filters, or 403 if found but forbidden
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]

    def test_update_course_as_owner(self, owner, course):
        """Test that owner can update course."""
        CourseMembership.objects.create(course=course, user=owner, role=CourseRole.OWNER)

        client = APIClient()
        client.force_authenticate(user=owner)
        url = reverse("course-detail", kwargs={"pk": course.id})
        response = client.patch(url, {"title": "Updated Title"}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Updated Title"

    def test_update_course_as_student_forbidden(self, student, course):
        """Test that students cannot update course."""
        CourseMembership.objects.create(course=course, user=student, role=CourseRole.STUDENT)

        client = APIClient()
        client.force_authenticate(user=student)
        url = reverse("course-detail", kwargs={"pk": course.id})
        response = client.patch(url, {"title": "Hacked Title"}, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_course_as_owner(self, owner, course):
        """Test that owner can delete course."""
        CourseMembership.objects.create(course=course, user=owner, role=CourseRole.OWNER)

        client = APIClient()
        client.force_authenticate(user=owner)
        url = reverse("course-detail", kwargs={"pk": course.id})
        response = client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Course.objects.filter(id=course.id).exists()


# ===============================
# CourseViewSet - Lifecycle Actions
# ===============================
class TestCourseViewSetLifecycle:
    """Test lifecycle actions (activate, archive, join code management)."""

    def test_activate_course(self, owner, course):
        """Test activating a draft course."""
        CourseMembership.objects.create(course=course, user=owner, role=CourseRole.OWNER)

        client = APIClient()
        client.force_authenticate(user=owner)
        url = reverse("course-activate", kwargs={"pk": course.id})
        response = client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == Course.CourseStatus.ACTIVE
        assert "join_code" in response.data
        course.refresh_from_db()
        assert course.status == Course.CourseStatus.ACTIVE
        assert course.join_code is not None

    def test_activate_archived_course_forbidden(self, owner, course):
        """Test that archived courses cannot be activated."""
        CourseMembership.objects.create(course=course, user=owner, role=CourseRole.OWNER)
        course.status = Course.CourseStatus.ARCHIVED
        course.save()

        client = APIClient()
        client.force_authenticate(user=owner)
        url = reverse("course-activate", kwargs={"pk": course.id})
        response = client.post(url)

        # If get_queryset filters out archived, we get 404. If found, we get 400.
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND]

    def test_archive_course(self, owner, active_course):
        """Test archiving an active course."""
        client = APIClient()
        client.force_authenticate(user=owner)
        url = reverse("course-archive", kwargs={"pk": active_course.id})
        response = client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == Course.CourseStatus.ARCHIVED
        active_course.refresh_from_db()
        assert active_course.status == Course.CourseStatus.ARCHIVED
        assert active_course.join_code_enabled is False

    def test_rotate_join_code(self, owner, active_course):
        """Test rotating join code."""
        old_code = active_course.join_code

        client = APIClient()
        client.force_authenticate(user=owner)
        url = reverse("course-rotate-join-code", kwargs={"pk": active_course.id})
        response = client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert "join_code" in response.data
        assert response.data["join_code"] != old_code
        active_course.refresh_from_db()
        assert active_course.join_code != old_code

    def test_rotate_join_code_archived_forbidden(self, owner, course):
        """Test that archived courses cannot rotate join code."""
        CourseMembership.objects.create(course=course, user=owner, role=CourseRole.OWNER)
        course.status = Course.CourseStatus.ARCHIVED
        course.save()

        client = APIClient()
        client.force_authenticate(user=owner)
        url = reverse("course-rotate-join-code", kwargs={"pk": course.id})
        response = client.post(url)

        # 404 if filtered, 400 if found
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND]

    def test_enable_join_code(self, owner, active_course):
        """Test enabling join code."""
        active_course.join_code_enabled = False
        active_course.save()

        client = APIClient()
        client.force_authenticate(user=owner)
        url = reverse("course-enable-join-code", kwargs={"pk": active_course.id})
        response = client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["join_code_enabled"] is True
        active_course.refresh_from_db()
        assert active_course.join_code_enabled is True

    def test_enable_join_code_draft_forbidden(self, owner, course):
        """Test that join code cannot be enabled for draft courses."""
        CourseMembership.objects.create(course=course, user=owner, role=CourseRole.OWNER)

        client = APIClient()
        client.force_authenticate(user=owner)
        url = reverse("course-enable-join-code", kwargs={"pk": course.id})
        response = client.post(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_disable_join_code(self, owner, active_course):
        """Test disabling join code."""
        client = APIClient()
        client.force_authenticate(user=owner)
        url = reverse("course-disable-join-code", kwargs={"pk": active_course.id})
        response = client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["join_code_enabled"] is False
        active_course.refresh_from_db()
        assert active_course.join_code_enabled is False


# ===============================
# CourseViewSet - Membership Actions
# ===============================
class TestCourseViewSetMembership:
    """Test membership management actions."""

    def test_list_members_as_staff(self, owner, instructor, student, course):
        """Test that staff can list course members."""
        CourseMembership.objects.create(course=course, user=owner, role=CourseRole.OWNER)
        CourseMembership.objects.create(course=course, user=instructor, role=CourseRole.INSTRUCTOR)
        CourseMembership.objects.create(course=course, user=student, role=CourseRole.STUDENT)

        client = APIClient()
        client.force_authenticate(user=owner)
        url = reverse("course-members", kwargs={"pk": course.id})
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 3

    def test_list_members_as_student_forbidden(self, student, course):
        """Test that students cannot list members."""
        CourseMembership.objects.create(course=course, user=student, role=CourseRole.STUDENT)

        client = APIClient()
        client.force_authenticate(user=student)
        url = reverse("course-members", kwargs={"pk": course.id})
        response = client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_add_member_by_email(self, owner, student, course):
        """Test adding a member to course by email."""
        CourseMembership.objects.create(course=course, user=owner, role=CourseRole.OWNER)

        client = APIClient()
        client.force_authenticate(user=owner)
        url = reverse("course-add-member", kwargs={"pk": course.id})
        response = client.post(
            url,
            {"email": student.email, "role": CourseRole.INSTRUCTOR},
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert CourseMembership.objects.filter(
            course=course, user=student, role=CourseRole.INSTRUCTOR
        ).exists()

    def test_add_member_updates_existing_role(self, owner, student, course):
        """Test that adding existing member updates their role (email path)."""
        CourseMembership.objects.create(course=course, user=owner, role=CourseRole.OWNER)
        CourseMembership.objects.create(course=course, user=student, role=CourseRole.STUDENT)

        client = APIClient()
        client.force_authenticate(user=owner)
        url = reverse("course-add-member", kwargs={"pk": course.id})
        response = client.post(
            url,
            {"email": student.email, "role": CourseRole.TA},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        membership = CourseMembership.objects.get(course=course, user=student)
        assert membership.role == CourseRole.TA

    def test_add_member_missing_identifiers(self, owner, course):
        """Test that missing email/user_id returns error."""
        CourseMembership.objects.create(course=course, user=owner, role=CourseRole.OWNER)

        client = APIClient()
        client.force_authenticate(user=owner)
        url = reverse("course-add-member", kwargs={"pk": course.id})
        response = client.post(url, {}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["detail"] == "email or user_id required"

    def test_add_member_invalid_email(self, owner, course):
        """Test that invalid email returns not found."""
        CourseMembership.objects.create(course=course, user=owner, role=CourseRole.OWNER)

        client = APIClient()
        client.force_authenticate(user=owner)
        url = reverse("course-add-member", kwargs={"pk": course.id})
        response = client.post(
            url,
            {"email": "doesnotexist@example.com", "role": CourseRole.TA},
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_add_member_fallback_user_id(self, owner, student, course):
        """Test that user_id still works as fallback."""
        CourseMembership.objects.create(course=course, user=owner, role=CourseRole.OWNER)

        client = APIClient()
        client.force_authenticate(user=owner)
        url = reverse("course-add-member", kwargs={"pk": course.id})
        response = client.post(
            url,
            {"user_id": str(student.id), "role": CourseRole.INSTRUCTOR},
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED

    def test_remove_member(self, owner, student, course):
        """Test removing a member from course."""
        CourseMembership.objects.create(course=course, user=owner, role=CourseRole.OWNER)
        CourseMembership.objects.create(course=course, user=student, role=CourseRole.STUDENT)

        client = APIClient()
        client.force_authenticate(user=owner)
        url = reverse("course-remove-member", kwargs={"pk": course.id})
        response = client.post(url, {"user_id": str(student.id)}, format="json")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not CourseMembership.objects.filter(course=course, user=student).exists()


# ===============================
# EnrollmentViewSet Tests
# ===============================
class TestEnrollmentViewSet:
    """Test enrollment/join functionality."""

    def test_join_course_with_valid_code(self, student, active_course):
        """Test joining a course with valid join code."""
        client = APIClient()
        client.force_authenticate(user=student)
        url = reverse("enrollment-join")
        response = client.post(url, {"join_code": "ABC12345"}, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["course_id"] == str(active_course.id)
        assert response.data["role"] == CourseRole.STUDENT
        assert response.data["created"] is True
        assert CourseMembership.objects.filter(course=active_course, user=student).exists()

    def test_join_course_case_insensitive(self, student, active_course): # noqa: ARG002
        """Test that join code is case-insensitive."""
        client = APIClient()
        client.force_authenticate(user=student)
        url = reverse("enrollment-join")
        response = client.post(url, {"join_code": "abc12345"}, format="json")

        assert response.status_code == status.HTTP_201_CREATED

    def test_join_course_invalid_code(self, student):
        """Test joining with invalid join code."""
        client = APIClient()
        client.force_authenticate(user=student)
        url = reverse("enrollment-join")
        response = client.post(url, {"join_code": "INVALID"}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_join_course_disabled_code(self, student, active_course):
        """Test joining with disabled join code."""
        active_course.join_code_enabled = False
        active_course.save()

        client = APIClient()
        client.force_authenticate(user=student)
        url = reverse("enrollment-join")
        response = client.post(url, {"join_code": "ABC12345"}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_join_course_draft_status_forbidden(self, student, course):
        """Test that draft courses cannot be joined."""
        course.status = Course.CourseStatus.DRAFT
        course.join_code = "DRAFT123"
        course.join_code_enabled = True
        course.save()

        client = APIClient()
        client.force_authenticate(user=student)
        url = reverse("enrollment-join")
        response = client.post(url, {"join_code": "DRAFT123"}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_join_course_already_member(self, student, active_course):
        """Test joining when already a member returns existing membership."""
        CourseMembership.objects.create(
            course=active_course, user=student, role=CourseRole.STUDENT
        )

        client = APIClient()
        client.force_authenticate(user=student)
        url = reverse("enrollment-join")
        response = client.post(url, {"join_code": "ABC12345"}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["created"] is False
