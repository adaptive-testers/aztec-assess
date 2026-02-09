
"""
Adaptive question selection service for quizzes.

This file contains pure-ish functions that decide:
 - how difficulty should change after an answer, and
 - which next question to pick given an attempt and already answered question ids.

Design notes:
 - Difficulty values: "EASY", "MEDIUM", "HARD"
 - Strategy:
     1. Target = attempt.current_difficulty
     2. Try unused questions in (chapter, target)
     3. If none, try adjacent difficulty levels (one step up/down)
     4. If still none, return any unused in chapter
     5. If none, return None (attempt should finish)
"""

import random
from typing import cast

from django.db.models import QuerySet

from ..models import Difficulty, Question, QuizAttempt

DIFFICULTY_ORDER = [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD]


def next_difficulty_after(current: str, was_correct: bool) -> str:
    """
    Return the next difficulty given the current difficulty and whether the last answer was correct.

    Rules:
      - correct -> bump up one step (EASY -> MEDIUM -> HARD)
      - wrong   -> drop one step (HARD -> MEDIUM -> EASY)
      - stay at bounds if already at HARD/EASY respectively
    """
    if current not in DIFFICULTY_ORDER:
        # defensive fallback
        current = Difficulty.MEDIUM
    idx = DIFFICULTY_ORDER.index(cast("Difficulty", current))
    if was_correct and idx < len(DIFFICULTY_ORDER) - 1:
        return DIFFICULTY_ORDER[idx + 1]
    if not was_correct and idx > 0:
        return DIFFICULTY_ORDER[idx - 1]
    return current


def _unused_questions_for(attempt: QuizAttempt, difficulty: str, excluded_ids: list[int]) -> QuerySet:
    """
    Helper: return QuerySet of unused questions in the attempt's chapter with given difficulty,
    excluding any ids in excluded_ids.
    """
    return (
        Question.objects.filter(
            chapter=attempt.quiz.chapter,
            difficulty=difficulty,
            is_active=True,
        )
        .exclude(id__in=excluded_ids)
    )


def select_next_question(attempt: QuizAttempt, answered_question_ids: list[int]) -> Question | None:
    """
    Select the next Question for an attempt, or return None if no unused questions remain.

    Inputs:
      - attempt: QuizAttempt instance (must have .chapter and .current_difficulty)
      - answered_question_ids: list of int question IDs already answered in this attempt

    Output:
      - Question instance or None
    """
    # defensive checks
    if not hasattr(attempt, "quiz") or attempt.quiz is None:
        return None

    target = attempt.current_difficulty if attempt.current_difficulty in DIFFICULTY_ORDER else Difficulty.MEDIUM

    # 1) try target difficulty
    qs = _unused_questions_for(attempt, target, answered_question_ids)
    candidate_ids = list(qs.values_list("id", flat=True))
    if candidate_ids:
        return Question.objects.get(id=random.choice(candidate_ids))

    # 2) try adjacent difficulties (one step down and one step up)
    idx = DIFFICULTY_ORDER.index(target)
    adjacents = []
    if idx - 1 >= 0:
        adjacents.append(DIFFICULTY_ORDER[idx - 1])
    if idx + 1 < len(DIFFICULTY_ORDER):
        adjacents.append(DIFFICULTY_ORDER[idx + 1])

    for diff in adjacents:
        qs = _unused_questions_for(attempt, diff, answered_question_ids)
        candidate_ids = list(qs.values_list("id", flat=True))
        if candidate_ids:
            return Question.objects.get(id=random.choice(candidate_ids))

    # 3) fallback: any unused in chapter
    qs = Question.objects.filter(
        chapter=attempt.quiz.chapter,
        is_active=True,
    ).exclude(id__in=answered_question_ids)
    candidate_ids = list(qs.values_list("id", flat=True))
    if candidate_ids:
        return Question.objects.get(id=random.choice(candidate_ids))

    # nothing left
    return None
