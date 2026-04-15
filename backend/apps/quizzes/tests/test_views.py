"""
Tests for quiz API views: chapters, questions, quizzes, attempts, and student flows.
"""
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.courses.models import Course, CourseMembership, CourseRole, Topic
from apps.quizzes.models import Chapter, Difficulty, Question, Quiz, QuizAttempt
from apps.quizzes.tests.test_utils import (
    make_attempt,
    make_course_and_chapter,
    make_question,
    make_quiz,
)

User = get_user_model()


class ChapterListCreateViewTests(TestCase):
    """Test chapter list and create (staff only)."""

    def setUp(self):
        self.client = APIClient()
        self.course, self.chapter = make_course_and_chapter()
        self.owner = self.course.owner
        self.student = User.objects.create_user(
            email="student@example.com", password="pass123"
        )
        CourseMembership.objects.create(
            course=self.course, user=self.owner, role=CourseRole.OWNER
        )
        CourseMembership.objects.create(
            course=self.course, user=self.student, role=CourseRole.STUDENT
        )

    def test_list_chapters_as_staff_returns_200(self):
        """Test that course staff can list chapters."""
        self.client.force_authenticate(user=self.owner)
        url = reverse(
            "chapter-list-create",
            kwargs={"course_id": self.course.id},
        )
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 1)

    def test_list_chapters_as_non_staff_returns_403(self):
        """Test that non-staff course member cannot list chapters."""
        self.client.force_authenticate(user=self.student)
        url = reverse(
            "chapter-list-create",
            kwargs={"course_id": self.course.id},
        )
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_chapter_as_staff_returns_201(self):
        """Test that course staff can create a chapter."""
        self.client.force_authenticate(user=self.owner)
        url = reverse(
            "chapter-list-create",
            kwargs={"course_id": self.course.id},
        )
        res = self.client.post(
            url,
            data={
                "title": "New Chapter",
                "order_index": 2,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["title"], "New Chapter")
        self.assertEqual(str(res.data["course"]), str(self.course.id))
        self.assertTrue(Chapter.objects.filter(title="New Chapter").exists())

    def test_create_chapter_as_non_staff_returns_403(self):
        """Test that non-staff cannot create a chapter."""
        self.client.force_authenticate(user=self.student)
        url = reverse(
            "chapter-list-create",
            kwargs={"course_id": self.course.id},
        )
        res = self.client.post(
            url,
            data={"title": "New Chapter"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_chapters_requires_authentication(self):
        """Test that unauthenticated user cannot list chapters."""
        url = reverse(
            "chapter-list-create",
            kwargs={"course_id": self.course.id},
        )
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class ChapterDetailViewTests(TestCase):
    """Test chapter retrieve, update, destroy (staff only)."""

    def setUp(self):
        self.client = APIClient()
        self.course, self.chapter = make_course_and_chapter()
        self.owner = self.course.owner
        self.student = User.objects.create_user(
            email="student@example.com", password="pass123"
        )
        CourseMembership.objects.create(
            course=self.course, user=self.owner, role=CourseRole.OWNER
        )
        CourseMembership.objects.create(
            course=self.course, user=self.student, role=CourseRole.STUDENT
        )

    def test_retrieve_chapter_as_staff_returns_200(self):
        """Test that staff can retrieve a chapter."""
        self.client.force_authenticate(user=self.owner)
        url = reverse("chapter-detail", kwargs={"pk": self.chapter.pk})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["id"], self.chapter.id)
        self.assertEqual(res.data["title"], self.chapter.title)

    def test_retrieve_chapter_as_non_staff_returns_403(self):
        """Test that non-staff cannot retrieve a chapter."""
        self.client.force_authenticate(user=self.student)
        url = reverse("chapter-detail", kwargs={"pk": self.chapter.pk})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_chapter_as_staff_returns_200(self):
        """Test that staff can update a chapter."""
        self.client.force_authenticate(user=self.owner)
        url = reverse("chapter-detail", kwargs={"pk": self.chapter.pk})
        res = self.client.patch(
            url,
            data={"title": "Updated Chapter Title", "order_index": 10},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.chapter.refresh_from_db()
        self.assertEqual(self.chapter.title, "Updated Chapter Title")
        self.assertEqual(self.chapter.order_index, 10)

    def test_update_chapter_as_non_staff_returns_403(self):
        """Test that non-staff cannot update a chapter."""
        self.client.force_authenticate(user=self.student)
        url = reverse("chapter-detail", kwargs={"pk": self.chapter.pk})
        res = self.client.patch(
            url,
            data={"title": "Hacked"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_destroy_chapter_as_staff_returns_204(self):
        """Test that staff can delete a chapter (cascades to questions and quizzes)."""
        self.client.force_authenticate(user=self.owner)
        url = reverse("chapter-detail", kwargs={"pk": self.chapter.pk})
        chapter_id = self.chapter.id
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Chapter.objects.filter(pk=chapter_id).exists())

    def test_destroy_chapter_as_non_staff_returns_403(self):
        """Test that non-staff cannot delete a chapter."""
        self.client.force_authenticate(user=self.student)
        url = reverse("chapter-detail", kwargs={"pk": self.chapter.pk})
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class QuestionListCreateViewTests(TestCase):
    """Test question list and create (staff only)."""

    def setUp(self):
        self.client = APIClient()
        self.course, self.chapter = make_course_and_chapter()
        self.owner = self.course.owner
        self.student = User.objects.create_user(
            email="student@example.com", password="pass123"
        )
        CourseMembership.objects.create(
            course=self.course, user=self.owner, role=CourseRole.OWNER
        )
        CourseMembership.objects.create(
            course=self.course, user=self.student, role=CourseRole.STUDENT
        )

    def test_list_questions_as_staff_returns_200(self):
        """Test that course staff can list questions."""
        self.client.force_authenticate(user=self.owner)
        url = reverse(
            "question-list-create",
            kwargs={"chapter_id": self.chapter.id},
        )
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_list_questions_as_non_staff_returns_403(self):
        """Test that non-staff cannot list questions."""
        self.client.force_authenticate(user=self.student)
        url = reverse(
            "question-list-create",
            kwargs={"chapter_id": self.chapter.id},
        )
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_question_as_staff_returns_201(self):
        """Test that course staff can create a question."""
        self.client.force_authenticate(user=self.owner)
        url = reverse(
            "question-list-create",
            kwargs={"chapter_id": self.chapter.id},
        )
        res = self.client.post(
            url,
            data={
                "prompt": "What is 2+2?",
                "choices": ["3", "4", "5", "6"],
                "correct_index": 1,
                "difficulty": Difficulty.MEDIUM,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["prompt"], "What is 2+2?")
        self.assertTrue(
            Question.objects.filter(prompt="What is 2+2?").exists()
        )

    def test_create_question_as_non_staff_returns_403(self):
        """Test that non-staff cannot create a question."""
        self.client.force_authenticate(user=self.student)
        url = reverse(
            "question-list-create",
            kwargs={"chapter_id": self.chapter.id},
        )
        res = self.client.post(
            url,
            data={
                "prompt": "Q?",
                "choices": ["A", "B", "C", "D"],
                "correct_index": 0,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_questions_excludes_soft_deleted(self):
        """Test that soft-deleted (is_active=False) questions do not appear in list."""
        self.client.force_authenticate(user=self.owner)
        q1 = make_question(self.chapter, prompt="Visible", correct_index=0)
        q2 = make_question(self.chapter, prompt="Will be deleted", correct_index=0)
        q2.is_active = False
        q2.save(update_fields=["is_active"])
        url = reverse(
            "question-list-create",
            kwargs={"chapter_id": self.chapter.id},
        )
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get("results", res.data) if isinstance(res.data, dict) else res.data
        ids = [q["id"] for q in results]
        self.assertIn(q1.id, ids)
        self.assertNotIn(q2.id, ids)

    def test_create_question_with_topics_associates_topics(self):
        """Test that creating a question with topic_ids associates topics correctly."""
        topic = Topic.objects.create(course=self.course, name="Algebra")
        self.client.force_authenticate(user=self.owner)
        url = reverse(
            "question-list-create",
            kwargs={"chapter_id": self.chapter.id},
        )
        res = self.client.post(
            url,
            data={
                "prompt": "Solve for x",
                "choices": ["1", "2", "3", "4"],
                "correct_index": 0,
                "topics": [str(topic.id)],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn("topics", res.data)
        self.assertEqual(len(res.data["topics"]), 1)
        q = Question.objects.get(prompt="Solve for x")
        self.assertEqual(list(q.topics.values_list("id", flat=True)), [topic.id])

    def test_list_questions_filter_by_topic(self):
        """Test that ?topic= param filters questions by topic."""
        topic1 = Topic.objects.create(course=self.course, name="Algebra")
        topic2 = Topic.objects.create(course=self.course, name="Geometry")
        q1 = make_question(self.chapter, prompt="Algebra Q", correct_index=0)
        q1.topics.add(topic1)
        q2 = make_question(self.chapter, prompt="Geometry Q", correct_index=0)
        q2.topics.add(topic2)
        q3 = make_question(self.chapter, prompt="Both", correct_index=0)
        q3.topics.add(topic1, topic2)

        self.client.force_authenticate(user=self.owner)
        url = reverse(
            "question-list-create",
            kwargs={"chapter_id": self.chapter.id},
        )
        res = self.client.get(url, {"topic": str(topic1.id)})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get("results", res.data) if isinstance(res.data, dict) else res.data
        ids = [q["id"] for q in results]
        self.assertIn(q1.id, ids)
        self.assertIn(q3.id, ids)
        self.assertNotIn(q2.id, ids)

    def test_list_questions_invalid_topic_uuid_returns_400(self):
        """Test that invalid ?topic= value returns 400."""
        self.client.force_authenticate(user=self.owner)
        url = reverse(
            "question-list-create",
            kwargs={"chapter_id": self.chapter.id},
        )
        res = self.client.get(url, {"topic": "not-a-uuid"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("topic", res.data)


class QuestionDetailViewTests(TestCase):
    """Test question retrieve, update, destroy (staff only)."""

    def setUp(self):
        self.client = APIClient()
        self.course, self.chapter = make_course_and_chapter()
        self.question = make_question(
            self.chapter, prompt="Original", correct_index=0
        )
        self.owner = self.course.owner
        self.student = User.objects.create_user(
            email="student@example.com", password="pass123"
        )
        CourseMembership.objects.create(
            course=self.course, user=self.owner, role=CourseRole.OWNER
        )
        CourseMembership.objects.create(
            course=self.course, user=self.student, role=CourseRole.STUDENT
        )

    def test_retrieve_question_as_staff_returns_200(self):
        """Test that staff can retrieve a question."""
        self.client.force_authenticate(user=self.owner)
        url = reverse("question-detail", kwargs={"pk": self.question.pk})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["prompt"], "Original")

    def test_retrieve_question_as_member_returns_403(self):
        """Test that course member cannot retrieve a question (students get questions only via attempt flow)."""
        self.client.force_authenticate(user=self.student)
        url = reverse("question-detail", kwargs={"pk": self.question.pk})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_question_as_staff_returns_200(self):
        """Test that staff can update a question."""
        self.client.force_authenticate(user=self.owner)
        url = reverse("question-detail", kwargs={"pk": self.question.pk})
        res = self.client.patch(
            url,
            data={"prompt": "Updated prompt"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.question.refresh_from_db()
        self.assertEqual(self.question.prompt, "Updated prompt")

    def test_update_question_topics(self):
        """Test that staff can update question topics via PATCH."""
        topic1 = Topic.objects.create(course=self.course, name="Algebra")
        topic2 = Topic.objects.create(course=self.course, name="Geometry")
        self.question.topics.add(topic1)

        self.client.force_authenticate(user=self.owner)
        url = reverse("question-detail", kwargs={"pk": self.question.pk})
        res = self.client.patch(
            url,
            data={"topics": [str(topic1.id), str(topic2.id)]},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.question.refresh_from_db()
        topic_ids = list(self.question.topics.values_list("id", flat=True))
        self.assertEqual(set(topic_ids), {topic1.id, topic2.id})

    def test_destroy_question_as_staff_soft_deletes_returns_204(self):
        """Test that staff destroy sets is_active=False."""
        self.client.force_authenticate(user=self.owner)
        url = reverse("question-detail", kwargs={"pk": self.question.pk})
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.question.refresh_from_db()
        self.assertFalse(self.question.is_active)

    def test_update_question_as_student_returns_403(self):
        self.client.force_authenticate(user=self.student)
        url = reverse("question-detail", kwargs={"pk": self.question.pk})
        res = self.client.patch(url, data={"prompt": "X"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_destroy_question_as_student_returns_403(self):
        self.client.force_authenticate(user=self.student)
        url = reverse("question-detail", kwargs={"pk": self.question.pk})
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class QuestionBulkImportViewTests(TestCase):
    """Test bulk question import endpoint for staff users."""

    def setUp(self):
        self.client = APIClient()
        self.course, self.chapter = make_course_and_chapter()
        self.owner = self.course.owner
        self.student = User.objects.create_user(
            email="student@example.com",
            password="pass123",
        )
        CourseMembership.objects.create(
            course=self.course, user=self.owner, role=CourseRole.OWNER
        )
        CourseMembership.objects.create(
            course=self.course, user=self.student, role=CourseRole.STUDENT
        )
        self.url = reverse("question-bulk-import", kwargs={"chapter_id": self.chapter.id})

    def test_bulk_import_creates_questions_for_staff(self):
        self.client.force_authenticate(user=self.owner)
        payload = {
            "questions": [
                {
                    "prompt": "What is 2+2?",
                    "choices": ["1", "2", "3", "4"],
                    "correct_index": 3,
                    "difficulty": "EASY",
                },
                {
                    "prompt": "What is 3+4?",
                    "choices": ["6", "7", "8", "9"],
                    "correct_index": 1,
                    "difficulty": "MEDIUM",
                },
            ]
        }
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["summary"]["created"], 2)
        self.assertEqual(response.data["summary"]["failed"], 0)
        self.assertEqual(Question.objects.filter(chapter=self.chapter).count(), 2)

    def test_bulk_import_reports_invalid_rows_and_continues(self):
        self.client.force_authenticate(user=self.owner)
        payload = {
            "questions": [
                {
                    "prompt": "Valid",
                    "choices": ["A", "B", "C", "D"],
                    "correct_index": 0,
                    "difficulty": "EASY",
                },
                {
                    "prompt": "Invalid",
                    "choices": ["A", "B"],
                    "correct_index": 0,
                    "difficulty": "EASY",
                },
            ]
        }
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["summary"]["created"], 1)
        self.assertEqual(response.data["summary"]["failed"], 1)
        statuses = [row["status"] for row in response.data["results"]]
        self.assertIn("created", statuses)
        self.assertIn("error", statuses)

    def test_bulk_import_skips_duplicate_prompt_by_default(self):
        self.client.force_authenticate(user=self.owner)
        make_question(
            self.chapter,
            prompt="Duplicate prompt",
            choices=["A", "B", "C", "D"],
            correct_index=0,
            difficulty=Difficulty.EASY,
        )
        payload = {
            "questions": [
                {
                    "prompt": "Duplicate prompt",
                    "choices": ["D", "C", "B", "A"],
                    "correct_index": 1,
                    "difficulty": "HARD",
                }
            ]
        }
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["summary"]["skipped"], 1)
        self.assertEqual(response.data["summary"]["updated"], 0)

        existing = Question.objects.get(chapter=self.chapter, prompt="Duplicate prompt")
        self.assertEqual(existing.correct_index, 0)
        self.assertEqual(existing.difficulty, Difficulty.EASY)

    def test_bulk_import_overwrites_duplicate_when_flag_set(self):
        self.client.force_authenticate(user=self.owner)
        existing = make_question(
            self.chapter,
            prompt="Overwrite me",
            choices=["A", "B", "C", "D"],
            correct_index=0,
            difficulty=Difficulty.EASY,
        )

        payload = {
            "overwrite_existing": True,
            "questions": [
                {
                    "prompt": "Overwrite me",
                    "choices": ["1", "2", "3", "4"],
                    "correct_index": 2,
                    "difficulty": "HARD",
                }
            ],
        }
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["summary"]["updated"], 1)
        existing.refresh_from_db()
        self.assertEqual(existing.correct_index, 2)
        self.assertEqual(existing.difficulty, Difficulty.HARD)

    def test_bulk_import_forbidden_for_non_staff(self):
        self.client.force_authenticate(user=self.student)
        payload = {
            "questions": [
                {
                    "prompt": "What is 2+2?",
                    "choices": ["1", "2", "3", "4"],
                    "correct_index": 3,
                    "difficulty": "EASY",
                }
            ]
        }
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class QuizListCreateViewTests(TestCase):
    """Test quiz list and create (staff only)."""

    def setUp(self):
        self.client = APIClient()
        self.course, self.chapter = make_course_and_chapter()
        self.owner = self.course.owner
        self.student = User.objects.create_user(
            email="student@example.com", password="pass123"
        )
        CourseMembership.objects.create(
            course=self.course, user=self.owner, role=CourseRole.OWNER
        )
        CourseMembership.objects.create(
            course=self.course, user=self.student, role=CourseRole.STUDENT
        )

    def test_list_quizzes_as_staff_returns_200(self):
        """Test that course staff can list quizzes for a chapter."""
        self.client.force_authenticate(user=self.owner)
        url = reverse(
            "quiz-list-create",
            kwargs={"chapter_id": self.chapter.id},
        )
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_list_quizzes_as_non_staff_returns_403(self):
        """Test that non-staff cannot list quizzes."""
        self.client.force_authenticate(user=self.student)
        url = reverse(
            "quiz-list-create",
            kwargs={"chapter_id": self.chapter.id},
        )
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_quiz_as_staff_returns_201(self):
        """Test that course staff can create a quiz."""
        self.client.force_authenticate(user=self.owner)
        url = reverse(
            "quiz-list-create",
            kwargs={"chapter_id": self.chapter.id},
        )
        res = self.client.post(
            url,
            data={
                "title": "New Quiz",
                "num_questions": 5,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["title"], "New Quiz")
        self.assertEqual(res.data["chapter"], self.chapter.id)
        self.assertTrue(Quiz.objects.filter(title="New Quiz").exists())

    def test_create_quiz_as_non_staff_returns_403(self):
        """Test that non-staff cannot create a quiz."""
        self.client.force_authenticate(user=self.student)
        url = reverse(
            "quiz-list-create",
            kwargs={"chapter_id": self.chapter.id},
        )
        res = self.client.post(
            url,
            data={"title": "New Quiz", "num_questions": 5},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class QuizDetailViewTests(TestCase):
    """Test quiz retrieve, update, destroy (staff full access; member read published)."""

    def setUp(self):
        self.client = APIClient()
        self.course, self.chapter = make_course_and_chapter()
        self.quiz = make_quiz(
            self.chapter,
            title="Test Quiz",
            is_published=True,
        )
        self.owner = self.course.owner
        self.student = User.objects.create_user(
            email="student@example.com", password="pass123"
        )
        CourseMembership.objects.create(
            course=self.course, user=self.owner, role=CourseRole.OWNER
        )
        CourseMembership.objects.create(
            course=self.course, user=self.student, role=CourseRole.STUDENT
        )

    def test_retrieve_quiz_as_staff_returns_200(self):
        """Test that staff can retrieve a quiz."""
        self.client.force_authenticate(user=self.owner)
        url = reverse("quiz-detail", kwargs={"pk": self.quiz.pk})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["title"], "Test Quiz")

    def test_retrieve_published_quiz_as_member_returns_200(self):
        """Test that course member can retrieve one published quiz (GET /api/quizzes/<id>/)."""
        self.client.force_authenticate(user=self.student)
        url = reverse("quiz-detail", kwargs={"pk": self.quiz.pk})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_retrieve_unpublished_quiz_as_member_returns_403(self):
        """Test that course member cannot retrieve an unpublished quiz."""
        self.quiz.is_published = False
        self.quiz.save(update_fields=["is_published"])
        self.client.force_authenticate(user=self.student)
        url = reverse("quiz-detail", kwargs={"pk": self.quiz.pk})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_quiz_as_staff_returns_200(self):
        """Test that staff can update a quiz."""
        self.client.force_authenticate(user=self.owner)
        url = reverse("quiz-detail", kwargs={"pk": self.quiz.pk})
        res = self.client.patch(
            url,
            data={"title": "Updated Quiz"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.quiz.refresh_from_db()
        self.assertEqual(self.quiz.title, "Updated Quiz")

    def test_update_quiz_as_non_staff_returns_403(self):
        """Test that non-staff cannot update a quiz."""
        self.client.force_authenticate(user=self.student)
        url = reverse("quiz-detail", kwargs={"pk": self.quiz.pk})
        res = self.client.patch(
            url,
            data={"title": "Hacked"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_destroy_quiz_as_staff_returns_204(self):
        """Test that staff can delete a quiz."""
        self.client.force_authenticate(user=self.owner)
        url = reverse("quiz-detail", kwargs={"pk": self.quiz.pk})
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Quiz.objects.filter(pk=self.quiz.pk).exists())

    def test_destroy_quiz_as_non_staff_returns_403(self):
        self.client.force_authenticate(user=self.student)
        url = reverse("quiz-detail", kwargs={"pk": self.quiz.pk})
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class StudentQuizListViewTests(TestCase):
    """Test student quiz list (published quizzes for course members)."""

    def setUp(self):
        self.client = APIClient()
        self.course, self.chapter = make_course_and_chapter()
        self.quiz = make_quiz(
            self.chapter,
            title="Published Quiz",
            is_published=True,
        )
        self.student = User.objects.create_user(
            email="student@example.com", password="pass123"
        )
        CourseMembership.objects.create(
            course=self.course, user=self.student, role=CourseRole.STUDENT
        )

    def test_list_quizzes_as_member_returns_published_only(self):
        """Test that member sees published quizzes via GET /api/quizzes/ (student list)."""
        self.client.force_authenticate(user=self.student)
        url = reverse("quiz-list")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Response may be paginated (dict with "results") or a list
        results = res.data.get("results", res.data) if isinstance(res.data, dict) else res.data
        self.assertGreaterEqual(len(results), 1)
        titles = [q["title"] for q in results]
        self.assertIn("Published Quiz", titles)

    def test_list_quizzes_includes_nested_chapter_info(self):
        """Test that each quiz in the list includes chapter and attempt_status/attempt_id for routing."""
        self.client.force_authenticate(user=self.student)
        url = reverse("quiz-list")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get("results", res.data) if isinstance(res.data, dict) else res.data
        self.assertGreaterEqual(len(results), 1)
        quiz = next(q for q in results if q["title"] == "Published Quiz")
        self.assertIn("chapter", quiz)
        chapter = quiz["chapter"]
        self.assertIsInstance(chapter, dict)
        self.assertEqual(chapter["id"], self.chapter.id)
        self.assertEqual(chapter["title"], self.chapter.title)
        self.assertEqual(chapter["order_index"], self.chapter.order_index)
        self.assertEqual(str(chapter["course"]), str(self.course.id))
        self.assertIn("attempt_status", quiz)
        self.assertIn("attempt_id", quiz)
        # No attempt yet for this student, so both should be null
        self.assertIsNone(quiz["attempt_status"])
        self.assertIsNone(quiz["attempt_id"])

    def test_list_quizzes_includes_attempt_status_and_id_when_student_has_attempt(self):
        """Test that attempt_status and attempt_id are set when student has an in-progress or completed attempt."""
        from apps.quizzes.models import AttemptStatus

        attempt = make_attempt(self.student, self.quiz)
        self.client.force_authenticate(user=self.student)
        url = reverse("quiz-list")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get("results", res.data) if isinstance(res.data, dict) else res.data
        quiz = next(q for q in results if q["title"] == "Published Quiz")
        self.assertEqual(quiz["attempt_status"], AttemptStatus.IN_PROGRESS)
        self.assertEqual(quiz["attempt_id"], attempt.pk)

    def test_list_quizzes_requires_authentication(self):
        """Test that unauthenticated user cannot list quizzes."""
        url = reverse("quiz-list")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_quizzes_filter_by_course_id(self):
        owner2 = User.objects.create_user(
            email="owner2-course-filter@example.com",
            password="pass123",
            first_name="Owner2",
        )
        other_course = Course.objects.create(
            title="Other",
            owner=owner2,
            slug="other-course-quiz-list",
        )
        other_chapter = Chapter.objects.create(course=other_course, title="OC")
        CourseMembership.objects.create(
            course=other_course, user=self.student, role=CourseRole.STUDENT
        )
        make_quiz(other_chapter, title="Other Quiz", is_published=True)
        self.client.force_authenticate(user=self.student)
        url = reverse("quiz-list")
        res = self.client.get(url, {"course": str(self.course.id)})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get("results", res.data) if isinstance(res.data, dict) else res.data
        titles = {q["title"] for q in results}
        self.assertIn("Published Quiz", titles)
        self.assertNotIn("Other Quiz", titles)

    def test_list_quizzes_filter_by_chapter_id(self):
        ch2 = Chapter.objects.create(course=self.course, title="Ch2", order_index=2)
        make_quiz(ch2, title="Chapter2 Quiz", is_published=True)
        self.client.force_authenticate(user=self.student)
        url = reverse("quiz-list")
        res = self.client.get(url, {"chapter": str(self.chapter.id)})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get("results", res.data) if isinstance(res.data, dict) else res.data
        titles = {q["title"] for q in results}
        self.assertIn("Published Quiz", titles)
        self.assertNotIn("Chapter2 Quiz", titles)


class AttemptDetailViewTests(TestCase):
    """Test attempt detail (owner only)."""

    def setUp(self):
        self.client = APIClient()
        self.course, self.chapter = make_course_and_chapter()
        self.quiz = make_quiz(self.chapter, is_published=True)
        self.student = User.objects.create_user(
            email="student@example.com", password="pass123"
        )
        self.other = User.objects.create_user(
            email="other@example.com", password="pass123"
        )
        CourseMembership.objects.create(
            course=self.course, user=self.student, role=CourseRole.STUDENT
        )
        self.attempt = make_attempt(self.student, self.quiz)

    def test_retrieve_own_attempt_returns_200(self):
        """Test that student can retrieve their own attempt."""
        self.client.force_authenticate(user=self.student)
        url = reverse("attempt-detail", kwargs={"pk": self.attempt.pk})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["id"], self.attempt.pk)
        self.assertIn("current_question", res.data)

    def test_retrieve_own_attempt_includes_current_question_when_set(self):
        """Test that resume payload includes current_question (id, prompt, choices, difficulty) when in progress."""
        question = make_question(self.chapter, prompt="Resume this question", correct_index=0)
        self.attempt.current_question = question
        self.attempt.save(update_fields=["current_question"])
        self.client.force_authenticate(user=self.student)
        url = reverse("attempt-detail", kwargs={"pk": self.attempt.pk})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(res.data["current_question"])
        self.assertEqual(res.data["current_question"]["id"], question.id)
        self.assertEqual(res.data["current_question"]["prompt"], "Resume this question")
        self.assertIn("choices", res.data["current_question"])
        self.assertIn("difficulty", res.data["current_question"])
        self.assertNotIn("correct_index", res.data["current_question"])

    def test_retrieve_other_attempt_returns_403(self):
        """Test that student cannot retrieve another user's attempt."""
        self.client.force_authenticate(user=self.other)
        url = reverse("attempt-detail", kwargs={"pk": self.attempt.pk})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_retrieve_attempt_requires_authentication(self):
        """Test that unauthenticated user cannot retrieve an attempt."""
        url = reverse("attempt-detail", kwargs={"pk": self.attempt.pk})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class QuizAttemptFlowTests(TestCase):
    """Test student quiz attempt flow (start attempt and submit answer)."""

    def setUp(self):
        self.client = APIClient()
        self.course, self.chapter = make_course_and_chapter()
        self.student = User.objects.create_user(
            email="student@example.com", password="pass123"
        )
        CourseMembership.objects.create(
            course=self.course, user=self.student, role=CourseRole.STUDENT
        )
        self.quiz = make_quiz(
            self.chapter, title="Quiz", num_questions=1, is_published=True
        )
        make_question(
            self.chapter,
            prompt="Q1",
            choices=["A", "B", "C", "D"],
            correct_index=2,
            difficulty=Difficulty.MEDIUM,
        )
        self.client.force_authenticate(user=self.student)

    def test_start_attempt_returns_question_without_answer(self):
        """Test that starting an attempt returns a question without exposing correct_index."""
        url = reverse("quiz-attempt-start", kwargs={"pk": self.quiz.id})
        res = self.client.post(url, data={})
        self.assertEqual(res.status_code, 201)
        self.assertIn("question", res.data)
        self.assertNotIn("correct_index", res.data["question"])

    def test_start_attempt_returns_existing_in_progress_attempt_id_on_conflict(self):
        """Test that when an in-progress attempt exists, start returns 409 with attempt_id."""
        from apps.quizzes.models import AttemptStatus

        existing_attempt = make_attempt(self.student, self.quiz)
        existing_attempt.status = AttemptStatus.IN_PROGRESS
        existing_attempt.save(update_fields=["status"])

        url = reverse("quiz-attempt-start", kwargs={"pk": self.quiz.id})
        res = self.client.post(url, data={})

        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(res.data["detail"], "Attempt already in progress.")
        self.assertEqual(res.data["attempt_id"], existing_attempt.pk)

    def test_submit_answer_returns_next_question_when_more_questions(self):
        """Test that submitting an answer returns next_question when quiz has more questions."""
        quiz_two = make_quiz(
            self.chapter, title="Two Q Quiz", num_questions=2, is_published=True
        )
        make_question(
            self.chapter,
            prompt="First",
            choices=["A", "B", "C", "D"],
            correct_index=0,
            difficulty=Difficulty.MEDIUM,
        )
        make_question(
            self.chapter,
            prompt="Second",
            choices=["A", "B", "C", "D"],
            correct_index=1,
            difficulty=Difficulty.MEDIUM,
        )
        start_url = reverse("quiz-attempt-start", kwargs={"pk": quiz_two.id})
        start_res = self.client.post(start_url, data={})
        self.assertEqual(start_res.status_code, 201)
        attempt_id = start_res.data["attempt_id"]
        first_question_id = start_res.data["question"]["id"]

        answer_url = reverse("attempt-answer", kwargs={"pk": attempt_id})
        res = self.client.post(
            answer_url,
            data={"question_id": first_question_id, "selected_index": 0},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("next_question", res.data)
        self.assertNotEqual(res.data["next_question"]["id"], first_question_id)
        self.assertNotEqual(res.data.get("status"), "COMPLETED")

    def test_submit_answer_completes_attempt(self):
        """Test that submitting the final answer returns 200 and COMPLETED status."""
        start_url = reverse("quiz-attempt-start", kwargs={"pk": self.quiz.id})
        start_res = self.client.post(start_url, data={})
        attempt_id = start_res.data["attempt_id"]
        question_id = start_res.data["question"]["id"]

        answer_url = reverse("attempt-answer", kwargs={"pk": attempt_id})
        res = self.client.post(
            answer_url,
            data={"question_id": question_id, "selected_index": 2},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], "COMPLETED")

    def test_start_attempt_on_unpublished_quiz_returns_404(self):
        """Test that starting an attempt on an unpublished quiz returns 404."""
        self.quiz.is_published = False
        self.quiz.save(update_fields=["is_published"])
        url = reverse("quiz-attempt-start", kwargs={"pk": self.quiz.id})
        res = self.client.post(url, data={})
        self.assertEqual(res.status_code, 404)

    def test_submit_duplicate_answer_returns_409(self):
        """Test that submitting an answer for an already-answered question returns 409."""
        quiz_two = make_quiz(
            self.chapter, title="Two Q Quiz", num_questions=2, is_published=True
        )
        make_question(
            self.chapter,
            prompt="Q1",
            choices=["A", "B", "C", "D"],
            correct_index=0,
            difficulty=Difficulty.MEDIUM,
        )
        make_question(
            self.chapter,
            prompt="Q2",
            choices=["A", "B", "C", "D"],
            correct_index=0,
            difficulty=Difficulty.MEDIUM,
        )
        start_url = reverse("quiz-attempt-start", kwargs={"pk": quiz_two.id})
        start_res = self.client.post(start_url, data={})
        attempt_id = start_res.data["attempt_id"]
        question_id = start_res.data["question"]["id"]
        answer_url = reverse("attempt-answer", kwargs={"pk": attempt_id})
        payload = {"question_id": question_id, "selected_index": 0}
        first = self.client.post(answer_url, data=payload, format="json")
        self.assertEqual(first.status_code, 200)
        self.assertIn("next_question", first.data)
        second = self.client.post(answer_url, data=payload, format="json")
        self.assertEqual(second.status_code, 409)

    def test_submit_non_current_question_returns_409(self):
        """Test that submitting a non-current question returns 409."""
        quiz_two = make_quiz(
            self.chapter, title="Two Q Quiz", num_questions=2, is_published=True
        )
        q1 = make_question(
            self.chapter,
            prompt="Q1",
            choices=["A", "B", "C", "D"],
            correct_index=0,
            difficulty=Difficulty.MEDIUM,
        )
        q2 = make_question(
            self.chapter,
            prompt="Q2",
            choices=["A", "B", "C", "D"],
            correct_index=1,
            difficulty=Difficulty.MEDIUM,
        )
        start_url = reverse("quiz-attempt-start", kwargs={"pk": quiz_two.id})
        start_res = self.client.post(start_url, data={})
        attempt_id = start_res.data["attempt_id"]
        current_id = start_res.data["question"]["id"]
        other_id = q1.id if q1.id != current_id else q2.id
        answer_url = reverse("attempt-answer", kwargs={"pk": attempt_id})
        res = self.client.post(
            answer_url,
            data={"question_id": other_id, "selected_index": 1},
            format="json",
        )
        self.assertEqual(res.status_code, 409)

    def test_start_attempt_requires_authentication(self):
        """Test that unauthenticated user cannot start an attempt."""
        client = APIClient()
        url = reverse("quiz-attempt-start", kwargs={"pk": self.quiz.id})
        res = client.post(url, data={})
        self.assertEqual(res.status_code, 401)

    def test_submit_answer_requires_authentication(self):
        """Test that unauthenticated user cannot submit an answer."""
        start_url = reverse("quiz-attempt-start", kwargs={"pk": self.quiz.id})
        start_res = self.client.post(start_url, data={})
        attempt_id = start_res.data["attempt_id"]
        question_id = start_res.data["question"]["id"]
        self.client.logout()
        answer_url = reverse("attempt-answer", kwargs={"pk": attempt_id})
        res = self.client.post(
            answer_url,
            data={"question_id": question_id, "selected_index": 2},
            format="json",
        )
        self.assertEqual(res.status_code, 401)

    def test_start_attempt_integrity_error_returns_409(self):
        """Race fallback: create() raises IntegrityError -> same body as in-progress conflict."""
        url = reverse("quiz-attempt-start", kwargs={"pk": self.quiz.id})
        with patch.object(QuizAttempt.objects, "create", side_effect=IntegrityError):
            res = self.client.post(url, data={}, format="json")
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(res.data["detail"], "Attempt already in progress.")

    def test_start_attempt_with_empty_question_bank_completes_immediately(self):
        """No questions in chapter: first_question is None; attempt completed (lines 392–407)."""
        Question.objects.filter(chapter=self.chapter).delete()
        empty_quiz = make_quiz(self.chapter, title="No questions", num_questions=3, is_published=True)
        url = reverse("quiz-attempt-start", kwargs={"pk": empty_quiz.id})
        res = self.client.post(url, data={}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "COMPLETED")
        self.assertEqual(res.data["score_percent"], 0.0)

    @override_settings(ADAPTIVE_ENGINE_V2=True)
    def test_submit_answer_includes_adaptive_fields_when_v2_enabled(self):
        """Payload merges theta / topic telemetry when apply_answer_updates returns them."""
        Question.objects.filter(chapter=self.chapter).delete()
        topic = Topic.objects.create(course=self.course, name="TelemetryTopic")
        tagged = make_question(
            self.chapter,
            prompt="Tagged Q",
            choices=["A", "B", "C", "D"],
            correct_index=0,
            difficulty=Difficulty.MEDIUM,
        )
        tagged.topics.add(topic)
        quiz_one = make_quiz(self.chapter, title="Tagged quiz", num_questions=1, is_published=True)
        start_url = reverse("quiz-attempt-start", kwargs={"pk": quiz_one.id})
        start_res = self.client.post(start_url, data={}, format="json")
        self.assertEqual(start_res.status_code, 201)
        attempt_id = start_res.data["attempt_id"]
        qid = start_res.data["question"]["id"]
        answer_url = reverse("attempt-answer", kwargs={"pk": attempt_id})
        res = self.client.post(
            answer_url,
            data={"question_id": qid, "selected_index": 0},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("theta", res.data)
        self.assertIn("topic_mastery", res.data)
        self.assertIsNotNone(res.data["theta"])

    def test_start_attempt_non_course_member_returns_403(self):
        outsider = User.objects.create_user(
            email="outsider403@example.com", password="pass123"
        )
        self.client.force_authenticate(user=outsider)
        url = reverse("quiz-attempt-start", kwargs={"pk": self.quiz.id})
        res = self.client.post(url, data={}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_submit_answer_as_other_student_returns_403(self):
        other = User.objects.create_user(
            email="other-student-submit@example.com", password="pass123"
        )
        CourseMembership.objects.create(
            course=self.course, user=other, role=CourseRole.STUDENT
        )
        start_url = reverse("quiz-attempt-start", kwargs={"pk": self.quiz.id})
        start_res = self.client.post(start_url, data={}, format="json")
        attempt_id = start_res.data["attempt_id"]
        qid = start_res.data["question"]["id"]
        self.client.force_authenticate(user=other)
        answer_url = reverse("attempt-answer", kwargs={"pk": attempt_id})
        res = self.client.post(
            answer_url,
            data={"question_id": qid, "selected_index": 0},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
