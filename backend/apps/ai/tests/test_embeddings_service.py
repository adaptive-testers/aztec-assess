"""Tests for embeddings.chunk_text and embed_chunks."""

from __future__ import annotations

from unittest.mock import patch

from apps.ai.services import embeddings as emb
from apps.ai.services.embeddings import CHUNK_TARGET_CHARS


def test_chunk_text_empty_and_whitespace_only() -> None:
    assert emb.chunk_text("") == []
    assert emb.chunk_text("   ") == []


def test_chunk_text_single_short_piece() -> None:
    assert emb.chunk_text("Hello world") == ["Hello world"]


def test_chunk_text_splits_long_text_with_overlap() -> None:
    piece = "x" * CHUNK_TARGET_CHARS
    text = piece + "y" * CHUNK_TARGET_CHARS
    chunks = emb.chunk_text(text)
    assert len(chunks) >= 2
    joined = "".join(chunks)
    assert "x" in joined and "y" in joined


def test_chunk_text_advances_by_target_minus_overlap() -> None:
    block = "a" * CHUNK_TARGET_CHARS + "b" * CHUNK_TARGET_CHARS
    chunks = emb.chunk_text(block)
    assert len(chunks) >= 2


@patch("apps.ai.services.embeddings.gemini_client.embed_texts")
def test_embed_chunks_empty_input(mock_embed: object) -> None:
    assert emb.embed_chunks([]) == []
    mock_embed.assert_not_called()


@patch("apps.ai.services.embeddings.gemini_client.embed_texts")
def test_embed_chunks_delegates_to_gemini(mock_embed: object) -> None:
    mock_embed.return_value = [[0.1, 0.2], [0.3, 0.4]]
    out = emb.embed_chunks(["a", "b"])
    assert out == [[0.1, 0.2], [0.3, 0.4]]
    mock_embed.assert_called_once_with(["a", "b"])
