"""
Tests for CourseMaterial, MaterialChunk, and AiInteractionLog models.
"""

import uuid
from typing import TYPE_CHECKING, cast

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError

if TYPE_CHECKING:
    from apps.accounts.models import User

from apps.ai.models import (
    AiInteractionLog,
    CourseMaterial,
    MaterialChunk,
    MaterialProcessingStatus,
)
from apps.courses.models import Course

UserModel = cast("type[User]", get_user_model())


@pytest.fixture
def user():
    return UserModel.objects.create_user(
        email="ai-owner@example.com",
        first_name="Owner",
        last_name="User",
        password="testpass123",
        role="instructor",
    )


@pytest.fixture
def course(user):
    return Course.objects.create(
        title="AI Test Course",
        owner=user,
        status=Course.CourseStatus.DRAFT,
    )


@pytest.fixture
def course_material(course, user):
    return CourseMaterial.objects.create(
        course=course,
        uploaded_by=user,
        original_filename="slides.pdf",
        gcs_object_key="course_materials/x/slides.pdf",
        mime_type="application/pdf",
        file_size_bytes=1024,
        processing_status=MaterialProcessingStatus.PENDING,
    )


@pytest.mark.django_db
def test_course_material_creation(course_material, course, user):
    assert course_material.course == course
    assert course_material.uploaded_by == user
    assert course_material.original_filename == "slides.pdf"
    assert course_material.processing_status == MaterialProcessingStatus.PENDING
    assert course_material.processing_error == ""
    assert course_material.created_at is not None
    assert course_material.updated_at is not None


@pytest.mark.django_db
def test_course_material_str(course_material):
    s = str(course_material)
    assert "slides.pdf" in s
    assert MaterialProcessingStatus.PENDING in s


@pytest.mark.django_db
def test_course_material_status_failed(course, user):
    mat = CourseMaterial.objects.create(
        course=course,
        uploaded_by=user,
        original_filename="bad.pdf",
        gcs_object_key="k",
        processing_status=MaterialProcessingStatus.FAILED,
        processing_error="extraction failed",
    )
    assert mat.processing_status == MaterialProcessingStatus.FAILED
    assert mat.processing_error == "extraction failed"


@pytest.mark.django_db
def test_course_material_status_processing_and_ready(course, user):
    m1 = CourseMaterial.objects.create(
        course=course,
        uploaded_by=user,
        original_filename="a.pdf",
        gcs_object_key="k1",
        processing_status=MaterialProcessingStatus.PROCESSING,
    )
    m2 = CourseMaterial.objects.create(
        course=course,
        uploaded_by=user,
        original_filename="b.pdf",
        gcs_object_key="k2",
        processing_status=MaterialProcessingStatus.READY,
    )
    assert m1.processing_status == MaterialProcessingStatus.PROCESSING
    assert m2.processing_status == MaterialProcessingStatus.READY


@pytest.mark.django_db
def test_course_material_uploaded_by_nullable(course):
    mat = CourseMaterial.objects.create(
        course=course,
        uploaded_by=None,
        original_filename="orphan.pdf",
        gcs_object_key="k",
    )
    assert mat.uploaded_by is None


@pytest.mark.django_db
def test_course_material_default_file_size_and_mime(course, user):
    mat = CourseMaterial.objects.create(
        course=course,
        uploaded_by=user,
        original_filename="empty.bin",
        gcs_object_key="k",
    )
    assert mat.file_size_bytes == 0
    assert mat.mime_type == ""


@pytest.mark.django_db
def test_course_material_uuid_primary_key(course_material):
    assert isinstance(course_material.pk, uuid.UUID)


@pytest.mark.django_db
def test_material_chunk_creation(course_material):
    chunk = MaterialChunk.objects.create(
        material=course_material,
        chunk_index=0,
        text="Hello world",
        embedding=[0.1, 0.2],
        token_count=2,
    )
    assert chunk.material == course_material
    assert chunk.chunk_index == 0
    assert chunk.embedding == [0.1, 0.2]


@pytest.mark.django_db
def test_material_chunk_unique_together(course_material):
    MaterialChunk.objects.create(
        material=course_material,
        chunk_index=0,
        text="a",
        embedding=[],
    )
    with pytest.raises(IntegrityError):
        MaterialChunk.objects.create(
            material=course_material,
            chunk_index=0,
            text="b",
            embedding=[],
        )


@pytest.mark.django_db
def test_material_chunk_same_index_different_materials(course_material, course, user):
    other = CourseMaterial.objects.create(
        course=course,
        uploaded_by=user,
        original_filename="other.pdf",
        gcs_object_key="k2",
    )
    MaterialChunk.objects.create(
        material=course_material, chunk_index=0, text="a", embedding=[]
    )
    MaterialChunk.objects.create(material=other, chunk_index=0, text="b", embedding=[])
    assert MaterialChunk.objects.filter(chunk_index=0).count() == 2


@pytest.mark.django_db
def test_material_chunk_ordering_follows_meta(course_material):
    MaterialChunk.objects.create(
        material=course_material, chunk_index=2, text="c", embedding=[]
    )
    MaterialChunk.objects.create(
        material=course_material, chunk_index=0, text="a", embedding=[]
    )
    MaterialChunk.objects.create(
        material=course_material, chunk_index=1, text="b", embedding=[]
    )
    texts = list(
        MaterialChunk.objects.filter(material=course_material).values_list(
            "text", flat=True
        )
    )
    assert texts == ["a", "b", "c"]


@pytest.mark.django_db
def test_material_chunk_str(course_material):
    chunk = MaterialChunk.objects.create(
        material=course_material,
        chunk_index=3,
        text="x",
        embedding=[],
    )
    assert "3" in str(chunk)
    assert str(course_material.pk) in str(chunk)


@pytest.mark.django_db
def test_delete_material_cascades_chunks(course_material):
    MaterialChunk.objects.create(
        material=course_material, chunk_index=0, text="x", embedding=[]
    )
    mid = course_material.pk
    course_material.delete()
    assert MaterialChunk.objects.filter(material_id=mid).count() == 0


@pytest.mark.django_db
def test_material_chunk_token_count_optional(course_material):
    ch = MaterialChunk.objects.create(
        material=course_material,
        chunk_index=0,
        text="t",
        embedding=[],
        token_count=None,
    )
    assert ch.token_count is None


@pytest.mark.django_db
def test_ai_interaction_log_full(user, course):
    log = AiInteractionLog.objects.create(
        user=user,
        course=course,
        operation="embed_query",
        model_name="gemini-test",
        prompt_tokens=10,
        response_tokens=5,
        metadata={"k": "v"},
    )
    assert log.user == user
    assert log.course == course
    assert log.operation == "embed_query"
    assert log.metadata == {"k": "v"}
    assert log.created_at is not None
    assert "embed_query" in str(log)


@pytest.mark.django_db
def test_ai_interaction_log_null_user_and_course():
    log = AiInteractionLog.objects.create(
        user=None,
        course=None,
        operation="system",
    )
    assert log.user is None
    assert log.course is None


@pytest.mark.django_db
def test_ai_interaction_log_metadata_defaults_empty(user, course):
    log = AiInteractionLog.objects.create(
        user=user,
        course=course,
        operation="generate",
    )
    assert log.metadata == {}
