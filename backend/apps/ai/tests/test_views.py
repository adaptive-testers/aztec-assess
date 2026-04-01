"""
Tests for AI API views (course materials list/upload, AI question generation).

Access control is ``IsAuthenticated`` + ``IsCourseStaff`` (same helpers as courses).
Staff vs student behavior is asserted here; the permission classes themselves are
tested in ``apps.courses.tests.test_permissions``.
"""

import uuid
from typing import TYPE_CHECKING, cast
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

if TYPE_CHECKING:
    from apps.accounts.models import User

from apps.ai.models import CourseMaterial, MaterialProcessingStatus
from apps.courses.models import Course, CourseMembership, CourseRole
from apps.quizzes.models import Chapter, Difficulty, QuestionReviewStatus

UserModel = cast("type[User]", get_user_model())

pytestmark = pytest.mark.django_db


@pytest.fixture
def owner():
    return UserModel.objects.create_user(
        email="ai-view-owner@example.com",
        first_name="Owner",
        last_name="User",
        password="testpass123",
        role="instructor",
    )


@pytest.fixture
def instructor():
    return UserModel.objects.create_user(
        email="ai-view-instructor@example.com",
        first_name="Inst",
        last_name="User",
        password="testpass123",
        role="instructor",
    )


@pytest.fixture
def ta_user():
    return UserModel.objects.create_user(
        email="ai-view-ta@example.com",
        first_name="TA",
        last_name="User",
        password="testpass123",
        role="instructor",
    )


@pytest.fixture
def student():
    return UserModel.objects.create_user(
        email="ai-view-student@example.com",
        first_name="Stu",
        last_name="User",
        password="testpass123",
        role="student",
    )


@pytest.fixture
def course(owner):
    return Course.objects.create(
        title="AI Views Course",
        owner=owner,
        status=Course.CourseStatus.ACTIVE,
    )


@pytest.fixture
def staff_course(course, owner, instructor):
    CourseMembership.objects.create(course=course, user=owner, role=CourseRole.OWNER)
    CourseMembership.objects.create(
        course=course, user=instructor, role=CourseRole.INSTRUCTOR
    )
    return course


@pytest.fixture
def chapter(staff_course):
    return Chapter.objects.create(course=staff_course, title="Ch 1")


@pytest.fixture
def student_member_course(course, owner, student):
    CourseMembership.objects.create(course=course, user=owner, role=CourseRole.OWNER)
    CourseMembership.objects.create(course=course, user=student, role=CourseRole.STUDENT)
    return course


class TestCourseMaterialListCreateView:
    """Tests for GET/POST ``/api/courses/<course_id>/materials/``."""

    def test_list_materials_as_owner(self, owner, staff_course):
        client = APIClient()
        client.force_authenticate(user=owner)
        url = reverse(
            "course-material-list-create",
            kwargs={"course_id": staff_course.id},
        )
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 0
        assert response.data["results"] == []

    def test_list_materials_as_ta(self, ta_user, staff_course):
        CourseMembership.objects.create(
            course=staff_course, user=ta_user, role=CourseRole.TA
        )
        client = APIClient()
        client.force_authenticate(user=ta_user)
        url = reverse(
            "course-material-list-create",
            kwargs={"course_id": staff_course.id},
        )
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK

    def test_list_materials_includes_existing_rows(self, owner, staff_course):
        CourseMaterial.objects.create(
            course=staff_course,
            uploaded_by=owner,
            original_filename="on_disk.pdf",
            gcs_object_key="k/x.pdf",
            processing_status=MaterialProcessingStatus.READY,
        )
        client = APIClient()
        client.force_authenticate(user=owner)
        url = reverse(
            "course-material-list-create",
            kwargs={"course_id": staff_course.id},
        )
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["original_filename"] == "on_disk.pdf"

    def test_unknown_course_returns_404(self, owner):
        client = APIClient()
        client.force_authenticate(user=owner)
        url = reverse(
            "course-material-list-create",
            kwargs={"course_id": uuid.uuid4()},
        )
        response = client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_list_materials_as_student_forbidden(self, student, staff_course):
        CourseMembership.objects.create(
            course=staff_course, user=student, role=CourseRole.STUDENT
        )
        client = APIClient()
        client.force_authenticate(user=student)
        url = reverse(
            "course-material-list-create",
            kwargs={"course_id": staff_course.id},
        )
        response = client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_materials_unauthenticated(self, staff_course):
        client = APIClient()
        url = reverse(
            "course-material-list-create",
            kwargs={"course_id": staff_course.id},
        )
        response = client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_material_missing_file(self, owner, staff_course):
        client = APIClient()
        client.force_authenticate(user=owner)
        url = reverse(
            "course-material-list-create",
            kwargs={"course_id": staff_course.id},
        )
        response = client.post(url, {}, format="multipart")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["detail"] == "Missing file field."

    @patch("apps.ai.views.material_processing.process_course_material")
    @patch("apps.ai.views.upload_material_file")
    def test_create_material_success(
        self, mock_upload, mock_process, owner, staff_course
    ):
        mock_upload.return_value = ("course_materials/x/f.txt", 5)
        mock_process.return_value = None

        client = APIClient()
        client.force_authenticate(user=owner)
        url = reverse(
            "course-material-list-create",
            kwargs={"course_id": staff_course.id},
        )
        upload = SimpleUploadedFile("notes.txt", b"hello", content_type="text/plain")
        response = client.post(url, {"file": upload}, format="multipart")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["original_filename"] == "notes.txt"
        assert response.data["file_size_bytes"] == 5
        mock_process.assert_called_once()

    @patch("apps.ai.views.material_processing.process_course_material")
    @patch("apps.ai.views.upload_material_file")
    def test_create_material_processing_error_returns_201_with_error_payload(
        self, mock_upload, mock_process, owner, staff_course
    ):
        mock_upload.return_value = ("course_materials/x/bad.pdf", 3)
        mock_process.side_effect = RuntimeError("extract failed")

        client = APIClient()
        client.force_authenticate(user=owner)
        url = reverse(
            "course-material-list-create",
            kwargs={"course_id": staff_course.id},
        )
        upload = SimpleUploadedFile("bad.pdf", b"%PDF", content_type="application/pdf")
        response = client.post(url, {"file": upload}, format="multipart")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["detail"] == "Processing failed."
        assert "error" not in response.data
        assert response.data["material"]["original_filename"] == "bad.pdf"


