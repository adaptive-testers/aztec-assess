"""
Shared test helpers for quizzes app tests.
"""
from typing import TYPE_CHECKING

from django.contrib.auth import get_user_model

from apps.courses.models import Course
from apps.quizzes.models import Chapter, Difficulty, Question, Quiz, QuizAttempt

if TYPE_CHECKING:
    from apps.accounts.models import User as UserType

User = get_user_model()


def make_course_only(
    *,
    course_title: str = "Test Course",
    slug: str = "test-course",
) -> Course:
    """Create and return a course with no chapter. Use when a test creates its own chapters."""
    owner = User.objects.create_user(
        email="owner@example.com",
        password="pass123",
        first_name="Owner",
    )
    return Course.objects.create(
        title=course_title,
        owner=owner,
        slug=slug,
    )


def make_course_and_chapter(
    *,
    course_title: str = "Test Course",
    chapter_title: str = "Chapter",
    slug: str = "test-course",
) -> tuple[Course, Chapter]:
    """Create and return (course, chapter). Use in setUp or per test."""
    owner = User.objects.create_user(
        email="owner@example.com",
        password="pass123",
        first_name="Owner",
    )
    course = Course.objects.create(
        title=course_title,
        owner=owner,
        slug=slug,
    )
    chapter = Chapter.objects.create(course=course, title=chapter_title)
    return course, chapter


def make_quiz(
    chapter: Chapter,
    *,
    title: str = "Quiz",
    num_questions: int = 10,
    is_published: bool = True,
) -> Quiz:
    """Create and return a Quiz for the given chapter."""
    return Quiz.objects.create(
        chapter=chapter,
        title=title,
        num_questions=num_questions,
        is_published=is_published,
    )


def make_question(
    chapter: Chapter,
    *,
    prompt: str = "Q?",
    choices: list[str] | None = None,
    correct_index: int = 0,
    difficulty: str = Difficulty.MEDIUM,
    created_by: "UserType | None" = None,
) -> Question:
    """Create and return a Question for the given chapter."""
    if choices is None:
        choices = ["A", "B", "C", "D"]
    return Question.objects.create(
        chapter=chapter,
        prompt=prompt,
        choices=choices,
        correct_index=correct_index,
        difficulty=difficulty,
        created_by=created_by,
    )


def make_attempt(student: "UserType", quiz: Quiz) -> QuizAttempt:
    """Create and return a QuizAttempt for the given student and quiz."""
    return QuizAttempt.objects.create(student=student, quiz=quiz)
