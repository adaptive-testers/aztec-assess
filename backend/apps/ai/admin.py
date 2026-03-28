from django.contrib import admin

from .models import AiInteractionLog, CourseMaterial, MaterialChunk


@admin.register(CourseMaterial)
class CourseMaterialAdmin(admin.ModelAdmin):
    list_display = ("original_filename", "course", "processing_status", "created_at")
    list_filter = ("processing_status",)


@admin.register(MaterialChunk)
class MaterialChunkAdmin(admin.ModelAdmin):
    list_display = ("material", "chunk_index", "created_at")


@admin.register(AiInteractionLog)
class AiInteractionLogAdmin(admin.ModelAdmin):
    list_display = ("operation", "model_name", "created_at")
    list_filter = ("operation",)
