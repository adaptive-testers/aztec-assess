"""Tests for question_factory.validate_and_create_question."""

from __future__ import annotations

from typing import TYPE_CHECKING, cast

import pytest
from django.contrib.auth import get_user_model

if TYPE_CHECKING:
    from apps.accounts.models import User

from apps.ai.services.question_factory import validate_and_create_question
from apps.courses.models import Course, Topic
from apps.quizzes.models import Chapter, Difficulty, QuestionReviewStatus

UserModel = cast("type[User]", get_user_model())


@pytest.fixture
def course_chapter() -> tuple[Course, Chapter]:
    owner = UserModel.objects.create_user(
        email="qf-owner@example.com",
        password="pw",
        first_name="O",
    )
    course = Course.objects.create(title="QF", owner=owner)
    ch = Chapter.objects.create(course=course, title="Ch")
    return course, ch


def _valid_tool_args(**overrides: object) -> dict:
    base = {
        "question_text": "What is 2+2?",
        "answer_options": ["1", "2", "3", "4"],
        "correct_answer": 1,
        "difficulty": Difficulty.MEDIUM,
        "suggested_topics": [],
    }
    base.update(overrides)
    return base


@pytest.mark.django_db
def test_creates_pending_review_question(course_chapter: tuple[Course, Chapter]) -> None:
    _course, ch = course_chapter
    q = validate_and_create_question(
        chapter_id=ch.pk,
        tool_args=_valid_tool_args(),
        created_by_id=None,
    )
    assert q.prompt == "What is 2+2?"
    assert q.is_ai_generated is True
    assert q.review_status == QuestionReviewStatus.PENDING_REVIEW


@pytest.mark.django_db
def test_requires_correct_answer(course_chapter: tuple[Course, Chapter]) -> None:
    _course, ch = course_chapter
    args = _valid_tool_args()
    del args["correct_answer"]
    with pytest.raises(ValueError, match="correct_answer is required"):
        validate_and_create_question(chapter_id=ch.pk, tool_args=args, created_by_id=None)


@pytest.mark.django_db
def test_requires_question_text(course_chapter: tuple[Course, Chapter]) -> None:
    _course, ch = course_chapter
    with pytest.raises(ValueError, match="question_text"):
        validate_and_create_question(
            chapter_id=ch.pk,
            tool_args=_valid_tool_args(question_text="  "),
            created_by_id=None,
        )


@pytest.mark.django_db
def test_requires_four_options(course_chapter: tuple[Course, Chapter]) -> None:
    _course, ch = course_chapter
    with pytest.raises(ValueError, match="answer_options"):
        validate_and_create_question(
            chapter_id=ch.pk,
            tool_args=_valid_tool_args(answer_options=["a", "b"]),
            created_by_id=None,
        )


@pytest.mark.django_db
def test_correct_index_bounds(course_chapter: tuple[Course, Chapter]) -> None:
    _course, ch = course_chapter
    with pytest.raises(ValueError, match="0-3"):
        validate_and_create_question(
            chapter_id=ch.pk,
            tool_args=_valid_tool_args(correct_answer=4),
            created_by_id=None,
        )


@pytest.mark.django_db
def test_invalid_difficulty(course_chapter: tuple[Course, Chapter]) -> None:
    _course, ch = course_chapter
    with pytest.raises(ValueError, match="invalid difficulty"):
        validate_and_create_question(
            chapter_id=ch.pk,
            tool_args=_valid_tool_args(difficulty="SUPER_HARD"),
            created_by_id=None,
        )


@pytest.mark.django_db
def test_topic_must_belong_to_course(course_chapter: tuple[Course, Chapter]) -> None:
    course, ch = course_chapter
    other = Course.objects.create(title="Other", owner=course.owner)
    topic = Topic.objects.create(course=other, name="T")
    with pytest.raises(ValueError, match="does not belong"):
        validate_and_create_question(
            chapter_id=ch.pk,
            tool_args=_valid_tool_args(suggested_topics=[str(topic.pk)]),
            created_by_id=None,
        )


@pytest.mark.django_db
def test_topic_ids_linked(course_chapter: tuple[Course, Chapter]) -> None:
    course, ch = course_chapter
    topic = Topic.objects.create(course=course, name="Algebra")
    q = validate_and_create_question(
        chapter_id=ch.pk,
        tool_args=_valid_tool_args(suggested_topics=[str(topic.pk)]),
        created_by_id=None,
    )
    assert list(q.topics.values_list("pk", flat=True)) == [topic.pk]


@pytest.mark.django_db
def test_invalid_topic_uuid_string(course_chapter: tuple[Course, Chapter]) -> None:
    _course, ch = course_chapter
    with pytest.raises(ValueError, match="invalid topic id"):
        validate_and_create_question(
            chapter_id=ch.pk,
            tool_args=_valid_tool_args(suggested_topics=["not-a-uuid"]),
            created_by_id=None,
        )


@pytest.mark.django_db
def test_unknown_chapter_raises(course_chapter: tuple[Course, Chapter]) -> None:
    _course, ch = course_chapter
    with pytest.raises(Chapter.DoesNotExist):
        validate_and_create_question(
            chapter_id=999999,
            tool_args=_valid_tool_args(),
            created_by_id=None,
        )


@pytest.mark.django_db
def test_non_string_options_rejected(course_chapter: tuple[Course, Chapter]) -> None:
    _course, ch = course_chapter
    with pytest.raises(ValueError, match="strings"):
        validate_and_create_question(
            chapter_id=ch.pk,
            tool_args=_valid_tool_args(answer_options=["a", "b", "c", 4]),
            created_by_id=None,
        )
