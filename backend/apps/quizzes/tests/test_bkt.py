"""Unit tests for BKT update formula."""

from django.test import SimpleTestCase

from apps.quizzes.services.bkt import bkt_posterior_then_learn


class BKTFormulaTests(SimpleTestCase):
    def test_correct_increases_or_maintains_high_mastery(self):
        p = bkt_posterior_then_learn(
            0.5,
            True,
            p_guess=0.25,
            p_slip=0.1,
            p_learn=0.1,
        )
        self.assertGreater(p, 0.5)

    def test_incorrect_decreases_mastery(self):
        p = bkt_posterior_then_learn(
            0.8,
            False,
            p_guess=0.25,
            p_slip=0.1,
            p_learn=0.1,
        )
        self.assertLess(p, 0.8)
