"""Unit tests for Rasch probability and online theta update."""

from django.test import SimpleTestCase

from apps.quizzes.services.irt import rasch_probability, update_theta_online


class IRTTests(SimpleTestCase):
    def test_rasch_probability_is_one_half_when_theta_equals_difficulty(self):
        self.assertAlmostEqual(rasch_probability(0.0, 0.0), 0.5, places=5)

    def test_rasch_probability_increases_when_ability_exceeds_difficulty(self):
        low = rasch_probability(0.0, 1.0)
        high = rasch_probability(1.0, 0.0)
        self.assertLess(low, 0.5)
        self.assertGreater(high, 0.5)

    def test_update_theta_increases_on_correct_response_at_equal_ability_and_difficulty(self):
        theta = update_theta_online(0.0, 0.0, True, learning_rate=0.5)
        self.assertGreater(theta, 0.0)

    def test_update_theta_decreases_on_incorrect_response_at_equal_ability_and_difficulty(self):
        theta = update_theta_online(0.0, 0.0, False, learning_rate=0.5)
        self.assertLess(theta, 0.0)

    def test_zero_learning_rate_leaves_theta_unchanged(self):
        theta = update_theta_online(2.0, -0.5, True, learning_rate=0.0)
        self.assertEqual(theta, 2.0)
