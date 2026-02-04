"""Simple test cases for quizzes models"""
from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.courses.models import Course
from apps.quizzes.models import AttemptAnswer, Chapter, Question, QuizAttempt

User = get_user_model()


class ChapterTests(TestCase):
    """Test: Chapter model creation and basic operations"""

    def setUp(self):
        owner = User.objects.create_user(
            email="owner@example.com",
            password="pass123",
            first_name="Owner"
        )
        self.course = Course.objects.create(
            title="Test Course",
            owner=owner,
            slug="test-course"
        )

    def test_chapter_creation(self):
        """Test: Chapter can be created"""
        chapter = Chapter.objects.create(
            course=self.course,
            title="Chapter 1",
            order_index=1
        )
        self.assertEqual(chapter.title, "Chapter 1")

    def test_chapter_str(self):
        """Test: Chapter __str__ returns title"""
        chapter = Chapter.objects.create(
            course=self.course,
            title="Test",
            order_index=1
        )
        self.assertEqual(str(chapter), "Test")

    def test_chapter_null_course(self):
        """Test: Chapter can have null course"""
        chapter = Chapter.objects.create(title="Standalone")
        self.assertIsNone(chapter.course)

    def test_chapter_auto_timestamps(self):
        """Test: created_at auto set"""
        chapter = Chapter.objects.create(
            course=self.course,
            title="Test"
        )
        self.assertIsNotNone(chapter.created_at)

    def test_chapter_order_index_optional(self):
        """Test: order_index can be null"""
        chapter = Chapter.objects.create(
            course=self.course,
            title="Test"
        )
        self.assertIsNone(chapter.order_index)

    def test_chapter_foreign_key(self):
        """Test: Chapter links to Course correctly"""
        chapter = Chapter.objects.create(
            course=self.course,
            title="Test"
        )
        self.assertEqual(chapter.course.title, "Test Course")

    def test_chapter_multiple_same_course(self):
        """Test: Multiple chapters can link to same course"""
        Chapter.objects.create(course=self.course, title="Ch1")
        Chapter.objects.create(course=self.course, title="Ch2")
        count = Chapter.objects.filter(course=self.course).count()
        self.assertEqual(count, 2)

    def test_chapter_query_all(self):
        """Test: Can query chapters from database"""
        Chapter.objects.create(course=self.course, title="Test")
        chapters = Chapter.objects.all()
        self.assertGreater(len(chapters), 0)

    def test_chapter_title_max_length(self):
        """Test: Title field has max_length constraint"""
        max_len = Chapter._meta.get_field('title').max_length
        self.assertEqual(max_len, 255)

    def test_chapter_order_index_integer(self):
        """Test: order_index is IntegerField"""
        chapter = Chapter.objects.create(course=self.course, title="Test", order_index=5)
        self.assertIsInstance(chapter.order_index, int)


