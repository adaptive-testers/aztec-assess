from typing import Any, cast

from rest_framework import serializers

from .models import Chapter, Question, Quiz, QuizAttempt


class ChapterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chapter
        fields = ("id", "course", "title", "order_index")
        read_only_fields = ("id", "course")


class ChapterStudentSerializer(serializers.ModelSerializer):
    """Minimal chapter for students: chapters that have published quizzes."""

    class Meta:
        model = Chapter
        fields = ("id", "title", "order_index", "course")


class QuestionCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = (
            "id",
            "chapter",
            "prompt",
            "choices",
            "correct_index",
            "difficulty",
            "created_by",
            "is_active",
            "created_at",
        )
        read_only_fields = ("id", "chapter", "created_by", "created_at")

    def validate_choices(self, value: object) -> list[Any]:
        if not isinstance(value, list) or len(value) != 4:
            raise serializers.ValidationError("choices must be a list of 4 options.")
        return value

    def validate_correct_index(self, value: int) -> int:
        if value < 0 or value > 3:
            raise serializers.ValidationError("correct_index must be between 0 and 3.")
        return value


class QuestionStudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ("id", "prompt", "choices", "difficulty")


class QuizSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quiz
        fields = (
            "id",
            "chapter",
            "title",
            "adaptive_enabled",
            "selection_mode",
            "num_questions",
            "is_published",
            "created_at",
        )
        read_only_fields = ("id", "chapter", "created_at")


class QuizStudentSerializer(serializers.ModelSerializer):
    """Quiz list for students: includes nested chapter and attempt status for routing (continue/view results)."""

    chapter = ChapterStudentSerializer(read_only=True)
    attempt_status = serializers.SerializerMethodField()
    attempt_id = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = (
            "id",
            "chapter",
            "title",
            "num_questions",
            "is_published",
            "created_at",
            "attempt_status",
            "attempt_id",
        )
        read_only_fields = ("id", "created_at")

    def get_attempt_status(self, obj: Quiz) -> str | None:
        """Return the current user's latest attempt status for this quiz, or None if no attempt."""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        attempts = obj.attempts  # type: ignore[attr-defined]
        value = (
            attempts.filter(student=request.user)
            .order_by("-started_at")
            .values_list("status", flat=True)
            .first()
        )
        return cast("str | None", value)

    def get_attempt_id(self, obj: Quiz) -> int | None:
        """Return the current user's latest attempt id for this quiz, or None if no attempt."""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        attempts = obj.attempts  # type: ignore[attr-defined]
        value = (
            attempts.filter(student=request.user)
            .order_by("-started_at")
            .values_list("pk", flat=True)
            .first()
        )
        return cast("int | None", value)


class AttemptDetailSerializer(serializers.ModelSerializer):
    score_percent = serializers.SerializerMethodField()
    current_question = QuestionStudentSerializer(read_only=True, allow_null=True)

    class Meta:
        model = QuizAttempt
        fields = (
            "id",
            "quiz",
            "student",
            "status",
            "started_at",
            "ended_at",
            "current_difficulty",
            "num_answered",
            "num_correct",
            "score_percent",
            "current_question",
        )
        read_only_fields = fields

    def get_score_percent(self, obj: QuizAttempt) -> float:
        """Return score as a percentage 0–100 (e.g. 70.0 for 7/10 correct)."""
        if obj.num_answered == 0:
            return 0.0
        return float(round(100.0 * obj.num_correct / obj.num_answered, 2))


class AttemptAnswerSubmitSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    selected_index = serializers.IntegerField()

    def validate_selected_index(self, value: int) -> int:
        if value < 0 or value > 3:
            raise serializers.ValidationError("selected_index must be between 0 and 3.")
        return value
