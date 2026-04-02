"""
Tests for quiz serializers (Chapter, Question, Quiz, QuizAttempt, submit answer).
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import serializers

from apps.courses.models import Course, Topic
from apps.quizzes.models import Chapter, Difficulty, QuestionReviewStatus
from apps.quizzes.serializers import (
    AttemptAnswerSubmitSerializer,
    AttemptDetailSerializer,
    ChapterSerializer,
    QuestionBulkImportSerializer,
    QuestionCreateUpdateSerializer,
    QuestionImportItemSerializer,
    QuestionStudentSerializer,
    QuizSerializer,
    QuizStudentSerializer,
)
from apps.quizzes.tests.test_utils import (
    make_attempt,
    make_course_and_chapter,
    make_question,
    make_quiz,
)

User = get_user_model()


class ChapterSerializerTests(TestCase):
    """Test ChapterSerializer serialization."""

    def setUp(self):
        self.course, self.chapter = make_course_and_chapter(
            chapter_title="Chapter 1",
        )
        # Set order_index for serializer output
        self.chapter.order_index = 1
        self.chapter.save(update_fields=["order_index"])

    def test_serializes_chapter_fields(self):
        """Test that serializer includes id, course, title, order_index."""
        serializer = ChapterSerializer(self.chapter)
        data = serializer.data
        self.assertIn("id", data)
        self.assertIn("course", data)
        self.assertEqual(data["title"], "Chapter 1")
        self.assertEqual(data["order_index"], 1)


class QuestionCreateUpdateSerializerTests(TestCase):
    """Test QuestionCreateUpdateSerializer validation."""

    def setUp(self):
        self.course, self.chapter = make_course_and_chapter()

    def test_validate_choices_rejects_wrong_length(self):
        """Test that choices must be a list of exactly 4 options."""
        serializer = QuestionCreateUpdateSerializer(
            data={
                "prompt": "Q?",
                "choices": ["A", "B", "C"],
                "correct_index": 0,
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("choices", serializer.errors)

    def test_validate_choices_accepts_four_options(self):
        """Test that valid choices list of 4 passes validation."""
        serializer = QuestionCreateUpdateSerializer(
            data={
                "prompt": "Q?",
                "choices": ["A", "B", "C", "D"],
                "correct_index": 0,
            }
        )
        self.assertTrue(serializer.is_valid())

    def test_validate_correct_index_rejects_out_of_range(self):
        """Test that correct_index must be between 0 and 3."""
        serializer = QuestionCreateUpdateSerializer(
            data={
                "prompt": "Q?",
                "choices": ["A", "B", "C", "D"],
                "correct_index": 4,
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("correct_index", serializer.errors)

    def test_validate_correct_index_accepts_valid_range(self):
        """Test that correct_index 0-3 passes validation."""
        serializer = QuestionCreateUpdateSerializer(
            data={
                "prompt": "Q?",
                "choices": ["A", "B", "C", "D"],
                "correct_index": 2,
            }
        )
        self.assertTrue(serializer.is_valid())

    def test_validate_topics_rejects_topic_from_other_course(self):
        """Topics must belong to the chapter's course."""
        other_course = Course.objects.create(
            title="Other",
            owner=self.course.owner,
            slug="other-course",
        )
        foreign_topic = Topic.objects.create(course=other_course, name="Foreign")
        serializer = QuestionCreateUpdateSerializer(
            data={
                "prompt": "Q?",
                "choices": ["A", "B", "C", "D"],
                "correct_index": 0,
                "topics": [foreign_topic.id],
            },
            context={"chapter": self.chapter},
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("topics", serializer.errors)

    def test_create_saves_topics_m2m(self):
        topic = Topic.objects.create(course=self.course, name="Unit 1")
        user = User.objects.create_user(email="author@example.com", password="x")
        serializer = QuestionCreateUpdateSerializer(
            data={
                "prompt": "Q?",
                "choices": ["A", "B", "C", "D"],
                "correct_index": 0,
                "topics": [topic.id],
            },
            context={"chapter": self.chapter},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        question = serializer.save(chapter=self.chapter, created_by=user)
        self.assertEqual(list(question.topics.all()), [topic])

    def test_update_sets_topics(self):
        question = make_question(self.chapter, prompt="Q")
        topic = Topic.objects.create(course=self.course, name="Tag")
        serializer = QuestionCreateUpdateSerializer(
            instance=question,
            data={"topics": [topic.id]},
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()
        question.refresh_from_db()
        self.assertEqual(list(question.topics.all()), [topic])

    def test_create_defaults_review_status_approved_for_manual_questions(self):
        user = User.objects.create_user(email="author2@example.com", password="x")
        serializer = QuestionCreateUpdateSerializer(
            data={
                "prompt": "Q?",
                "choices": ["A", "B", "C", "D"],
                "correct_index": 0,
            },
            context={"chapter": self.chapter},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        question = serializer.save(chapter=self.chapter, created_by=user)
        self.assertEqual(question.review_status, QuestionReviewStatus.APPROVED)
        self.assertFalse(question.is_ai_generated)


class QuestionImportItemSerializerTests(TestCase):
    """Target line-level validation paths for bulk import item serializer."""

    def test_validate_prompt_rejects_blank_after_trim(self):
        serializer = QuestionImportItemSerializer()
        with self.assertRaises(serializers.ValidationError):
            serializer.validate_prompt("   ")

    def test_validate_prompt_returns_trimmed_value(self):
        serializer = QuestionImportItemSerializer()
        self.assertEqual(serializer.validate_prompt("  Prompt  "), "Prompt")

    def test_validate_choices_rejects_non_string_choice(self):
        serializer = QuestionImportItemSerializer()
        with self.assertRaises(serializers.ValidationError):
            serializer.validate_choices(["A", "B", 3, "D"])

    def test_validate_choices_rejects_wrong_length(self):
        serializer = QuestionImportItemSerializer()
        with self.assertRaises(serializers.ValidationError):
            serializer.validate_choices(["A", "B", "C"])

    def test_validate_choices_returns_trimmed_choices(self):
        serializer = QuestionImportItemSerializer()
        self.assertEqual(
            serializer.validate_choices([" A ", "B", " C", "D "]),
            ["A", "B", "C", "D"],
        )

    def test_bulk_import_serializer_defaults_overwrite_existing(self):
        serializer = QuestionBulkImportSerializer(
            data={
                "questions": [
                    {
                        "prompt": "What is 2 + 2?",
                        "choices": ["1", "2", "3", "4"],
                        "correct_index": 3,
                        "difficulty": "EASY",
                    }
                ]
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertFalse(serializer.validated_data["overwrite_existing"])


class QuestionTopicValidationTests(TestCase):
    """Test QuestionCreateUpdateSerializer topic validation (cross-course prevention)."""

    def setUp(self):
        self.course, self.chapter = make_course_and_chapter()
        self.topic_same_course = Topic.objects.create(
            course=self.course, name="Algebra"
        )

    def test_create_question_with_valid_topics_same_course(self):
        """Question create with topic from same course succeeds."""
        serializer = QuestionCreateUpdateSerializer(
            data={
                "prompt": "Q?",
                "choices": ["A", "B", "C", "D"],
                "correct_index": 0,
                "topics": [str(self.topic_same_course.id)],
            },
            context={"chapter": self.chapter},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_create_question_with_topic_from_different_course_fails(self):
        """Question create with topic from different course fails validation."""
        other_course = Course.objects.create(
            title="Other Course",
            owner=self.course.owner,
            slug="other-course",
        )
        Chapter.objects.create(course=other_course, title="Other Chapter")
        topic_other = Topic.objects.create(course=other_course, name="Other Topic")

        serializer = QuestionCreateUpdateSerializer(
            data={
                "prompt": "Q?",
                "choices": ["A", "B", "C", "D"],
                "correct_index": 0,
                "topics": [str(topic_other.id)],
            },
            context={"chapter": self.chapter},
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("topics", serializer.errors)

    def test_create_question_with_zero_topics_allowed(self):
        """Question create with no topics is allowed."""
        serializer = QuestionCreateUpdateSerializer(
            data={
                "prompt": "Q?",
                "choices": ["A", "B", "C", "D"],
                "correct_index": 0,
            },
            context={"chapter": self.chapter},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_create_question_with_multiple_topics_allowed(self):
        """Question create with multiple topics from same course succeeds."""
        topic2 = Topic.objects.create(course=self.course, name="Geometry")

        serializer = QuestionCreateUpdateSerializer(
            data={
                "prompt": "Q?",
                "choices": ["A", "B", "C", "D"],
                "correct_index": 0,
                "topics": [str(self.topic_same_course.id), str(topic2.id)],
            },
            context={"chapter": self.chapter},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_update_question_with_cross_course_topic_fails(self):
        """Question update with topic from different course fails validation."""
        question = make_question(self.chapter, prompt="Original")
        question.topics.add(self.topic_same_course)

        other_course = Course.objects.create(
            title="Other Course",
            owner=self.course.owner,
            slug="other-course",
        )
        Chapter.objects.create(course=other_course, title="Other Chapter")
        topic_other = Topic.objects.create(course=other_course, name="Other Topic")

        serializer = QuestionCreateUpdateSerializer(
            instance=question,
            data={
                "prompt": "Updated?",
                "choices": ["A", "B", "C", "D"],
                "correct_index": 0,
                "topics": [str(topic_other.id)],
            },
            partial=True,
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("topics", serializer.errors)

    def test_create_question_topics_without_context_allows_validation(self):
        """Question create without chapter/instance context does not apply course check."""
        serializer = QuestionCreateUpdateSerializer(
            data={
                "prompt": "Q?",
                "choices": ["A", "B", "C", "D"],
                "correct_index": 0,
                "topics": [str(self.topic_same_course.id)],
            },
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)


class QuestionStudentSerializerTests(TestCase):
    """Test QuestionStudentSerializer (no correct_index exposed)."""

    def setUp(self):
        self.course, self.chapter = make_course_and_chapter()
        self.question = make_question(
            self.chapter,
            prompt="Q?",
            correct_index=1,
            difficulty=Difficulty.MEDIUM,
        )

    def test_excludes_correct_index(self):
        """Test that student serializer does not expose correct_index."""
        serializer = QuestionStudentSerializer(self.question)
        self.assertNotIn("correct_index", serializer.data)
        self.assertIn("prompt", serializer.data)
        self.assertIn("choices", serializer.data)
        self.assertIn("difficulty", serializer.data)


class QuizSerializerTests(TestCase):
    """Test QuizSerializer serialization."""

    def setUp(self):
        self.course, self.chapter = make_course_and_chapter()
        self.quiz = make_quiz(
            self.chapter,
            title="Quiz 1",
            num_questions=10,
            is_published=True,
        )

    def test_serializes_quiz_fields(self):
        """Test that serializer includes expected quiz fields."""
        serializer = QuizSerializer(self.quiz)
        data = serializer.data
        self.assertIn("id", data)
        self.assertIn("chapter", data)
        self.assertIn("adaptive_enabled", data)
        self.assertIn("selection_mode", data)
        self.assertEqual(data["title"], "Quiz 1")
        self.assertEqual(data["num_questions"], 10)
        self.assertTrue(data["is_published"])

    def test_quiz_serializer_meta_fields_and_read_only_configuration(self):
        serializer = QuizSerializer(self.quiz)
        self.assertIn("id", QuizSerializer.Meta.fields)
        self.assertIn("is_published", QuizSerializer.Meta.fields)
        self.assertEqual(
            QuizSerializer.Meta.read_only_fields,
            ("id", "chapter", "created_at"),
        )
        self.assertTrue(serializer.fields["id"].read_only)
        self.assertTrue(serializer.fields["chapter"].read_only)
        self.assertTrue(serializer.fields["created_at"].read_only)


class QuizStudentSerializerTests(TestCase):
    """Test QuizStudentSerializer attempt_status/attempt_id when no request or unauthenticated."""

    def setUp(self):
        self.course, self.chapter = make_course_and_chapter()
        self.quiz = make_quiz(
            self.chapter,
            title="Student Quiz",
            num_questions=5,
            is_published=True,
        )

    def test_attempt_status_and_id_none_when_no_request_in_context(self):
        """When context has no request, attempt_status and attempt_id are None (coverage for early return)."""
        serializer = QuizStudentSerializer(self.quiz, context={})
        data = serializer.data
        self.assertIsNone(data["attempt_status"])
        self.assertIsNone(data["attempt_id"])

    def test_attempt_status_and_id_none_when_user_not_authenticated(self):
        """When request user is not authenticated, attempt_status and attempt_id are None."""
        from django.contrib.auth.models import AnonymousUser
        from rest_framework.request import Request
        from rest_framework.test import APIRequestFactory

        factory = APIRequestFactory()
        request = Request(factory.get("/"))
        request.user = AnonymousUser()
        serializer = QuizStudentSerializer(self.quiz, context={"request": request})
        data = serializer.data
        self.assertIsNone(data["attempt_status"])
        self.assertIsNone(data["attempt_id"])


class AttemptDetailSerializerTests(TestCase):
    """Test AttemptDetailSerializer and score_percent."""

    def setUp(self):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        self.user = User.objects.create_user(
            email="user@example.com", password="pass123"
        )
        self.course, self.chapter = make_course_and_chapter()
        self.quiz = make_quiz(self.chapter, title="Quiz", num_questions=10)
        self.attempt = make_attempt(self.user, self.quiz)

    def test_score_percent_zero_when_no_answers(self):
        """Test that score_percent is 0 when num_answered is 0."""
        serializer = AttemptDetailSerializer(self.attempt)
        self.assertEqual(serializer.data["score_percent"], 0.0)

    def test_score_percent_calculated_when_answered(self):
        """Test that score_percent is correct when answers exist."""
        self.attempt.num_answered = 10
        self.attempt.num_correct = 7
        self.attempt.save(update_fields=["num_answered", "num_correct"])
        serializer = AttemptDetailSerializer(self.attempt)
        self.assertEqual(serializer.data["score_percent"], 70.0)


class AttemptAnswerSubmitSerializerTests(TestCase):
    """Test AttemptAnswerSubmitSerializer validation."""

    def test_validate_selected_index_rejects_out_of_range(self):
        """Test that selected_index must be between 0 and 3."""
        serializer = AttemptAnswerSubmitSerializer(
            data={"question_id": 1, "selected_index": 5}
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("selected_index", serializer.errors)

    def test_validate_selected_index_accepts_valid_range(self):
        """Test that selected_index 0-3 passes validation."""
        serializer = AttemptAnswerSubmitSerializer(
            data={"question_id": 1, "selected_index": 2}
        )
        self.assertTrue(serializer.is_valid())

    def test_requires_question_id_and_selected_index(self):
        """Test that question_id and selected_index are required."""
        serializer = AttemptAnswerSubmitSerializer(data={})
        self.assertFalse(serializer.is_valid())
        self.assertIn("question_id", serializer.errors)
        self.assertIn("selected_index", serializer.errors)
