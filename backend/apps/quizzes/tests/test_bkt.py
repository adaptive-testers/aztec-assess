"""Unit tests for BKT update formula."""

from django.test import SimpleTestCase

from apps.quizzes.services.bkt import bkt_posterior_then_learn, clamp_p


class BKTFormulaTests(SimpleTestCase):
    def test_correct_response_increases_mastery_from_mid_prior(self):
        p = bkt_posterior_then_learn(
            0.5,
            True,
            p_guess=0.25,
            p_slip=0.1,
            p_learn=0.1,
        )
        self.assertGreater(p, 0.5)

    def test_incorrect_response_decreases_mastery_from_high_prior(self):
        p = bkt_posterior_then_learn(
            0.8,
            False,
            p_guess=0.25,
            p_slip=0.1,
            p_learn=0.1,
        )
        self.assertLess(p, 0.8)

    def test_output_and_clamp_p_stay_in_valid_range(self):
        p = bkt_posterior_then_learn(
            0.99,
            True,
            p_guess=0.25,
            p_slip=0.1,
            p_learn=0.3,
        )
        self.assertGreater(p, 0.001)
        self.assertLess(p, 0.999)
        self.assertEqual(clamp_p(0.0), 0.001)
        self.assertEqual(clamp_p(1.0), 0.999)

    def test_same_inputs_are_deterministic(self):
        first = bkt_posterior_then_learn(
            0.35,
            True,
            p_guess=0.25,
            p_slip=0.1,
            p_learn=0.1,
        )
        second = bkt_posterior_then_learn(
            0.35,
            True,
            p_guess=0.25,
            p_slip=0.1,
            p_learn=0.1,
        )
        self.assertEqual(first, second)

    def test_higher_learn_parameter_increases_posterior_after_correct(self):
        with_learn = bkt_posterior_then_learn(
            0.2,
            True,
            p_guess=0.25,
            p_slip=0.1,
            p_learn=0.2,
        )
        no_learn = bkt_posterior_then_learn(
            0.2,
            True,
            p_guess=0.25,
            p_slip=0.1,
            p_learn=0.001,
        )
        self.assertGreater(with_learn, no_learn)