class QuestionTests(TestCase):
    """Test: Question model creation and validation"""

    def setUp(self):
        owner = User.objects.create_user(
            email="owner@example.com",
            password="pass123"
        )
        self.course = Course.objects.create(
            title="Test Course",
            owner=owner,
            slug="test-course"
        )
        self.chapter = Chapter.objects.create(
            course=self.course,
            title="Chapter"
        )

    def test_question_creation(self):
        """Test: Question can be created"""
        q = Question.objects.create(
            chapter=self.chapter,
            prompt="2+2?",
            choices=["3","4","5","6"],
            correct_choice=1
        )
        self.assertEqual(q.prompt, "2+2?")

    def test_question_str_format(self):
        """Test: Question __str__ includes ID and difficulty"""
        q = Question.objects.create(
            chapter=self.chapter,
            prompt="Test",
            choices=["A","B","C","D"],
            correct_choice=0,
            difficulty="EASY"
        )
        self.assertIn("EASY", str(q))

    def test_question_difficulty_default(self):
        """Test: Difficulty defaults to MEDIUM"""
        q = Question.objects.create(
            chapter=self.chapter,
            prompt="Test",
            choices=["A","B","C","D"],
            correct_choice=0
        )
        self.assertEqual(q.difficulty, "MEDIUM")

    def test_question_choices_json(self):
        """Test: Choices stored as JSON list"""
        choices = ["A","B","C","D"]
        q = Question.objects.create(
            chapter=self.chapter,
            prompt="Test",
            choices=choices,
            correct_choice=0
        )
        self.assertEqual(q.choices, choices)

    def test_question_created_by_optional(self):
        """Test: created_by can be null"""
        q = Question.objects.create(
            chapter=self.chapter,
            prompt="Test",
            choices=["A","B","C","D"],
            correct_choice=0
        )
        self.assertIsNone(q.created_by)

    def test_question_timestamp(self):
        """Test: created_at auto set"""
        q = Question.objects.create(
            chapter=self.chapter,
            prompt="Test",
            choices=["A","B","C","D"],
            correct_choice=0
        )
        self.assertIsNotNone(q.created_at)

    def test_question_correct_choice_index(self):
        """Test: correct_choice is valid index"""
        q = Question.objects.create(
            chapter=self.chapter,
            prompt="Test",
            choices=["A","B","C","D"],
            correct_choice=2
        )
        self.assertIn(q.correct_choice, [0,1,2,3])

    def test_question_difficulty_choices(self):
        """Test: Difficulty is one of valid choices"""
        q = Question.objects.create(
            chapter=self.chapter,
            prompt="Test",
            choices=["A","B","C","D"],
            correct_choice=0,
            difficulty="HARD"
        )
        valid = ["EASY", "MEDIUM", "HARD"]
        self.assertIn(q.difficulty, valid)

    def test_question_multiple_per_chapter(self):
        """Test: Multiple questions can belong to chapter"""
        Question.objects.create(chapter=self.chapter, prompt="Q1", choices=["A","B","C","D"], correct_choice=0)
        Question.objects.create(chapter=self.chapter, prompt="Q2", choices=["A","B","C","D"], correct_choice=1)
        count = Question.objects.filter(chapter=self.chapter).count()
        self.assertEqual(count, 2)

    def test_question_with_user(self):
        """Test: Question can track creator"""
        user = User.objects.create_user(email="creator@example.com", password="pass123")
        q = Question.objects.create(
            chapter=self.chapter,
            prompt="Test",
            choices=["A","B","C","D"],
            correct_choice=0,
            created_by=user
        )
        self.assertEqual(q.created_by, user)


class QuizAttemptTests(TestCase):
    """Test: QuizAttempt model and methods"""

    def setUp(self):
        self.user = User.objects.create_user(
            email="student@example.com",
            password="pass123"
        )
        owner = User.objects.create_user(
            email="owner@example.com",
            password="pass123"
        )
        self.course = Course.objects.create(
            title="Course",
            owner=owner,
            slug="course"
        )
        self.chapter = Chapter.objects.create(
            course=self.course,
            title="Chapter"
        )

    def test_quiz_attempt_creation(self):
        """Test: QuizAttempt can be created"""
        attempt = QuizAttempt.objects.create(
            student=self.user,
            chapter=self.chapter
        )
        self.assertEqual(attempt.student, self.user)

    def test_quiz_attempt_default_status(self):
        """Test: Status defaults to IN_PROGRESS"""
        attempt = QuizAttempt.objects.create(
            student=self.user,
            chapter=self.chapter
        )
        self.assertEqual(attempt.status, "IN_PROGRESS")

    def test_is_finished_false(self):
        """Test: is_finished() returns False for IN_PROGRESS"""
        attempt = QuizAttempt.objects.create(
            student=self.user,
            chapter=self.chapter
        )
        self.assertFalse(attempt.is_finished())

    def test_is_finished_true(self):
        """Test: is_finished() returns True when COMPLETED"""
        attempt = QuizAttempt.objects.create(
            student=self.user,
            chapter=self.chapter,
            status="COMPLETED"
        )
        self.assertTrue(attempt.is_finished())

    def test_calculate_score(self):
        """Test: calculate_score returns correct format"""
        attempt = QuizAttempt.objects.create(
            student=self.user,
            chapter=self.chapter,
            num_correct=5,
            num_answered=10
        )
        score = attempt.calculate_score()
        self.assertEqual(score["num_correct"], 5)
        self.assertEqual(score["num_answered"], 10)

    def test_attempt_mode_default(self):
        """Test: Mode defaults to QUIZ"""
        attempt = QuizAttempt.objects.create(
            student=self.user,
            chapter=self.chapter
        )
        self.assertEqual(attempt.mode, "QUIZ")

    def test_attempt_with_practice_mode(self):
        """Test: Can create PRACTICE mode attempt"""
        attempt = QuizAttempt.objects.create(
            student=self.user,
            chapter=self.chapter,
            mode="PRACTICE"
        )
        self.assertEqual(attempt.mode, "PRACTICE")

    def test_attempt_started_at_set(self):
        """Test: started_at is set automatically"""
        attempt = QuizAttempt.objects.create(
            student=self.user,
            chapter=self.chapter
        )
        self.assertIsNotNone(attempt.started_at)

    def test_attempt_defaults_zeros(self):
        """Test: num_correct and num_answered default to 0"""
        attempt = QuizAttempt.objects.create(
            student=self.user,
            chapter=self.chapter
        )
        self.assertEqual(attempt.num_correct, 0)
        self.assertEqual(attempt.num_answered, 0)

    def test_attempt_difficulty_default(self):
        """Test: current_difficulty defaults to MEDIUM"""
        attempt = QuizAttempt.objects.create(
            student=self.user,
            chapter=self.chapter
        )
        self.assertEqual(attempt.current_difficulty, "MEDIUM")