class TestAiGenerateQuestionView:
    """Tests for POST ``/api/chapters/<chapter_id>/ai-generate-question/``."""

    @patch("apps.ai.views.rag_service.retrieve_context_chunks", return_value=[])
    def test_no_chunks_returns_400(self, _mock_rag, instructor, chapter):
        client = APIClient()
        client.force_authenticate(user=instructor)
        url = reverse("ai-generate-question", kwargs={"chapter_id": chapter.pk})
        response = client.post(url, {"query": "test query"}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "No indexed course materials" in response.data["detail"]

    def test_unknown_chapter_returns_404(self, instructor):
        client = APIClient()
        client.force_authenticate(user=instructor)
        url = reverse("ai-generate-question", kwargs={"chapter_id": 999999})
        response = client.post(url, {"query": "q"}, format="json")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_missing_query_returns_400(self, instructor, chapter):
        client = APIClient()
        client.force_authenticate(user=instructor)
        url = reverse("ai-generate-question", kwargs={"chapter_id": chapter.pk})
        response = client.post(url, {}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_student_forbidden(self, student, student_member_course):
        ch = Chapter.objects.create(course=student_member_course, title="S Ch")
        client = APIClient()
        client.force_authenticate(user=student)
        url = reverse("ai-generate-question", kwargs={"chapter_id": ch.pk})
        response = client.post(url, {"query": "q"}, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated(self, chapter):
        client = APIClient()
        url = reverse("ai-generate-question", kwargs={"chapter_id": chapter.pk})
        response = client.post(url, {"query": "q"}, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @patch("apps.ai.views.generate_question_with_rag")
    @patch("apps.ai.views.rag_service.retrieve_context_chunks")
    def test_generates_question_when_configured(
        self,
        mock_retrieve,
        mock_generate,
        instructor,
        chapter,
    ):
        mock_retrieve.return_value = ["context chunk text"]
        mock_generate.return_value = {
            "question_text": "What is 2+2?",
            "answer_options": ["3", "4", "5", "6"],
            "correct_answer": 1,
            "difficulty": Difficulty.EASY,
            "suggested_topics": [],
        }

        client = APIClient()
        client.force_authenticate(user=instructor)
        url = reverse("ai-generate-question", kwargs={"chapter_id": chapter.pk})
        response = client.post(
            url,
            {"query": "basic math"},
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["prompt"] == "What is 2+2?"
        assert response.data["is_ai_generated"] is True
        assert response.data["review_status"] == QuestionReviewStatus.PENDING_REVIEW
        mock_retrieve.assert_called_once()
        mock_generate.assert_called_once()

    @patch("apps.ai.views.generate_question_with_rag")
    @patch("apps.ai.views.rag_service.retrieve_context_chunks")
    def test_value_error_from_factory_returns_400(
        self,
        mock_retrieve,
        mock_generate,
        instructor,
        chapter,
    ):
        mock_retrieve.return_value = ["ctx"]
        mock_generate.return_value = {
            "question_text": "",
            "answer_options": ["a", "b", "c", "d"],
            "correct_answer": 0,
            "difficulty": Difficulty.EASY,
            "suggested_topics": [],
        }

        client = APIClient()
        client.force_authenticate(user=instructor)
        url = reverse("ai-generate-question", kwargs={"chapter_id": chapter.pk})
        response = client.post(url, {"query": "x"}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["detail"] == "Could not create a question from the AI response."

    @patch("apps.ai.views.generate_question_with_rag")
    @patch("apps.ai.views.rag_service.retrieve_context_chunks")
    def test_gemini_not_configured_returns_503(
        self,
        mock_retrieve,
        mock_generate,
        instructor,
        chapter,
    ):
        mock_retrieve.return_value = ["ctx"]
        mock_generate.side_effect = RuntimeError("GEMINI_API_KEY is not configured.")

        client = APIClient()
        client.force_authenticate(user=instructor)
        url = reverse("ai-generate-question", kwargs={"chapter_id": chapter.pk})
        response = client.post(url, {"query": "x"}, format="json")

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert "GEMINI_API_KEY" in response.data["detail"]
