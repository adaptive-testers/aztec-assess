"""Serializers for course materials and AI generation requests."""

from rest_framework import serializers

from apps.ai.models import CourseMaterial


class CourseMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseMaterial
        fields = (
            "id",
            "original_filename",
            "mime_type",
            "file_size_bytes",
            "processing_status",
            "processing_error",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class AiGenerateQuestionSerializer(serializers.Serializer):
    query = serializers.CharField(max_length=2000)
