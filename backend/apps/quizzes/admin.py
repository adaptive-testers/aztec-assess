from django.contrib import admin

from .models import AttemptAnswer, Chapter, Question, Quiz, QuizAttempt


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 0

@admin.register(Chapter)
class ChapterAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "course")

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("id", "chapter", "difficulty", "is_active", "created_by")
    list_filter = ("difficulty", "chapter", "is_active")

@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "chapter", "num_questions", "adaptive_enabled", "selection_mode", "is_published")

@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ("id", "student", "quiz", "status", "current_difficulty", "num_correct", "num_answered")


admin.site.register(AttemptAnswer)
