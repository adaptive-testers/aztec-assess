"""Models for course materials, chunks, and AI observability."""

import uuid

from django.conf import settings
from django.db import models


class MaterialProcessingStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    PROCESSING = "PROCESSING", "Processing"
    READY = "READY", "Ready"
    FAILED = "FAILED", "Failed"


class CourseMaterial(models.Model):
    """Instructor-uploaded file metadata; content lives in GCS or local storage."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        "courses.Course",
        on_delete=models.CASCADE,
        related_name="course_materials",
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="uploaded_materials",
    )
    original_filename = models.CharField(max_length=512)
    gcs_object_key = models.CharField(
        max_length=1024,
        help_text="Object key in bucket or relative path under MEDIA_ROOT for local dev.",
    )
    mime_type = models.CharField(max_length=128, blank=True)
    file_size_bytes = models.PositiveIntegerField(default=0)
    processing_status = models.CharField(
        max_length=16,
        choices=MaterialProcessingStatus.choices,
        default=MaterialProcessingStatus.PENDING,
        db_index=True,
    )
    processing_error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["course", "processing_status"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.original_filename} ({self.processing_status})"


class MaterialChunk(models.Model):
    """Semantic chunk with embedding stored as JSON array (768 floats); PGVector migration optional."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    material = models.ForeignKey(
        CourseMaterial,
        on_delete=models.CASCADE,
        related_name="chunks",
    )
    chunk_index = models.PositiveIntegerField()
    text = models.TextField()
    # JSON list of floats; compatible with SQLite (tests) and Postgres JSONB
    embedding = models.JSONField(default=list)
    token_count = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["material", "chunk_index"]
        unique_together = ("material", "chunk_index")
        indexes = [
            models.Index(fields=["material", "chunk_index"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"Chunk {self.chunk_index} of {self.material.pk}"


class AiInteractionLog(models.Model):
    """Audit log for Gemini calls (tokens, operation type)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="ai_logs",
    )
    course = models.ForeignKey(
        "courses.Course",
        on_delete=models.SET_NULL,
        null=True,
        related_name="ai_logs",
    )
    operation = models.CharField(max_length=64, db_index=True)
    model_name = models.CharField(max_length=128, blank=True)
    prompt_tokens = models.IntegerField(null=True, blank=True)
    response_tokens = models.IntegerField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["operation", "created_at"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.operation} @ {self.created_at}"
