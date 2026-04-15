"""Unit tests for Rasch probability and online theta update."""

from django.test import SimpleTestCase

from apps.quizzes.services.irt import rasch_probability, update_theta_online


class IRTTests(SimpleTestCase):
    def test_rasch_sigmoid_at_zero(self):
        self.assertAlmostEqual(rasch_probability(0.0, 0.0), 0.5, places=5)

    def test_theta_increases_on_correct_when_below_curve(self):
        theta = update_theta_online(0.0, 0.0, True, learning_rate=0.5)
        self.assertGreater(theta, 0.0)

    def test_theta_decreases_on_incorrect(self):
        theta = update_theta_online(0.0, 0.0, False, learning_rate=0.5)
        self.assertLess(theta, 0.0)
