"""
Tests for AI serializers (course materials and generate-question request).
"""

from typing import TYPE_CHECKING, cast

import pytest
from django.contrib.auth import get_user_model

if TYPE_CHECKING:
    from apps.accounts.models import User

from apps.ai.models import CourseMaterial, MaterialProcessingStatus
from apps.ai.serializers import AiGenerateQuestionSerializer, CourseMaterialSerializer
from apps.courses.models import Course

UserModel = cast("type[User]", get_user_model())

pytestmark = pytest.mark.django_db


@pytest.fixture
def user():
    return UserModel.objects.create_user(
        email="ai-ser-user@example.com",
        first_name="U",
        last_name="Ser",
        password="testpass123",
        role="instructor",
    )


@pytest.fixture
def course(user):
    return Course.objects.create(
        title="Serializer Course",
        owner=user,
        status=Course.CourseStatus.DRAFT,
    )


@pytest.fixture
def course_material(course, user):
    return CourseMaterial.objects.create(
        course=course,
        uploaded_by=user,
        original_filename="doc.pdf",
        gcs_object_key="k/doc.pdf",
        mime_type="application/pdf",
        file_size_bytes=500,
        processing_status=MaterialProcessingStatus.READY,
    )


class TestCourseMaterialSerializer:
    """Test cases for CourseMaterialSerializer."""

    def test_serializes_expected_fields(self, course_material):
        serializer = CourseMaterialSerializer(course_material)
        data = serializer.data

        assert "id" in data
        assert data["original_filename"] == "doc.pdf"
        assert data["mime_type"] == "application/pdf"
        assert data["file_size_bytes"] == 500
        assert data["processing_status"] == MaterialProcessingStatus.READY
        assert "processing_error" in data
        assert "created_at" in data
        assert "updated_at" in data

    def test_serializes_uuid_id_as_string(self, course_material):
        data = CourseMaterialSerializer(course_material).data
        assert data["id"] == str(course_material.pk)

    def test_serializes_processing_error_when_set(self, course, user):
        mat = CourseMaterial.objects.create(
            course=course,
            uploaded_by=user,
            original_filename="x.pdf",
            gcs_object_key="k",
            processing_status=MaterialProcessingStatus.FAILED,
            processing_error="bad pdf",
        )
        data = CourseMaterialSerializer(mat).data
        assert data["processing_error"] == "bad pdf"

    def test_serializes_empty_mime_type(self, course, user):
        mat = CourseMaterial.objects.create(
            course=course,
            uploaded_by=user,
            original_filename="raw.bin",
            gcs_object_key="k",
            mime_type="",
        )
        data = CourseMaterialSerializer(mat).data
        assert data["mime_type"] == ""

    def test_serializes_zero_file_size(self, course, user):
        mat = CourseMaterial.objects.create(
            course=course,
            uploaded_by=user,
            original_filename="empty.txt",
            gcs_object_key="k",
            file_size_bytes=0,
        )
        data = CourseMaterialSerializer(mat).data
        assert data["file_size_bytes"] == 0

    def test_datetime_fields_are_iso_strings(self, course_material):
        data = CourseMaterialSerializer(course_material).data
        assert "T" in data["created_at"] or "-" in data["created_at"]
        assert "T" in data["updated_at"] or "-" in data["updated_at"]

    def test_writable_input_does_not_change_instance(self, course_material):
        serializer = CourseMaterialSerializer(
            course_material,
            data={"original_filename": "hacked.pdf", "file_size_bytes": 999999},
            partial=True,
        )
        assert serializer.is_valid()
        assert course_material.original_filename == "doc.pdf"
        assert course_material.file_size_bytes == 500

    def test_meta_read_only_fields_match_all_fields(self):
        meta = CourseMaterialSerializer.Meta
        assert set(meta.fields) == set(meta.read_only_fields)


class TestAiGenerateQuestionSerializer:
    """Test cases for AiGenerateQuestionSerializer."""

    def test_requires_query(self):
        serializer = AiGenerateQuestionSerializer(data={})
        assert not serializer.is_valid()
        assert "query" in serializer.errors

    def test_rejects_query_over_max_length(self):
        long_q = "x" * 2001
        serializer = AiGenerateQuestionSerializer(data={"query": long_q})
        assert not serializer.is_valid()
        assert "query" in serializer.errors

    def test_accepts_query_at_max_length(self):
        q = "y" * 2000
        serializer = AiGenerateQuestionSerializer(data={"query": q})
        assert serializer.is_valid()
        assert serializer.validated_data["query"] == q

    def test_accepts_typical_query(self):
        serializer = AiGenerateQuestionSerializer(
            data={"query": "Explain photosynthesis."}
        )
        assert serializer.is_valid()
        assert serializer.validated_data["query"] == "Explain photosynthesis."

    def test_rejects_empty_string_query(self):
        serializer = AiGenerateQuestionSerializer(data={"query": ""})
        assert not serializer.is_valid()
        assert "query" in serializer.errors

    def test_rejects_query_when_not_scalar_string(self):
        serializer = AiGenerateQuestionSerializer(data={"query": ["not", "a", "string"]})
        assert not serializer.is_valid()
        assert "query" in serializer.errors

    def test_rejects_null_query(self):
        serializer = AiGenerateQuestionSerializer(data={"query": None})
        assert not serializer.is_valid()

    def test_extra_fields_ignored(self):
        serializer = AiGenerateQuestionSerializer(
            data={"query": "ok", "extra": "ignored"}
        )
        assert serializer.is_valid()
        assert "extra" not in serializer.validated_data

    def test_unicode_query(self):
        serializer = AiGenerateQuestionSerializer(data={"query": "你好 مرحبا 🎓"})
        assert serializer.is_valid()
        assert serializer.validated_data["query"] == "你好 مرحبا 🎓"
