"""Tests for safe local storage path resolution and upload basename handling."""

from pathlib import Path

import pytest
from django.test import override_settings

from apps.ai.services.storage import resolve_local_storage_path, safe_upload_basename


def test_safe_upload_basename_uses_final_segment_only() -> None:
    assert safe_upload_basename("../../../etc/passwd") == "passwd"
    assert safe_upload_basename("folder/notes.txt") == "notes.txt"


def test_safe_upload_basename_empty_or_dotdot() -> None:
    assert safe_upload_basename("..") == "upload"
    assert safe_upload_basename("") == "upload"
    assert safe_upload_basename("   ") == "upload"


def test_safe_upload_basename_preserves_simple_name() -> None:
    assert safe_upload_basename("slides.pdf") == "slides.pdf"


@pytest.mark.parametrize(
    "bad_key",
    [
        "",
        "   ",
        "a/../b",
        "../x",
        "x/../../y",
    ],
)
def test_resolve_local_rejects_traversal_or_empty(tmp_path: Path, bad_key: str) -> None:
    with (
        override_settings(MEDIA_ROOT=str(tmp_path)),
        pytest.raises(ValueError, match="Invalid storage key"),
    ):
        resolve_local_storage_path(bad_key)


def test_resolve_local_rejects_absolute_path(tmp_path: Path) -> None:
    other = tmp_path / "outside"
    other.mkdir()
    with (
        override_settings(MEDIA_ROOT=str(tmp_path)),
        pytest.raises(ValueError, match="Invalid storage key"),
    ):
        resolve_local_storage_path(str(other / "file.txt"))


def test_resolve_local_accepts_expected_material_key(tmp_path: Path) -> None:
    with override_settings(MEDIA_ROOT=str(tmp_path)):
        p = resolve_local_storage_path("course_materials/uuid/f_hello.txt")
        assert p == (tmp_path / "course_materials" / "uuid" / "f_hello.txt").resolve()


def test_resolve_local_normalized_stays_under_root(tmp_path: Path) -> None:
    """Symlinks or odd paths cannot escape MEDIA_ROOT (relative_to check)."""
    with override_settings(MEDIA_ROOT=str(tmp_path)):
        p = resolve_local_storage_path("course_materials/cid/abc.pdf")
        p.relative_to(tmp_path.resolve())
