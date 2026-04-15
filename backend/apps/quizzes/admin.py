from django.contrib import admin

from .models import (
    AttemptAnswer,
    Chapter,
    Question,
    QuestionIRTParameter,
    Quiz,
    QuizAttempt,
    StudentAbility,
    StudentTopicMastery,
    TopicBKTParameter,
)


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


@admin.register(StudentAbility)
class StudentAbilityAdmin(admin.ModelAdmin):
    list_display = ("id", "student", "theta", "last_updated")


@admin.register(QuestionIRTParameter)
class QuestionIRTParameterAdmin(admin.ModelAdmin):
    list_display = ("id", "question", "difficulty_b", "last_updated")


@admin.register(StudentTopicMastery)
class StudentTopicMasteryAdmin(admin.ModelAdmin):
    list_display = ("id", "student", "topic", "p_knowledge", "last_updated")


@admin.register(TopicBKTParameter)
class TopicBKTParameterAdmin(admin.ModelAdmin):
    list_display = ("id", "topic", "p_l0", "p_t", "p_g", "p_s", "last_updated")
