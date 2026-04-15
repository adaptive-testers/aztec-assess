"""
Minimal Rasch-style IRT: P(correct) = sigmoid(theta - b), online theta with small learning rate.
"""

import math


def rasch_probability(theta: float, difficulty_b: float) -> float:
    """Probability of a correct response."""
    x = float(theta) - float(difficulty_b)
    return 1.0 / (1.0 + math.exp(-x))


def update_theta_online(
    theta: float,
    difficulty_b: float,
    is_correct: bool,
    learning_rate: float,
) -> float:
    """
    Stochastic / online update: theta <- theta + lr * (y - P).

    y is 1 for correct, 0 for incorrect.
    """
    p = rasch_probability(theta, difficulty_b)
    y = 1.0 if is_correct else 0.0
    return float(theta) + float(learning_rate) * (y - p)
