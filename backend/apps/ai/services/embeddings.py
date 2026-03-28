"""Semantic chunking and embedding via centralized Gemini client."""

from __future__ import annotations

from apps.ai.services import gemini_client

# Rough token estimate: chars / 4
CHUNK_TARGET_CHARS = 1200
CHUNK_OVERLAP_CHARS = 200


def chunk_text(text: str) -> list[str]:
    """Split text into overlapping chunks by character windows (semantic chunking MVP)."""
    text = text.strip()
    if not text:
        return []

    chunks: list[str] = []
    start = 0
    n = len(text)
    while start < n:
        end = min(start + CHUNK_TARGET_CHARS, n)
        piece = text[start:end].strip()
        if piece:
            chunks.append(piece)
        if end >= n:
            break
        start = end - CHUNK_OVERLAP_CHARS
        if start < 0:
            start = 0
    return chunks


def embed_chunks(texts: list[str]) -> list[list[float]]:
    """Return one embedding vector per chunk (768 dims for Gemini text-embedding-004)."""
    if not texts:
        return []
    return gemini_client.embed_texts(texts)
