"""Tests for text_extraction.extract_text."""

from __future__ import annotations

from pathlib import Path  # noqa: TC003
from unittest.mock import MagicMock, patch

import pytest
from django.test import override_settings

from apps.ai.services import text_extraction as te


def test_extract_text_plain_from_local_file(tmp_path: Path) -> None:
    key = "course_materials/c1/hello.txt"
    full = tmp_path / key
    full.parent.mkdir(parents=True)
    full.write_bytes(b"  hello world  \n")

    with override_settings(MEDIA_ROOT=str(tmp_path)):
        out = te.extract_text(storage_key=key, mime_type="text/plain")
    assert out == "hello world"


def test_extract_text_txt_suffix_even_if_mime_odd(tmp_path: Path) -> None:
    key = "course_materials/c1/note.txt"
    full = tmp_path / key
    full.parent.mkdir(parents=True)
    full.write_bytes(b"line")

    with override_settings(MEDIA_ROOT=str(tmp_path)):
        out = te.extract_text(storage_key=key, mime_type="application/octet-stream")
    assert "line" in out


@override_settings(GCS_BUCKET_NAME="bucket")
@patch("google.cloud.storage.Client")
def test_extract_reads_from_gcs_when_configured(mock_client_cls: object) -> None:
    blob = MagicMock()
    blob.download_as_bytes.return_value = b"%PDF-1.4\n"
    bucket = MagicMock()
    bucket.blob.return_value = blob
    mock_client_cls.return_value.bucket.return_value = bucket

    with patch.object(te, "PdfReader") as mock_pdf_cls:
        reader = MagicMock()
        page = MagicMock()
        page.extract_text.return_value = "Page1"
        reader.pages = [page]
        mock_pdf_cls.return_value = reader

        out = te.extract_text(storage_key="k/file.pdf", mime_type="application/pdf")
    assert out == "Page1"


def test_extract_unsupported_type_raises(tmp_path: Path) -> None:
    key = "course_materials/c1/x.bin"
    full = tmp_path / key
    full.parent.mkdir(parents=True)
    full.write_bytes(b"\x00\x01")

    with (
        override_settings(MEDIA_ROOT=str(tmp_path)),
        pytest.raises(ValueError, match="Unsupported file type"),
    ):
        te.extract_text(storage_key=key, mime_type="application/octet-stream")
