"""
Tests for the quiz attempt answer submission service (submit_answer).
"""
from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.quizzes.models import Difficulty
from apps.quizzes.services.attempts import submit_answer
from apps.quizzes.tests.test_utils import (
    make_attempt,
    make_course_and_chapter,
    make_question,
    make_quiz,
)

User = get_user_model()


class AttemptServiceTests(TestCase):
    """Test submit_answer success and error paths."""

    def setUp(self):
        self.course, self.chapter = make_course_and_chapter()
        self.student = User.objects.create_user(
            email="student@example.com", password="pass123"
        )
        self.quiz = make_quiz(self.chapter, title="Quiz", num_questions=1)
        self.question = make_question(
            self.chapter,
            prompt="Q1",
            correct_index=1,
            difficulty=Difficulty.MEDIUM,
        )
        self.attempt = make_attempt(self.student, self.quiz)
        self.attempt.current_question = self.question
        self.attempt.save(update_fields=["current_question"])

    def test_submit_answer_completes_attempt(self):
        """Test that submitting the last answer marks attempt completed and updates counts."""
        result = submit_answer(self.attempt, self.question.id, 1)
        self.assertTrue(result["completed"])
        self.attempt.refresh_from_db()
        self.assertEqual(self.attempt.status, "COMPLETED")
        self.assertEqual(self.attempt.num_answered, 1)
        self.assertEqual(self.attempt.num_correct, 1)

    def test_submit_answer_rejects_duplicate(self):
        """Test that submitting the same question twice returns 409."""
        # Use 2 questions so attempt stays in progress after first answer
        self.quiz.num_questions = 2
        self.quiz.save(update_fields=["num_questions"])
        make_question(
            self.chapter,
            prompt="Q2",
            correct_index=0,
            difficulty=Difficulty.MEDIUM,
        )
        submit_answer(self.attempt, self.question.id, 1)
        result = submit_answer(self.attempt, self.question.id, 1)
        self.assertEqual(result.get("status_code"), 409)

    def test_submit_answer_rejects_completed_attempt(self):
        """Test that submitting to an already completed attempt returns 400."""
        submit_answer(self.attempt, self.question.id, 1)
        result = submit_answer(self.attempt, self.question.id, 1)
        self.assertEqual(result.get("status_code"), 400)
        self.assertIn("error", result)
        self.assertIn("completed", result["error"].lower())

    def test_submit_answer_rejects_question_not_found(self):
        """Test that submitting with invalid question_id returns 400."""
        result = submit_answer(self.attempt, 99999, 0)
        self.assertEqual(result.get("status_code"), 400)
        self.assertIn("error", result)

    def test_submit_answer_rejects_non_current_question(self):
        """Test that submitting a non-current question returns 409."""
        self.quiz.num_questions = 2
        self.quiz.save(update_fields=["num_questions"])
        other = make_question(
            self.chapter,
            prompt="Q2",
            correct_index=0,
            difficulty=Difficulty.MEDIUM,
        )
        result = submit_answer(self.attempt, other.id, 0)
        self.assertEqual(result.get("status_code"), 409)
