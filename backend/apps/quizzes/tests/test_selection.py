"""
Tests for the adaptive question selection service (select_next_question).
"""
from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.quizzes.models import Difficulty, Question
from apps.quizzes.services.selection import select_next_question
from apps.quizzes.tests.test_utils import (
    make_attempt,
    make_course_and_chapter,
    make_question,
    make_quiz,
)

User = get_user_model()


class SelectionServiceTests(TestCase):
    """Test select_next_question behavior for difficulty targeting and fallbacks."""

    def setUp(self):
        self.course, self.chapter = make_course_and_chapter()
        student = User.objects.create_user(
            email="student@example.com", password="pass123"
        )
        self.quiz = make_quiz(self.chapter, title="Quiz", num_questions=3)
        self.attempt = make_attempt(student, self.quiz)

        for i in range(3):
            make_question(
                self.chapter, prompt=f"E{i}", difficulty=Difficulty.EASY
            )
            make_question(
                self.chapter, prompt=f"M{i}", difficulty=Difficulty.MEDIUM
            )
            make_question(
                self.chapter, prompt=f"H{i}", difficulty=Difficulty.HARD
            )

    def test_selects_medium_by_default(self):
        """Test that first question uses current_difficulty (MEDIUM by default)."""
        q = select_next_question(self.attempt, [])
        self.assertIsNotNone(q)
        self.assertEqual(q.difficulty, Difficulty.MEDIUM)

    def test_fallback_to_adjacent_when_bucket_empty(self):
        """Test that when target difficulty is exhausted, adjacent difficulty is used."""
        medium_ids = list(
            Question.objects.filter(chapter=self.chapter, difficulty=Difficulty.MEDIUM).values_list("id", flat=True)
        )
        q = select_next_question(self.attempt, medium_ids)
        self.assertIsNotNone(q)
        self.assertIn(q.difficulty, {Difficulty.EASY, Difficulty.HARD})

    def test_returns_none_when_exhausted(self):
        """Test that None is returned when all questions are already answered."""
        all_ids = list(Question.objects.filter(chapter=self.chapter).values_list("id", flat=True))
        q = select_next_question(self.attempt, all_ids)
        self.assertIsNone(q)

    def test_skips_inactive_questions(self):
        """Test that inactive questions are not selected."""
        Question.objects.filter(chapter=self.chapter, difficulty=Difficulty.MEDIUM).update(is_active=False)
        q = select_next_question(self.attempt, [])
        self.assertIsNotNone(q)
        self.assertNotEqual(q.difficulty, Difficulty.MEDIUM)
