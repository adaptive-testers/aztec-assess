"""
Orchestrate lazy creation of BKT/IRT rows and apply updates after each graded response.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from django.conf import settings

from ..models import (
    Question,
    QuestionIRTParameter,
    StudentAbility,
    StudentTopicMastery,
    TopicBKTParameter,
)
from .bkt import bkt_posterior_then_learn
from .irt import update_theta_online

if TYPE_CHECKING:  # pragma: no cover
    from django.contrib.auth.models import AbstractBaseUser

    from apps.courses.models import Topic

logger = logging.getLogger(__name__)


def _bkt_defaults() -> dict[str, float]:
    return {
        "p_l0": float(getattr(settings, "ADAPTIVE_BKT_P_L0", 0.35)),
        "p_t": float(getattr(settings, "ADAPTIVE_BKT_P_T", 0.1)),
        "p_g": float(getattr(settings, "ADAPTIVE_BKT_P_G", 0.25)),
        "p_s": float(getattr(settings, "ADAPTIVE_BKT_P_S", 0.1)),
    }


def difficulty_to_b_prior(difficulty: str) -> float:
    """Map question difficulty label to initial IRT b (Rasch prior)."""
    mapping = getattr(settings, "ADAPTIVE_IRT_DIFFICULTY_B", None)
    if isinstance(mapping, dict):
        return float(mapping.get(difficulty, 0.0))
    defaults = {"EASY": -1.0, "MEDIUM": 0.0, "HARD": 1.0}
    return float(defaults.get(difficulty, 0.0))


def get_or_create_topic_bkt(topic: Topic) -> TopicBKTParameter:
    d = _bkt_defaults()
    row, _ = TopicBKTParameter.objects.get_or_create(
        topic=topic,
        defaults={
            "p_l0": d["p_l0"],
            "p_t": d["p_t"],
            "p_g": d["p_g"],
            "p_s": d["p_s"],
        },
    )
    return row


def get_or_create_question_irt(question: Question) -> QuestionIRTParameter:
    prior_b = difficulty_to_b_prior(question.difficulty)
    row, _ = QuestionIRTParameter.objects.get_or_create(
        question=question,
        defaults={"difficulty_b": prior_b},
    )
    return row


def get_or_create_student_ability(student: AbstractBaseUser) -> StudentAbility:
    row, _ = StudentAbility.objects.get_or_create(student=student, defaults={"theta": 0.0})
    return row


def get_or_create_topic_mastery(student: AbstractBaseUser, topic: Topic) -> StudentTopicMastery:
    bkt = get_or_create_topic_bkt(topic)
    row, _ = StudentTopicMastery.objects.get_or_create(
        student=student,
        topic=topic,
        defaults={"p_knowledge": bkt.p_l0},
    )
    return row


def apply_answer_updates(
    student: AbstractBaseUser,
    question: Question,
    is_correct: bool,
) -> dict[str, Any]:
    """
    Update BKT (primary topic) and IRT (theta vs item b). Returns telemetry for API layers.

    If the question has no topics, only IRT is updated.
    """
    out: dict[str, Any] = {
        "theta": None,
        "topic_mastery": None,
        "focus_topic_id": None,
        "focus_topic_name": None,
    }

    if not getattr(settings, "ADAPTIVE_ENGINE_V2", False):
        return out

    irt_row = get_or_create_question_irt(question)
    ability = get_or_create_student_ability(student)
    lr = float(getattr(settings, "ADAPTIVE_IRT_LEARNING_RATE", 0.5))

    new_theta = update_theta_online(ability.theta, irt_row.difficulty_b, is_correct, lr)
    ability.theta = new_theta
    ability.save(update_fields=["theta", "last_updated"])
    out["theta"] = new_theta

    primary = question.get_primary_topic()
    if primary is None:
        logger.debug("Question %s has no primary topic; skipping BKT.", question.pk)
        return out

    bkt_meta = get_or_create_topic_bkt(primary)
    mastery = get_or_create_topic_mastery(student, primary)
    new_p = bkt_posterior_then_learn(
        mastery.p_knowledge,
        is_correct,
        p_guess=bkt_meta.p_g,
        p_slip=bkt_meta.p_s,
        p_learn=bkt_meta.p_t,
    )
    mastery.p_knowledge = new_p
    mastery.save(update_fields=["p_knowledge", "last_updated"])

    out["topic_mastery"] = new_p
    out["focus_topic_id"] = str(primary.pk)
    out["focus_topic_name"] = primary.name
    return out
