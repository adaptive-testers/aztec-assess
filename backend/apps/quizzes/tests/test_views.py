"""
Tests for quiz API views: chapters, questions, quizzes, attempts, and student flows.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.courses.models import CourseMembership, CourseRole
from apps.quizzes.models import Chapter, Difficulty, Question, Quiz
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
                "course": str(self.course.id),
                "title": "New Chapter",
                "order_index": 2,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["title"], "New Chapter")
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
                "chapter": self.chapter.id,
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

    def test_destroy_question_as_staff_soft_deletes_returns_204(self):
        """Test that staff destroy sets is_active=False."""
        self.client.force_authenticate(user=self.owner)
        url = reverse("question-detail", kwargs={"pk": self.question.pk})
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.question.refresh_from_db()
        self.assertFalse(self.question.is_active)


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
                "chapter": self.chapter.id,
                "title": "New Quiz",
                "num_questions": 5,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["title"], "New Quiz")
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
        """Test that each quiz in the list includes chapter as object (id, title, order_index, course)."""
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

    def test_list_quizzes_requires_authentication(self):
        """Test that unauthenticated user cannot list quizzes."""
        url = reverse("quiz-list")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


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
