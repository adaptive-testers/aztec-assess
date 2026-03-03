"""
Tests for quiz models (Chapter, Question, Quiz, QuizAttempt, AttemptAnswer).
"""
from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.quizzes.models import AttemptAnswer, Chapter, Question, Quiz, QuizAttempt
from apps.quizzes.tests.test_utils import make_course_and_chapter, make_course_only

User = get_user_model()


class ChapterTests(TestCase):
    """Test Chapter model creation and basic operations."""

    def setUp(self):
        # Use course only so each test creates the chapter(s) it needs.
        self.course = make_course_only()

    def test_chapter_creation(self):
        """Test that a chapter can be created with required fields."""
        chapter = Chapter.objects.create(
            course=self.course,
            title="Chapter 1",
            order_index=1
        )
        self.assertEqual(chapter.title, "Chapter 1")

    def test_chapter_str(self):
        """Test that chapter string representation returns title."""
        chapter = Chapter.objects.create(
            course=self.course,
            title="Test",
            order_index=1,
        )
        self.assertEqual(str(chapter), "Test")

    def test_chapter_auto_timestamps(self):
        """Test that created_at is set automatically."""
        chapter = Chapter.objects.create(
            course=self.course,
            title="Test"
        )
        self.assertIsNotNone(chapter.created_at)

    def test_chapter_order_index_optional(self):
        """Test that order_index can be null."""
        chapter = Chapter.objects.create(
            course=self.course,
            title="Test"
        )
        self.assertIsNone(chapter.order_index)

    def test_chapter_foreign_key(self):
        """Test that chapter links to course correctly."""
        chapter = Chapter.objects.create(
            course=self.course,
            title="Test"
        )
        self.assertEqual(chapter.course.title, "Test Course")

    def test_chapter_multiple_same_course(self):
        """Test that multiple chapters can link to the same course."""
        Chapter.objects.create(course=self.course, title="Ch1")
        Chapter.objects.create(course=self.course, title="Ch2")
        count = Chapter.objects.filter(course=self.course).count()
        self.assertEqual(count, 2)

    def test_chapter_query_all(self):
        """Test that chapters can be queried from the database."""
        Chapter.objects.create(course=self.course, title="Test")
        chapters = Chapter.objects.all()
        self.assertGreater(len(chapters), 0)

    def test_chapter_title_max_length(self):
        """Test that title field has max_length constraint."""
        max_len = Chapter._meta.get_field('title').max_length
        self.assertEqual(max_len, 255)

    def test_chapter_order_index_integer(self):
        """Test that order_index is an integer field."""
        chapter = Chapter.objects.create(course=self.course, title="Test", order_index=5)
        self.assertIsInstance(chapter.order_index, int)


