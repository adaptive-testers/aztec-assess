"""Tests for rag.retrieve_context_chunks."""

from __future__ import annotations

from typing import TYPE_CHECKING, cast
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model

if TYPE_CHECKING:
    from apps.accounts.models import User

from apps.ai.models import CourseMaterial, MaterialChunk, MaterialProcessingStatus
from apps.ai.services import rag as rag_svc
from apps.courses.models import Course

UserModel = cast("type[User]", get_user_model())


@pytest.fixture
def course() -> Course:
    owner = UserModel.objects.create_user(
        email="rag-owner@example.com",
        password="pw",
        first_name="O",
    )
    return Course.objects.create(title="RAG Course", owner=owner)


@pytest.mark.django_db
@patch("apps.ai.services.rag.gemini_client.cosine_similarity")
@patch("apps.ai.services.rag.gemini_client.embed_query")
def test_retrieve_returns_top_k_by_similarity(
    mock_embed_q: object, mock_cos: object, course: Course
) -> None:
    mock_embed_q.return_value = [1.0, 0.0, 0.0]
    mock_cos.side_effect = [0.2, 0.9]

    mat = CourseMaterial.objects.create(
        course=course,
        uploaded_by=None,
        original_filename="f.pdf",
        gcs_object_key="k",
        processing_status=MaterialProcessingStatus.READY,
    )
    emb = [1.0, 0.0, 0.0]
    MaterialChunk.objects.create(
        material=mat,
        chunk_index=0,
        text="low",
        embedding=emb,
    )
    MaterialChunk.objects.create(
        material=mat,
        chunk_index=1,
        text="high",
        embedding=emb,
    )

    out = rag_svc.retrieve_context_chunks(
        course_id=str(course.pk),
        query_text="q",
        top_k=1,
    )
    assert out == ["high"]


@pytest.mark.django_db
@patch("apps.ai.services.rag.gemini_client.embed_query")
def test_retrieve_skips_mismatched_embedding_length(
    mock_embed_q: object, course: Course
) -> None:
    mock_embed_q.return_value = [1.0, 0.0]
    mat = CourseMaterial.objects.create(
        course=course,
        uploaded_by=None,
        original_filename="f.pdf",
        gcs_object_key="k",
        processing_status=MaterialProcessingStatus.READY,
    )
    MaterialChunk.objects.create(
        material=mat,
        chunk_index=0,
        text="bad",
        embedding=[1.0],
    )

    out = rag_svc.retrieve_context_chunks(
        course_id=str(course.pk),
        query_text="q",
        top_k=5,
    )
    assert out == []


@pytest.mark.django_db
@patch("apps.ai.services.rag.gemini_client.embed_query")
def test_retrieve_empty_when_no_chunks(mock_embed_q: object, course: Course) -> None:
    mock_embed_q.return_value = [1.0]
    assert (
        rag_svc.retrieve_context_chunks(
            course_id=str(course.pk),
            query_text="q",
        )
        == []
    )