class AttemptAnswerTests(TestCase):
    """Test: AttemptAnswer model and constraints"""

    def setUp(self):
        self.user = User.objects.create_user(
            email="student@example.com",
            password="pass123"
        )
        owner = User.objects.create_user(
            email="owner@example.com",
            password="pass123"
        )
        self.course = Course.objects.create(
            title="Course",
            owner=owner,
            slug="course"
        )
        self.chapter = Chapter.objects.create(
            course=self.course,
            title="Chapter"
        )
        self.question = Question.objects.create(
            chapter=self.chapter,
            prompt="Test",
            choices=["A","B","C","D"],
            correct_choice=1
        )
        self.attempt = QuizAttempt.objects.create(
            student=self.user,
            chapter=self.chapter
        )

    def test_answer_creation(self):
        """Test: AttemptAnswer can be created"""
        answer = AttemptAnswer.objects.create(
            attempt=self.attempt,
            question=self.question,
            selected_choice=1
        )
        self.assertEqual(answer.selected_choice, 1)

    def test_answer_is_correct(self):
        """Test: is_correct tracks correctness"""
        answer = AttemptAnswer.objects.create(
            attempt=self.attempt,
            question=self.question,
            selected_choice=1,
            is_correct=True
        )
        self.assertTrue(answer.is_correct)

    def test_answer_default_incorrect(self):
        """Test: is_correct defaults to False"""
        answer = AttemptAnswer.objects.create(
            attempt=self.attempt,
            question=self.question,
            selected_choice=0
        )
        self.assertFalse(answer.is_correct)

    def test_answer_timestamp(self):
        """Test: answered_at auto set"""
        answer = AttemptAnswer.objects.create(
            attempt=self.attempt,
            question=self.question
        )
        self.assertIsNotNone(answer.answered_at)

    def test_answer_unique_constraint(self):
        """Test: Cannot create duplicate attempt-question"""
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

    def test_answer_selected_choice_null(self):
        """Test: selected_choice can be null"""
        answer = AttemptAnswer.objects.create(
            attempt=self.attempt,
            question=self.question
        )
        self.assertIsNone(answer.selected_choice)

    def test_multiple_answers_per_attempt(self):
        """Test: Attempt can have multiple answers"""
        AttemptAnswer.objects.create(attempt=self.attempt, question=self.question)
        q2 = Question.objects.create(chapter=self.chapter, prompt="Q2", choices=["A","B","C","D"], correct_choice=0)
        AttemptAnswer.objects.create(attempt=self.attempt, question=q2)
        count = self.attempt.answers.count()
        self.assertEqual(count, 2)

    def test_answer_question_relationship(self):
        """Test: Answer links to Question"""
        answer = AttemptAnswer.objects.create(
            attempt=self.attempt,
            question=self.question
        )
        self.assertEqual(answer.question, self.question)

    def test_answer_attempt_relationship(self):
        """Test: Answer links to QuizAttempt"""
        answer = AttemptAnswer.objects.create(
            attempt=self.attempt,
            question=self.question
        )
        self.assertEqual(answer.attempt, self.attempt)