class QuestionTests(TestCase):
    """Test Question model creation and validation."""

    def setUp(self):
        self.course, self.chapter = make_course_and_chapter()

    def test_question_creation(self):
        """Test that a question can be created with required fields."""
        q = Question.objects.create(
            chapter=self.chapter,
            prompt="2+2?",
            choices=["3","4","5","6"],
            correct_index=1
        )
        self.assertEqual(q.prompt, "2+2?")

    def test_question_str_format(self):
        """Test that question string representation includes difficulty."""
        q = Question.objects.create(
            chapter=self.chapter,
            prompt="Test",
            choices=["A","B","C","D"],
            correct_index=0,
            difficulty="EASY"
        )
        self.assertIn("EASY", str(q))

    def test_question_difficulty_default(self):
        """Test that difficulty defaults to MEDIUM."""
        q = Question.objects.create(
            chapter=self.chapter,
            prompt="Test",
            choices=["A","B","C","D"],
            correct_index=0
        )
        self.assertEqual(q.difficulty, "MEDIUM")

    def test_question_choices_json(self):
        """Test that choices are stored as a JSON list."""
        choices = ["A","B","C","D"]
        q = Question.objects.create(
            chapter=self.chapter,
            prompt="Test",
            choices=choices,
            correct_index=0
        )
        self.assertEqual(q.choices, choices)

    def test_question_created_by_optional(self):
        """Test that created_by can be null."""
        q = Question.objects.create(
            chapter=self.chapter,
            prompt="Test",
            choices=["A","B","C","D"],
            correct_index=0
        )
        self.assertIsNone(q.created_by)

    def test_question_timestamp(self):
        """Test that created_at is set automatically."""
        q = Question.objects.create(
            chapter=self.chapter,
            prompt="Test",
            choices=["A","B","C","D"],
            correct_index=0
        )
        self.assertIsNotNone(q.created_at)

    def test_question_correct_index(self):
        """Test that correct_index is stored as valid index 0-3."""
        q = Question.objects.create(
            chapter=self.chapter,
            prompt="Test",
            choices=["A","B","C","D"],
            correct_index=2
        )
        self.assertIn(q.correct_index, [0,1,2,3])

    def test_question_difficulty_choices(self):
        """Test that difficulty is one of the valid choices."""
        q = Question.objects.create(
            chapter=self.chapter,
            prompt="Test",
            choices=["A","B","C","D"],
            correct_index=0,
            difficulty="HARD"
        )
        valid = ["EASY", "MEDIUM", "HARD"]
        self.assertIn(q.difficulty, valid)

    def test_question_multiple_per_chapter(self):
        """Test that multiple questions can belong to the same chapter."""
        Question.objects.create(chapter=self.chapter, prompt="Q1", choices=["A","B","C","D"], correct_index=0)
        Question.objects.create(chapter=self.chapter, prompt="Q2", choices=["A","B","C","D"], correct_index=1)
        count = Question.objects.filter(chapter=self.chapter).count()
        self.assertEqual(count, 2)

    def test_question_with_user(self):
        """Test that question can track creator via created_by."""
        user = User.objects.create_user(email="creator@example.com", password="pass123")
        q = Question.objects.create(
            chapter=self.chapter,
            prompt="Test",
            choices=["A","B","C","D"],
            correct_index=0,
            created_by=user
        )
        self.assertEqual(q.created_by, user)


