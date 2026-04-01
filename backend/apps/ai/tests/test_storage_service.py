"""Tests for upload_material_file and delete_material_file (local + GCS)."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path  # noqa: TC003
from unittest.mock import MagicMock, patch

from django.test import override_settings

from apps.ai.services.storage import delete_material_file, upload_material_file


@override_settings(GCS_BUCKET_NAME="")
def test_upload_material_file_writes_local(tmp_path: Path) -> None:
    with override_settings(MEDIA_ROOT=str(tmp_path)):
        key, size = upload_material_file(
            course_id="course-uuid",
            file_obj=BytesIO(b"hello"),
            filename="notes.txt",
            content_type="text/plain",
        )
    assert size == 5
    assert key.startswith("course_materials/course-uuid/")
    assert key.endswith("_notes.txt")
    p = tmp_path / key
    assert p.read_bytes() == b"hello"


@override_settings(GCS_BUCKET_NAME="")
def test_delete_material_file_removes_local_file(tmp_path: Path) -> None:
    key = "course_materials/x/file.txt"
    full = tmp_path / key
    full.parent.mkdir(parents=True)
    full.write_bytes(b"x")

    with override_settings(MEDIA_ROOT=str(tmp_path)):
        delete_material_file(key)

    assert not full.exists()


@override_settings(GCS_BUCKET_NAME="")
def test_delete_material_file_noop_when_missing(tmp_path: Path) -> None:
    with override_settings(MEDIA_ROOT=str(tmp_path)):
        delete_material_file("course_materials/x/missing.txt")


@override_settings(GCS_BUCKET_NAME="test-bucket")
@patch("google.cloud.storage.Client")
def test_upload_material_file_gcs(mock_client_cls: object) -> None:
    mock_blob = MagicMock()
    mock_bucket = MagicMock()
    mock_bucket.blob.return_value = mock_blob
    mock_client = MagicMock()
    mock_client.bucket.return_value = mock_bucket
    mock_client_cls.return_value = mock_client

    key, size = upload_material_file(
        course_id="cid",
        file_obj=BytesIO(b"abc"),
        filename="a.pdf",
        content_type="application/pdf",
    )

    assert size == 3
    assert "course_materials/cid/" in key
    mock_blob.upload_from_string.assert_called_once_with(
        b"abc", content_type="application/pdf"
    )


@override_settings(GCS_BUCKET_NAME="test-bucket")
@patch("google.cloud.storage.Client")
def test_upload_gcs_uses_octet_stream_when_no_content_type(
    mock_client_cls: object,
) -> None:
    mock_blob = MagicMock()
    mock_bucket = MagicMock()
    mock_bucket.blob.return_value = mock_blob
    mock_client_cls.return_value.bucket.return_value = mock_bucket

    upload_material_file(
        course_id="cid",
        file_obj=BytesIO(b"x"),
        filename="f.bin",
        content_type="",
    )

    mock_blob.upload_from_string.assert_called_once_with(
        b"x", content_type="application/octet-stream"
    )


@override_settings(GCS_BUCKET_NAME="test-bucket")
@patch("google.cloud.storage.Client")
def test_delete_material_file_gcs(mock_client_cls: object) -> None:
    mock_blob = MagicMock()
    mock_client_cls.return_value.bucket.return_value.blob.return_value = mock_blob

    delete_material_file("course_materials/k/obj.pdf")

    mock_blob.delete.assert_called_once()
