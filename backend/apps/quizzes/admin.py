from django.contrib import admin
from .models import Chapter, Question, QuizAttempt, AttemptAnswer

class QuestionInline(admin.TabularInline):
    model = Question
    extra = 0

@admin.register(Chapter)
class ChapterAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "course")

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("id", "chapter", "difficulty", "created_by")
    list_filter = ("difficulty", "chapter")

@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ("id", "student", "chapter", "status", "current_difficulty", "num_correct", "num_answered")

admin.site.register(AttemptAnswer)