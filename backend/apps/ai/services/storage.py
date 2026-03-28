"""Upload course materials to GCS or local MEDIA_ROOT when GCS is not configured."""

from __future__ import annotations

import uuid
from pathlib import Path
from typing import BinaryIO

from django.conf import settings


def _use_gcs() -> bool:
    return bool(getattr(settings, "GCS_BUCKET_NAME", ""))


def upload_material_file(
    *,
    course_id: str,
    file_obj: BinaryIO,
    filename: str,
    content_type: str,
) -> tuple[str, int]:
    """
    Store file and return (storage_key, size_bytes).

    When GCS_BUCKET_NAME is set, uploads to the private bucket.
    Otherwise writes under MEDIA_ROOT/course_materials/<course_id>/.
    """
    data = file_obj.read()
    size = len(data)
    safe_name = Path(filename).name
    key = f"course_materials/{course_id}/{uuid.uuid4().hex}_{safe_name}"

    if _use_gcs():
        from google.cloud import storage  # type: ignore[import-untyped]

        client = storage.Client()
        bucket = client.bucket(settings.GCS_BUCKET_NAME)
        blob = bucket.blob(key)
        blob.upload_from_string(data, content_type=content_type or "application/octet-stream")
        return key, size

    media_root = Path(settings.MEDIA_ROOT)
    dest = media_root / key
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return str(key), size


def delete_material_file(storage_key: str) -> None:
    """Remove object from GCS or local filesystem."""
    if _use_gcs():
        from google.cloud import storage

        client = storage.Client()
        bucket = client.bucket(settings.GCS_BUCKET_NAME)
        blob = bucket.blob(storage_key)
        blob.delete()
        return

    path = Path(settings.MEDIA_ROOT) / storage_key
    if path.is_file():
        path.unlink()
