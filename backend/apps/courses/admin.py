from django.contrib import admin

from .models import Topic


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ("name", "course", "created_at")
    list_filter = ("course",)
    search_fields = ("name",)
