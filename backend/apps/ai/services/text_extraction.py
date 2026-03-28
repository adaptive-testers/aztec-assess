"""Extract plain text from supported upload types."""

from __future__ import annotations

import io
from pathlib import Path

from pypdf import PdfReader


def extract_text(*, storage_key: str, mime_type: str) -> str:
    """Load file from GCS or local MEDIA_ROOT and return extracted text."""
    raw = _read_bytes(storage_key)

    mt = (mime_type or "").lower()
    if "pdf" in mt or storage_key.lower().endswith(".pdf"):
        reader = PdfReader(io.BytesIO(raw))
        parts: list[str] = []
        for page in reader.pages:
            parts.append(page.extract_text() or "")
        return "\n".join(parts).strip()

    if mt.startswith("text/") or Path(storage_key).suffix.lower() in {".txt", ".md"}:
        return raw.decode("utf-8", errors="replace").strip()

    raise ValueError(f"Unsupported file type for text extraction: {mime_type or 'unknown'}")


def _read_bytes(storage_key: str) -> bytes:
    from django.conf import settings

    if getattr(settings, "GCS_BUCKET_NAME", ""):
        from google.cloud import storage  # type: ignore[import-untyped]

        client = storage.Client()
        bucket = client.bucket(settings.GCS_BUCKET_NAME)
        blob = bucket.blob(storage_key)
        data: bytes = blob.download_as_bytes()
        return data

    path = Path(settings.MEDIA_ROOT) / storage_key
    return path.read_bytes()
