"""Tests for material_processing.process_course_material."""

from __future__ import annotations

from typing import TYPE_CHECKING, cast
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model

if TYPE_CHECKING:
    from apps.accounts.models import User

from apps.ai.models import CourseMaterial, MaterialChunk, MaterialProcessingStatus
from apps.ai.services import material_processing as mp
from apps.courses.models import Course

UserModel = cast("type[User]", get_user_model())


@pytest.fixture
def course_and_material() -> tuple[Course, CourseMaterial]:
    owner = UserModel.objects.create_user(
        email="mp-owner@example.com",
        password="pw",
        first_name="O",
    )
    course = Course.objects.create(title="MP Course", owner=owner)
    mat = CourseMaterial.objects.create(
        course=course,
        uploaded_by=owner,
        original_filename="doc.pdf",
        gcs_object_key="course_materials/x/a.pdf",
        mime_type="application/pdf",
        processing_status=MaterialProcessingStatus.PENDING,
    )
    return course, mat


@pytest.mark.django_db
@patch("apps.ai.services.material_processing.emb_svc.embed_chunks")
@patch("apps.ai.services.material_processing.emb_svc.chunk_text")
@patch("apps.ai.services.material_processing.text_extraction.extract_text")
def test_process_success_writes_chunks(
    mock_extract: object,
    mock_chunk: object,
    mock_embed: object,
    course_and_material: tuple[Course, CourseMaterial],
) -> None:
    _course, mat = course_and_material
    mock_extract.return_value = "body text here"
    mock_chunk.return_value = ["only"]
    mock_embed.return_value = [[0.1, 0.2, 0.3]]

    mp.process_course_material(str(mat.pk))

    mat.refresh_from_db()
    assert mat.processing_status == MaterialProcessingStatus.READY
    assert MaterialChunk.objects.filter(material=mat).count() == 1


@pytest.mark.django_db
@patch("apps.ai.services.material_processing.emb_svc.chunk_text")
@patch("apps.ai.services.material_processing.text_extraction.extract_text")
def test_process_fails_when_no_chunks(
    mock_extract: object,
    mock_chunk: object,
    course_and_material: tuple[Course, CourseMaterial],
) -> None:
    _course, mat = course_and_material
    mock_extract.return_value = "x"
    mock_chunk.return_value = []

    mp.process_course_material(str(mat.pk))

    mat.refresh_from_db()
    assert mat.processing_status == MaterialProcessingStatus.FAILED
    assert "No extractable text" in mat.processing_error


@pytest.mark.django_db
@patch("apps.ai.services.material_processing.emb_svc.embed_chunks")
@patch("apps.ai.services.material_processing.emb_svc.chunk_text")
@patch("apps.ai.services.material_processing.text_extraction.extract_text")
def test_process_raises_on_embedding_mismatch(
    mock_extract: object,
    mock_chunk: object,
    mock_embed: object,
    course_and_material: tuple[Course, CourseMaterial],
) -> None:
    _course, mat = course_and_material
    mock_extract.return_value = "a"
    mock_chunk.return_value = ["a", "b"]
    mock_embed.return_value = [[0.1]]

    with pytest.raises(RuntimeError, match="Embedding count mismatch"):
        mp.process_course_material(str(mat.pk))

    mat.refresh_from_db()
    assert mat.processing_status == MaterialProcessingStatus.FAILED
