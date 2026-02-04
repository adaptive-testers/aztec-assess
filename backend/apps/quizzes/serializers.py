from rest_framework import serializers
from .models import Chapter, Question, QuizAttempt, AttemptAnswer

class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ("id", "chapter", "prompt", "choices", "correct_choice", "difficulty", "created_by", "created_at")
        read_only_fields = ("id", "created_by", "created_at")

class QuestionStudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ("id", "prompt", "choices", "difficulty")

class ChapterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chapter
        fields = ("id", "course", "title", "order_index")

class AttemptAnswerSerializer(serializers.ModelSerializer):
    question_id = serializers.IntegerField(write_only=True)
    selected_choice = serializers.IntegerField(allow_null=True)

    class Meta:
        model = AttemptAnswer
        fields = ("id", "question_id", "selected_choice", "is_correct", "answered_at")
        read_only_fields = ("id", "is_correct", "answered_at")

class QuizAttemptSerializer(serializers.ModelSerializer):
    answers = AttemptAnswerSerializer(many=True, write_only=True, required=False)
    score = serializers.SerializerMethodField()

    class Meta:
        model = QuizAttempt
        fields = ("id", "student", "chapter", "mode", "started_at", "ended_at", "status", "current_difficulty", "num_answered", "num_correct", "answers", "score")
        read_only_fields = ("id", "started_at", "ended_at", "status", "num_answered", "num_correct", "score")

    def get_score(self, obj):
        return obj.calculate_score()