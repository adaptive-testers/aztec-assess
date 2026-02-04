from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Chapter, Question, QuizAttempt, AttemptAnswer
from .serializers import ChapterSerializer, QuestionSerializer, QuestionStudentSerializer, QuizAttemptSerializer
from .services.selection import next_difficulty_after, select_next_question

class ChapterViewSet(viewsets.ModelViewSet):
    queryset = Chapter.objects.all()
    serializer_class = ChapterSerializer

class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class AttemptViewSet(viewsets.ModelViewSet):
    queryset = QuizAttempt.objects.all()
    serializer_class = QuizAttemptSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            return QuizAttempt.objects.filter(student=user)
        return QuizAttempt.objects.none()

    @action(detail=True, methods=["GET"])
    def current(self, request, pk=None):
        attempt = self.get_object()
        answered_ids = list(attempt.answers.values_list("question_id", flat=True))
        q = select_next_question(attempt, answered_ids)
        if q is None:
            attempt.status = "COMPLETED"
            attempt.ended_at = timezone.now()
            attempt.save()
            return Response({"status": "COMPLETED", "score": attempt.calculate_score()})
        serializer = QuestionStudentSerializer(q)
        return Response({"question": serializer.data, "attempt_status": attempt.status})

    @action(detail=True, methods=["POST"])
    def answer(self, request, pk=None):
        attempt = self.get_object()
        if attempt.is_finished():
            return Response({"detail": "Attempt already completed"}, status=status.HTTP_400_BAD_REQUEST)
        ans = request.data.get("selected_choice")
        qid = request.data.get("question_id")
        try:
            q = Question.objects.get(id=qid, chapter=attempt.chapter)
        except Question.DoesNotExist:
            return Response({"detail": "question not found"}, status=status.HTTP_400_BAD_REQUEST)

        is_correct = (ans == q.correct_choice)
        aa = AttemptAnswer.objects.create(attempt=attempt, question=q, selected_choice=ans, is_correct=is_correct)

        attempt.num_answered += 1
        if is_correct:
            attempt.num_correct += 1
        attempt.current_difficulty = next_difficulty_after(attempt.current_difficulty, is_correct)
        attempt.save()

        answered_ids = list(attempt.answers.values_list("question_id", flat=True))
        next_q = select_next_question(attempt, answered_ids)
        if next_q is None:
            attempt.status = "COMPLETED"
            attempt.ended_at = timezone.now()
            attempt.save()
            return Response({"is_correct": is_correct, "score": attempt.calculate_score(), "attempt_status": "COMPLETED"})

        serializer = QuestionStudentSerializer(next_q)
        return Response({"is_correct": is_correct, "score": attempt.calculate_score(), "attempt_status": "IN_PROGRESS", "next_question": serializer.data})
    