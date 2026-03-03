"""
Tests for the adaptive question selection service (select_next_question).
"""
from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.quizzes.models import Difficulty, Question
from apps.quizzes.services.selection import next_difficulty_after, select_next_question
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

    def test_fallback_to_any_question_when_all_difficulty_buckets_empty(self):
        """Test final fallback: select any question when target and adjacents are exhausted."""
        # Make only one HARD question available, set attempt to EASY
        # This should exhaust EASY (none) and MEDIUM (adjacent) and fall back to HARD
        Question.objects.filter(chapter=self.chapter, difficulty__in=[Difficulty.EASY, Difficulty.MEDIUM]).delete()
        self.attempt.current_difficulty = Difficulty.EASY
        self.attempt.save()
        q = select_next_question(self.attempt, [])
        self.assertIsNotNone(q)
        self.assertEqual(q.difficulty, Difficulty.HARD)

    def test_returns_none_when_attempt_quiz_is_none(self):
        """Test defensive check: return None if attempt.quiz is None."""
        self.attempt.quiz = None
        q = select_next_question(self.attempt, [])
        self.assertIsNone(q)


class NextDifficultyTests(TestCase):
    """Test next_difficulty_after function (adaptive difficulty logic)."""

    def test_correct_answer_increases_difficulty_easy_to_medium(self):
        """Correct answer at EASY moves to MEDIUM."""
        result = next_difficulty_after(Difficulty.EASY, was_correct=True)
        self.assertEqual(result, Difficulty.MEDIUM)

    def test_correct_answer_increases_difficulty_medium_to_hard(self):
        """Correct answer at MEDIUM moves to HARD."""
        result = next_difficulty_after(Difficulty.MEDIUM, was_correct=True)
        self.assertEqual(result, Difficulty.HARD)

    def test_correct_answer_stays_at_hard(self):
        """Correct answer at HARD stays at HARD (ceiling)."""
        result = next_difficulty_after(Difficulty.HARD, was_correct=True)
        self.assertEqual(result, Difficulty.HARD)

    def test_wrong_answer_decreases_difficulty_hard_to_medium(self):
        """Wrong answer at HARD moves to MEDIUM."""
        result = next_difficulty_after(Difficulty.HARD, was_correct=False)
        self.assertEqual(result, Difficulty.MEDIUM)

    def test_wrong_answer_decreases_difficulty_medium_to_easy(self):
        """Wrong answer at MEDIUM moves to EASY."""
        result = next_difficulty_after(Difficulty.MEDIUM, was_correct=False)
        self.assertEqual(result, Difficulty.EASY)

    def test_wrong_answer_stays_at_easy(self):
        """Wrong answer at EASY stays at EASY (floor)."""
        result = next_difficulty_after(Difficulty.EASY, was_correct=False)
        self.assertEqual(result, Difficulty.EASY)

    def test_invalid_difficulty_defaults_to_medium(self):
        """Invalid difficulty input falls back to MEDIUM."""
        result = next_difficulty_after("INVALID", was_correct=True)
        self.assertEqual(result, Difficulty.HARD)  # MEDIUM (fallback) + correct = HARD
