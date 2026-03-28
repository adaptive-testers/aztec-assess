"""Validate Gemini create_question tool output and build Question rows."""

from __future__ import annotations

import uuid
from typing import Any

from django.db import transaction

from apps.courses.models import Topic
from apps.quizzes.models import Chapter, Difficulty, Question, QuestionReviewStatus


def validate_and_create_question(
    *,
    chapter_id: int,
    tool_args: dict[str, Any],
    created_by_id: str | None,
) -> Question:
    """
    Apply JSON/business validation and create a pending-review AI question.

    suggested_topics must be UUID strings of Topic rows in the question's course.
    """
    qtext = tool_args.get("question_text")
    options = tool_args.get("answer_options")
    raw_correct = tool_args.get("correct_answer")
    if raw_correct is None:
        raise ValueError("correct_answer is required")
    correct = int(raw_correct)
    difficulty = tool_args.get("difficulty")
    topic_ids = tool_args.get("suggested_topics") or []

    if not isinstance(qtext, str) or not qtext.strip():
        raise ValueError("question_text is required")
    if not isinstance(options, list) or len(options) != 4:
        raise ValueError("answer_options must be a list of 4 strings")
    if not all(isinstance(x, str) for x in options):
        raise ValueError("answer_options must be strings")
    if correct < 0 or correct > 3:
        raise ValueError("correct_answer must be 0-3")
    if difficulty not in {d.value for d in Difficulty}:
        raise ValueError("invalid difficulty")

    chapter = Chapter.objects.get(pk=chapter_id)
    course_id = chapter.course.pk

    topic_objs: list[Topic] = []
    for tid in topic_ids:
        try:
            uid = uuid.UUID(str(tid))
        except (ValueError, TypeError) as e:
            raise ValueError(f"invalid topic id: {tid}") from e
        topic = Topic.objects.filter(pk=uid, course_id=course_id).first()
        if not topic:
            raise ValueError(f"Topic {tid} does not belong to this course")
        topic_objs.append(topic)

    with transaction.atomic():
        q = Question.objects.create(
            chapter_id=chapter_id,
            prompt=qtext.strip(),
            choices=list(options),
            correct_index=correct,
            difficulty=difficulty,
            created_by_id=created_by_id,
            is_ai_generated=True,
            review_status=QuestionReviewStatus.PENDING_REVIEW,
        )
        if topic_objs:
            q.topics.set(topic_objs)
    return q
