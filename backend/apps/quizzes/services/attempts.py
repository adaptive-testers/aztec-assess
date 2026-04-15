from django.db import transaction
from django.utils import timezone

from ..models import AttemptAnswer, AttemptStatus, Question, QuizAttempt
from .adaptive_state import apply_answer_updates
from .selection import next_difficulty_after, select_next_question


@transaction.atomic
def submit_answer(
    attempt: QuizAttempt,
    question_id: int,
    selected_index: int,
    *,
    response_time_ms: int | None = None,
) -> dict:
    if attempt.status != AttemptStatus.IN_PROGRESS:
        return {"error": "Attempt already completed", "status_code": 400}

    try:
        question = Question.objects.get(
            id=question_id,
            chapter=attempt.quiz.chapter,
            is_active=True,
        )
    except Question.DoesNotExist:
        return {"error": "question not found", "status_code": 400}

    if attempt.current_question and attempt.current_question.pk != question_id:
        return {"error": "question is not current", "status_code": 409}

    if AttemptAnswer.objects.filter(attempt=attempt, question=question).exists():
        return {"error": "question already answered", "status_code": 409}

    is_correct = selected_index == question.correct_index
    next_number = attempt.num_answered + 1
    AttemptAnswer.objects.create(
        attempt=attempt,
        question=question,
        selected_index=selected_index,
        is_correct=is_correct,
        response_time_ms=response_time_ms,
        attempt_number=next_number,
    )

    attempt.num_answered += 1
    if is_correct:
        attempt.num_correct += 1
    attempt.current_difficulty = next_difficulty_after(attempt.current_difficulty, is_correct)

    adaptive_meta = apply_answer_updates(attempt.student, question, is_correct)

    if attempt.num_answered >= attempt.quiz.num_questions:
        attempt.status = AttemptStatus.COMPLETED
        attempt.ended_at = timezone.now()
        attempt.current_question = None
        attempt.save(
            update_fields=[
                "num_answered",
                "num_correct",
                "current_difficulty",
                "status",
                "ended_at",
                "current_question",
            ]
        )
        return {
            "completed": True,
            "is_correct": is_correct,
            "attempt": attempt,
            **adaptive_meta,
        }

    attempt.save(update_fields=["num_answered", "num_correct", "current_difficulty"])

    answered_ids = list(
        AttemptAnswer.objects.filter(attempt=attempt).values_list("question_id", flat=True)
    )
    next_question = select_next_question(attempt, answered_ids)
    if next_question is None:
        attempt.status = AttemptStatus.COMPLETED
        attempt.ended_at = timezone.now()
        attempt.current_question = None
        attempt.save(update_fields=["status", "ended_at", "current_question"])
        return {
            "completed": True,
            "is_correct": is_correct,
            "attempt": attempt,
            **adaptive_meta,
        }

    attempt.current_question = next_question
    attempt.save(update_fields=["current_question"])

    return {
        "completed": False,
        "is_correct": is_correct,
        "attempt": attempt,
        "next_question": next_question,
        **adaptive_meta,
    }