class QuizAttemptTests(TestCase):
    """Test QuizAttempt model and methods."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="student@example.com",
            password="pass123",
        )
        self.course, self.chapter = make_course_and_chapter(
            course_title="Course",
            chapter_title="Chapter",
        )
        self.quiz = Quiz.objects.create(
            chapter=self.chapter,
            title="Quiz 1",
            num_questions=10,
        )

    def test_quiz_attempt_creation(self):
        """Test that a quiz attempt can be created."""
        attempt = QuizAttempt.objects.create(
            student=self.user,
            quiz=self.quiz
        )
        self.assertEqual(attempt.student, self.user)

    def test_quiz_attempt_default_status(self):
        """Test that status defaults to IN_PROGRESS."""
        attempt = QuizAttempt.objects.create(
            student=self.user,
            quiz=self.quiz
        )
        self.assertEqual(attempt.status, "IN_PROGRESS")

    def test_is_finished_false(self):
        """Test that is_finished returns False when status is IN_PROGRESS."""
        attempt = QuizAttempt.objects.create(
            student=self.user,
            quiz=self.quiz
        )
        self.assertFalse(attempt.is_finished())

    def test_is_finished_true(self):
        """Test that is_finished returns True when status is COMPLETED."""
        attempt = QuizAttempt.objects.create(
            student=self.user,
            quiz=self.quiz,
            status="COMPLETED"
        )
        self.assertTrue(attempt.is_finished())

    def test_calculate_score(self):
        """Test that calculate_score returns num_correct and num_answered."""
        attempt = QuizAttempt.objects.create(
            student=self.user,
            quiz=self.quiz,
            num_correct=5,
            num_answered=10
        )
        score = attempt.calculate_score()
        self.assertEqual(score["num_correct"], 5)
        self.assertEqual(score["num_answered"], 10)

    def test_attempt_started_at_set(self):
        """Test that started_at is set automatically."""
        attempt = QuizAttempt.objects.create(
            student=self.user,
            quiz=self.quiz
        )
        self.assertIsNotNone(attempt.started_at)

    def test_attempt_defaults_zeros(self):
        """Test that num_correct and num_answered default to 0."""
        attempt = QuizAttempt.objects.create(
            student=self.user,
            quiz=self.quiz
        )
        self.assertEqual(attempt.num_correct, 0)
        self.assertEqual(attempt.num_answered, 0)

    def test_attempt_difficulty_default(self):
        """Test that current_difficulty defaults to MEDIUM."""
        attempt = QuizAttempt.objects.create(
            student=self.user,
            quiz=self.quiz
        )
        self.assertEqual(attempt.current_difficulty, "MEDIUM")


class AttemptAnswerTests(TestCase):
    """Test AttemptAnswer model and constraints."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="student@example.com",
            password="pass123",
        )
        self.course, self.chapter = make_course_and_chapter(
            course_title="Course",
            chapter_title="Chapter",
        )
        self.question = Question.objects.create(
            chapter=self.chapter,
            prompt="Test",
            choices=["A","B","C","D"],
            correct_index=1
        )
        self.quiz = Quiz.objects.create(
            chapter=self.chapter,
            title="Quiz 1",
            num_questions=10,
        )
        self.attempt = QuizAttempt.objects.create(
            student=self.user,
            quiz=self.quiz
        )

    def test_answer_creation(self):
        """Test that an attempt answer can be created."""
        answer = AttemptAnswer.objects.create(
            attempt=self.attempt,
            question=self.question,
            selected_index=1
        )
        self.assertEqual(answer.selected_index, 1)

    def test_answer_is_correct(self):
        """Test that is_correct tracks whether the answer was correct."""
        answer = AttemptAnswer.objects.create(
            attempt=self.attempt,
            question=self.question,
            selected_index=1,
            is_correct=True
        )
        self.assertTrue(answer.is_correct)

    def test_answer_default_incorrect(self):
        """Test that is_correct defaults to False."""
        answer = AttemptAnswer.objects.create(
            attempt=self.attempt,
            question=self.question,
            selected_index=0
        )
        self.assertFalse(answer.is_correct)

    def test_answer_timestamp(self):
        """Test that answered_at is set automatically."""
        answer = AttemptAnswer.objects.create(
            attempt=self.attempt,
            question=self.question
        )
        self.assertIsNotNone(answer.answered_at)

    def test_answer_unique_constraint(self):
        """Test that duplicate attempt-question pair raises IntegrityError."""
        AttemptAnswer.objects.create(
            attempt=self.attempt,
            question=self.question
        )
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            AttemptAnswer.objects.create(
                attempt=self.attempt,
                question=self.question
            )

    def test_answer_selected_index_null(self):
        """Test that selected_index can be null."""
        answer = AttemptAnswer.objects.create(
            attempt=self.attempt,
            question=self.question
        )
        self.assertIsNone(answer.selected_index)

    def test_multiple_answers_per_attempt(self):
        """Test that an attempt can have multiple answers."""
        AttemptAnswer.objects.create(attempt=self.attempt, question=self.question)
        q2 = Question.objects.create(chapter=self.chapter, prompt="Q2", choices=["A","B","C","D"], correct_index=0)
        AttemptAnswer.objects.create(attempt=self.attempt, question=q2)
        count = self.attempt.answers.count()
        self.assertEqual(count, 2)

    def test_answer_question_relationship(self):
        """Test that answer links to question correctly."""
        answer = AttemptAnswer.objects.create(
            attempt=self.attempt,
            question=self.question
        )
        self.assertEqual(answer.question, self.question)

    def test_answer_attempt_relationship(self):
        """Test that answer links to quiz attempt correctly."""
        answer = AttemptAnswer.objects.create(
            attempt=self.attempt,
            question=self.question
        )
        self.assertEqual(answer.attempt, self.attempt)
