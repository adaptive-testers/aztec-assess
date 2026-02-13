from typing import Any

from django.db import IntegrityError
from django.db.models import QuerySet
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from apps.courses.models import Course, CourseMembership, CourseRole
from apps.courses.permissions import user_role

from .models import AttemptStatus, Chapter, Question, Quiz, QuizAttempt
from .serializers import (
    AttemptAnswerSubmitSerializer,
    AttemptDetailSerializer,
    ChapterSerializer,
    QuestionCreateUpdateSerializer,
    QuestionStudentSerializer,
    QuizSerializer,
    QuizStudentSerializer,
)
from .services.attempts import submit_answer
from .services.selection import select_next_question


def is_course_staff(user: Any, course: Course) -> bool:
    role = user_role(user, course)
    return role in {CourseRole.OWNER, CourseRole.INSTRUCTOR, CourseRole.TA}


def is_course_member(user: Any, course: Course) -> bool:
    return CourseMembership.objects.filter(user=user, course=course).exists()


class ChapterListCreateView(generics.ListCreateAPIView):
    serializer_class = ChapterSerializer
    permission_classes = [IsAuthenticated]

    def get_course(self) -> Course:
        return get_object_or_404(Course, id=self.kwargs["course_id"])

    def get_queryset(self) -> QuerySet[Chapter]:
        course = self.get_course()
        return Chapter.objects.filter(course=course).order_by("order_index", "created_at")

    def list(self, request: Request, *_args: Any, **_kwargs: Any) -> Response:
        course = self.get_course()
        if not is_course_staff(request.user, course):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        return super().list(request, *_args, **_kwargs)

    def create(self, request: Request, *_args: Any, **_kwargs: Any) -> Response:
        course = self.get_course()
        if not is_course_staff(request.user, course):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(course=course)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class QuestionListCreateView(generics.ListCreateAPIView):
    serializer_class = QuestionCreateUpdateSerializer
    permission_classes = [IsAuthenticated]

    def get_chapter(self) -> Chapter:
        return get_object_or_404(Chapter, id=self.kwargs["chapter_id"])

    def get_queryset(self) -> QuerySet[Question]:
        chapter = self.get_chapter()
        return Question.objects.filter(chapter=chapter).order_by("created_at")

    def list(self, request: Request, *_args: Any, **_kwargs: Any) -> Response:
        chapter = self.get_chapter()
        if not is_course_staff(request.user, chapter.course):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        return super().list(request, *_args, **_kwargs)

    def create(self, request: Request, *_args: Any, **_kwargs: Any) -> Response:
        chapter = self.get_chapter()
        if not is_course_staff(request.user, chapter.course):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(chapter=chapter, created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class QuestionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Staff can retrieve/update/destroy; students get questions only via attempt flow."""

    serializer_class = QuestionCreateUpdateSerializer
    permission_classes = [IsAuthenticated]
    queryset = Question.objects.all()

    def retrieve(self, request: Request, *_args: Any, **_kwargs: Any) -> Response:
        question = self.get_object()
        if not is_course_staff(request.user, question.chapter.course):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        return super().retrieve(request, *_args, **_kwargs)

    def update(self, request: Request, *_args: Any, **_kwargs: Any) -> Response:
        question = self.get_object()
        if not is_course_staff(request.user, question.chapter.course):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *_args, **_kwargs)

    def destroy(self, request: Request, *_args: Any, **_kwargs: Any) -> Response:
        question = self.get_object()
        if not is_course_staff(request.user, question.chapter.course):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        question.is_active = False
        question.save(update_fields=["is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class QuizListCreateView(generics.ListCreateAPIView):
    serializer_class = QuizSerializer
    permission_classes = [IsAuthenticated]

    def get_chapter(self) -> Chapter:
        return get_object_or_404(Chapter, id=self.kwargs["chapter_id"])

    def get_queryset(self) -> QuerySet[Quiz]:
        chapter = self.get_chapter()
        return Quiz.objects.filter(chapter=chapter).order_by("created_at")

    def list(self, request: Request, *_args: Any, **_kwargs: Any) -> Response:
        chapter = self.get_chapter()
        if not is_course_staff(request.user, chapter.course):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        return super().list(request, *_args, **_kwargs)

    def create(self, request: Request, *_args: Any, **_kwargs: Any) -> Response:
        chapter = self.get_chapter()
        if not is_course_staff(request.user, chapter.course):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(chapter=chapter)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class QuizDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = QuizSerializer
    permission_classes = [IsAuthenticated]
    queryset = Quiz.objects.all()

    def retrieve(self, request: Request, *_args: Any, **_kwargs: Any) -> Response:
        quiz = self.get_object()
        if is_course_staff(request.user, quiz.chapter.course):
            return super().retrieve(request, *_args, **_kwargs)
        if not quiz.is_published or not is_course_member(request.user, quiz.chapter.course):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        return super().retrieve(request, *_args, **_kwargs)

    def update(self, request: Request, *_args: Any, **_kwargs: Any) -> Response:
        quiz = self.get_object()
        if not is_course_staff(request.user, quiz.chapter.course):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *_args, **_kwargs)

    def destroy(self, request: Request, *_args: Any, **_kwargs: Any) -> Response:
        quiz = self.get_object()
        if not is_course_staff(request.user, quiz.chapter.course):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *_args, **_kwargs)


class StudentQuizListView(generics.ListAPIView):
    serializer_class = QuizStudentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self) -> QuerySet[Quiz]:
        user = self.request.user
        qs = Quiz.objects.filter(
            is_published=True,
            chapter__course__memberships__user=user,
        ).distinct()
        course_id = self.request.query_params.get("course")
        chapter_id = self.request.query_params.get("chapter")
        if course_id:
            qs = qs.filter(chapter__course_id=course_id)
        if chapter_id:
            qs = qs.filter(chapter_id=chapter_id)
        return qs.order_by("created_at")


class StartAttemptView(generics.CreateAPIView):
    serializer_class = AttemptDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_quiz(self) -> Quiz:
        return get_object_or_404(Quiz, id=self.kwargs["pk"], is_published=True)

    def create(self, request: Request, *_args: Any, **_kwargs: Any) -> Response:
        quiz = self.get_quiz()
        if not is_course_member(request.user, quiz.chapter.course):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        existing = QuizAttempt.objects.filter(
            quiz=quiz,
            student=request.user,
            status=AttemptStatus.IN_PROGRESS,
        ).first()
        if existing:
            return Response(
                {"detail": "Attempt already in progress.", "attempt_id": existing.pk},
                status=status.HTTP_409_CONFLICT,
            )

        try:
            attempt = QuizAttempt.objects.create(quiz=quiz, student=request.user)
        except IntegrityError:
            return Response({"detail": "Attempt already in progress."}, status=status.HTTP_409_CONFLICT)

        first_question = select_next_question(attempt, [])
        if first_question is None:
            attempt.status = AttemptStatus.COMPLETED
            attempt.ended_at = timezone.now()
            attempt.save(update_fields=["status", "ended_at"])
            return Response(
                {
                    "attempt_id": attempt.pk,
                    "status": attempt.status,
                    "num_answered": attempt.num_answered,
                    "num_correct": attempt.num_correct,
                    "current_difficulty": attempt.current_difficulty,
                    "ended_at": attempt.ended_at,
                    "score_percent": 0.0,
                },
                status=status.HTTP_200_OK,
            )

        attempt.current_question = first_question
        attempt.save(update_fields=["current_question"])
        return Response(
            {
                "attempt_id": attempt.pk,
                "status": attempt.status,
                "num_answered": attempt.num_answered,
                "num_correct": attempt.num_correct,
                "current_difficulty": attempt.current_difficulty,
                "question": QuestionStudentSerializer(first_question).data,
            },
            status=status.HTTP_201_CREATED,
        )


class SubmitAnswerView(generics.CreateAPIView):
    serializer_class = AttemptAnswerSubmitSerializer
    permission_classes = [IsAuthenticated]

    def get_attempt(self) -> QuizAttempt:
        return get_object_or_404(QuizAttempt, id=self.kwargs["pk"])

    def create(self, request: Request, *_args: Any, **_kwargs: Any) -> Response:
        attempt = self.get_attempt()
        if attempt.student != request.user:
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = submit_answer(
            attempt=attempt,
            question_id=serializer.validated_data["question_id"],
            selected_index=serializer.validated_data["selected_index"],
        )
        if "error" in result:
            return Response({"detail": result["error"]}, status=result.get("status_code", 400))

        attempt = result["attempt"]
        payload = {
            "attempt_id": attempt.pk,
            "is_correct": result["is_correct"],
            "num_answered": attempt.num_answered,
            "num_correct": attempt.num_correct,
            "current_difficulty": attempt.current_difficulty,
            "status": attempt.status,
        }

        if result.get("completed"):
            payload["ended_at"] = attempt.ended_at
            payload["score_percent"] = (
                round(100.0 * attempt.num_correct / attempt.num_answered, 2)
                if attempt.num_answered
                else 0.0
            )
            return Response(payload, status=status.HTTP_200_OK)

        payload["next_question"] = QuestionStudentSerializer(result["next_question"]).data
        return Response(payload, status=status.HTTP_200_OK)


class AttemptDetailView(generics.RetrieveAPIView):
    serializer_class = AttemptDetailSerializer
    permission_classes = [IsAuthenticated]
    queryset = QuizAttempt.objects.all()

    def retrieve(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        attempt = self.get_object()
        if attempt.student != request.user:
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        return super().retrieve(request, *args, **kwargs)
