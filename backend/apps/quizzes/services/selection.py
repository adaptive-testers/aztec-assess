"""
Adaptive question selection service for quizzes.

When ADAPTIVE_ENGINE_V2 and ADAPTIVE_ENGINE_V2_SELECTION are enabled and the quiz has
adaptive_enabled, uses weak-topic prioritization and |theta - b| matching.

Otherwise uses the difficulty ladder (legacy) strategy.
"""

from __future__ import annotations

import logging
import random
from typing import TYPE_CHECKING, cast
from uuid import UUID  # noqa: TC003

from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import QuerySet  # noqa: TC002

from ..models import (
    Difficulty,
    Question,
    QuizAttempt,
    StudentAbility,
    StudentTopicMastery,
    TopicBKTParameter,
)
from .adaptive_state import difficulty_to_b_prior, get_or_create_question_irt

if TYPE_CHECKING:  # pragma: no cover
    from apps.courses.models import Topic

logger = logging.getLogger(__name__)

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


def select_next_question_ladder(attempt: QuizAttempt, answered_question_ids: list[int]) -> Question | None:
    """
    Legacy selector: difficulty ladder with fallbacks (see module docstring).
    """
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

    return None


def _estimated_mastery(student_id: int, topic_id: UUID) -> float:
    m = StudentTopicMastery.objects.filter(student_id=student_id, topic_id=topic_id).first()
    if m:
        return float(m.p_knowledge)
    bkt = TopicBKTParameter.objects.filter(topic_id=topic_id).first()
    if bkt:
        return float(bkt.p_l0)
    return float(getattr(settings, "ADAPTIVE_BKT_P_L0", 0.35))


def _item_b(question: Question) -> float:
    try:
        # Reverse OneToOne from django-stubs; attribute exists at runtime after select_related.
        return float(question.irt_parameter.difficulty_b)  # type: ignore[attr-defined]
    except ObjectDoesNotExist:
        return difficulty_to_b_prior(question.difficulty)


def select_next_question_adaptive(attempt: QuizAttempt, answered_question_ids: list[int]) -> Question | None:
    """
    Prefer questions whose primary topic has low mastery (< threshold), then minimize |theta - b|.
    Falls back to ladder if the pool has no topics or no candidates.
    """
    if not hasattr(attempt, "quiz") or attempt.quiz is None:
        return None

    base_qs = (
        Question.objects.filter(chapter=attempt.quiz.chapter, is_active=True)
        .exclude(id__in=answered_question_ids)
        .prefetch_related("topics")
    )
    pool = list(base_qs)
    if not pool:
        return None

    for q in pool:
        get_or_create_question_irt(q)
    pool = list(
        Question.objects.filter(pk__in=[q.pk for q in pool])
        .prefetch_related("topics")
        .select_related("irt_parameter")
    )

    student = attempt.student
    ability = StudentAbility.objects.filter(student=student).first()
    theta = float(ability.theta) if ability else 0.0

    weak_threshold = float(getattr(settings, "ADAPTIVE_WEAK_TOPIC_THRESHOLD", 0.7))

    primary_topics: list[tuple[Question, Topic | None]] = []
    for q in pool:
        primary_topics.append((q, q.get_primary_topic()))

    if all(t is None for _, t in primary_topics):
        return None

    topic_ids = {t.pk for _, t in primary_topics if t is not None}

    weak_ids = {
        tid for tid in topic_ids if _estimated_mastery(int(student.pk), tid) < weak_threshold
    }
    if not weak_ids:
        weak_ids = set(topic_ids)

    candidates: list[Question] = []
    for q, pt in primary_topics:
        if pt is None:
            continue
        if pt.pk in weak_ids:
            candidates.append(q)

    if not candidates:  # pragma: no cover
        # Redundant with current weak_ids construction; kept as a safe fallback.
        candidates = [q for q, pt in primary_topics if pt is not None]
    if not candidates:  # pragma: no cover
        return None

    scored: list[tuple[float, int, Question]] = []
    for q in candidates:
        b = _item_b(q)
        scored.append((abs(theta - b), q.pk, q))

    if not scored:  # pragma: no cover — defensive; candidates non-empty implies scored non-empty
        return None

    best_score = min(s[0] for s in scored)
    tied = [s[2] for s in scored if s[0] == best_score]
    chosen = random.choice(tied)

    if getattr(settings, "ADAPTIVE_ENGINE_V2_SHADOW", False):
        alt = select_next_question_ladder(attempt, answered_question_ids)
        if alt is not None and chosen.pk != alt.pk:
            logger.info(
                "adaptive_shadow attempt=%s adaptive_q=%s ladder_q=%s",
                attempt.pk,
                chosen.pk,
                alt.pk,
            )
    return chosen


def select_next_question(attempt: QuizAttempt, answered_question_ids: list[int]) -> Question | None:
    """
    Select the next Question for an attempt, or return None if no unused questions remain.
    """
    use_adaptive = (
        getattr(settings, "ADAPTIVE_ENGINE_V2", False)
        and getattr(settings, "ADAPTIVE_ENGINE_V2_SELECTION", False)
        and attempt.quiz is not None
        and attempt.quiz.adaptive_enabled
    )

    if use_adaptive:
        picked = select_next_question_adaptive(attempt, answered_question_ids)
        if picked is not None:
            return picked

    return select_next_question_ladder(attempt, answered_question_ids)
