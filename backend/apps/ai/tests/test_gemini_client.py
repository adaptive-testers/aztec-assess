"""Tests for gemini_client (embeddings, cosine similarity, RAG question generation)."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from django.test import override_settings

from apps.ai.services import gemini_client as gc


def test_cosine_similarity_mismatched_or_empty() -> None:
    assert gc.cosine_similarity([], [1.0]) == 0.0
    assert gc.cosine_similarity([1.0], [1.0, 2.0]) == 0.0
    assert gc.cosine_similarity([0.0, 0.0], [1.0, 0.0]) == 0.0


def test_cosine_similarity_parallel_unit_vectors() -> None:
    a = [1.0, 0.0, 0.0]
    b = [1.0, 0.0, 0.0]
    assert abs(gc.cosine_similarity(a, b) - 1.0) < 1e-9


def test_cosine_similarity_orthogonal() -> None:
    a = [1.0, 0.0]
    b = [0.0, 1.0]
    assert abs(gc.cosine_similarity(a, b)) < 1e-9


def test_estimate_tokens_via_embed_helpers() -> None:
    assert gc._estimate_tokens("") == 1
    assert gc._estimate_tokens("abcd") == 1


@override_settings(GEMINI_API_KEY="")
def test_ensure_configured_raises_without_key() -> None:
    gc._client_configured = False
    with pytest.raises(RuntimeError, match="GEMINI_API_KEY"):
        gc._ensure_configured()


@override_settings(GEMINI_API_KEY="test-key")
@patch("google.generativeai.embed_content")
@patch("google.generativeai.configure")
def test_embed_query_returns_embedding(
    mock_configure: object, mock_embed: object
) -> None:
    gc._client_configured = False
    mock_embed.return_value = {"embedding": [0.5, 0.5]}
    out = gc.embed_query("hello")
    assert out == [0.5, 0.5]
    mock_configure.assert_called_once()


@override_settings(GEMINI_API_KEY="test-key")
@patch("google.generativeai.embed_content")
@patch("google.generativeai.configure")
def test_embed_query_raises_when_no_embedding(
    _mock_configure: object, mock_embed: object
) -> None:
    gc._client_configured = False
    mock_embed.return_value = {}
    with pytest.raises(RuntimeError, match="no embedding"):
        gc.embed_query("x")


@override_settings(GEMINI_API_KEY="test-key")
@patch("google.generativeai.embed_content")
@patch("google.generativeai.configure")
def test_embed_texts_batches(
    _mock_configure: object, mock_embed: object
) -> None:
    gc._client_configured = False
    mock_embed.return_value = {"embedding": [1.0, 0.0]}
    out = gc.embed_texts(["a", "b"])
    assert len(out) == 2
    assert mock_embed.call_count == 2


@override_settings(GEMINI_API_KEY="test-key")
@patch("google.generativeai.embed_content")
@patch("google.generativeai.configure")
def test_embed_texts_raises_when_embedding_missing(
    _mock_configure: object, mock_embed: object
) -> None:
    gc._client_configured = False
    mock_embed.return_value = {}
    with pytest.raises(RuntimeError, match="no embedding"):
        gc.embed_texts(["only"])


@pytest.mark.django_db
@override_settings(GEMINI_API_KEY="test-key")
@patch(
    "apps.ai.services.gemini_client._create_question_tool",
    return_value=MagicMock(),
)
@patch("google.generativeai.GenerativeModel")
@patch("google.generativeai.configure")
def test_generate_question_with_rag_returns_tool_args(
    _mock_tool: object, mock_model_cls: object, _mock_configure: object
) -> None:
    gc._client_configured = False

    fc = MagicMock()
    fc.name = "create_question"
    fc.args = {
        "question_text": "Q?",
        "answer_options": ["a", "b", "c", "d"],
        "correct_answer": 0,
        "difficulty": "MEDIUM",
        "suggested_topics": [],
    }
    part = MagicMock()
    part.function_call = fc
    cand = MagicMock()
    cand.content.parts = [part]
    response = MagicMock()
    response.candidates = [cand]

    model_inst = MagicMock()
    model_inst.generate_content.return_value = response
    mock_model_cls.return_value = model_inst

    args = gc.generate_question_with_rag(
        context_chunks=["ctx"],
        user_query="make a question",
        log_user_id=None,
        log_course_id=None,
    )
    assert args["question_text"] == "Q?"
    model_inst.generate_content.assert_called_once()


@pytest.mark.django_db
@override_settings(GEMINI_API_KEY="test-key")
@patch(
    "apps.ai.services.gemini_client._create_question_tool",
    return_value=MagicMock(),
)
@patch("google.generativeai.GenerativeModel")
@patch("google.generativeai.configure")
def test_generate_question_raises_no_candidates(
    _mock_tool: object, mock_model_cls: object, _mock_configure: object
) -> None:
    gc._client_configured = False
    model_inst = MagicMock()
    model_inst.generate_content.return_value = MagicMock(candidates=[])
    mock_model_cls.return_value = model_inst

    with pytest.raises(ValueError, match="No candidates"):
        gc.generate_question_with_rag(
            context_chunks=["x"],
            user_query="q",
            log_user_id=None,
            log_course_id=None,
        )


@pytest.mark.django_db
@override_settings(GEMINI_API_KEY="test-key")
@patch(
    "apps.ai.services.gemini_client._create_question_tool",
    return_value=MagicMock(),
)
@patch("google.generativeai.GenerativeModel")
@patch("google.generativeai.configure")
def test_generate_question_raises_wrong_tool(
    _mock_tool: object, mock_model_cls: object, _mock_configure: object
) -> None:
    gc._client_configured = False
    fc = MagicMock()
    fc.name = "other_tool"
    part = MagicMock()
    part.function_call = fc
    response = MagicMock()
    response.candidates = [MagicMock(content=MagicMock(parts=[part]))]
    mock_model_cls.return_value.generate_content.return_value = response

    with pytest.raises(ValueError, match="Unexpected tool"):
        gc.generate_question_with_rag(
            context_chunks=["x"],
            user_query="q",
            log_user_id=None,
            log_course_id=None,
        )


@pytest.mark.django_db
@override_settings(GEMINI_API_KEY="test-key")
@patch(
    "apps.ai.services.gemini_client._create_question_tool",
    return_value=MagicMock(),
)
@patch("google.generativeai.GenerativeModel")
@patch("google.generativeai.configure")
def test_generate_question_raises_when_no_tool_call(
    _mock_tool: object, mock_model_cls: object, _mock_configure: object
) -> None:
    gc._client_configured = False
    part = MagicMock()
    part.function_call = None
    response = MagicMock()
    response.candidates = [MagicMock(content=MagicMock(parts=[part]))]
    mock_model_cls.return_value.generate_content.return_value = response

    with pytest.raises(ValueError, match="did not return"):
        gc.generate_question_with_rag(
            context_chunks=["x"],
            user_query="q",
            log_user_id=None,
            log_course_id=None,
        )
