"""Unit tests for adaptive_state (BKT/IRT orchestration)."""

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from apps.quizzes.models import Difficulty
from apps.quizzes.services.adaptive_state import (
    apply_answer_updates,
    difficulty_to_b_prior,
)
from apps.quizzes.tests.test_utils import make_course_and_chapter, make_question

User = get_user_model()


class DifficultyToBPriorTests(TestCase):
    def test_builtin_defaults_when_settings_mapping_is_not_dict(self):
        """Lines 44–46: fallback when ADAPTIVE_IRT_DIFFICULTY_B is missing or not a dict."""
        with override_settings(ADAPTIVE_IRT_DIFFICULTY_B=None):
            self.assertEqual(difficulty_to_b_prior(Difficulty.EASY), -1.0)
            self.assertEqual(difficulty_to_b_prior(Difficulty.MEDIUM), 0.0)
            self.assertEqual(difficulty_to_b_prior(Difficulty.HARD), 1.0)
            self.assertEqual(difficulty_to_b_prior("UNKNOWN"), 0.0)

    def test_dict_mapping_from_settings(self):
        custom = {"EASY": -2.0, "MEDIUM": 0.5, "HARD": 2.0}
        with override_settings(ADAPTIVE_IRT_DIFFICULTY_B=custom):
            self.assertEqual(difficulty_to_b_prior(Difficulty.EASY), -2.0)


@override_settings(ADAPTIVE_ENGINE_V2=True)
class ApplyAnswerUpdatesTests(TestCase):
    def setUp(self):
        self.course, self.chapter = make_course_and_chapter()
        self.user = User.objects.create_user(email="u@example.com", password="p")

    def test_skips_bkt_logs_debug_when_question_has_no_topics(self):
        """Lines 117–119: IRT runs; BKT skipped when no primary topic."""
        q = make_question(self.chapter, prompt="No topic", difficulty=Difficulty.MEDIUM)
        with patch("apps.quizzes.services.adaptive_state.logger") as mock_log:
            out = apply_answer_updates(self.user, q, True)
        mock_log.debug.assert_called_once()
        self.assertIn("no primary topic", mock_log.debug.call_args[0][0])
        self.assertIsNotNone(out["theta"])
        self.assertIsNone(out["topic_mastery"])
        self.assertIsNone(out["focus_topic_id"])
