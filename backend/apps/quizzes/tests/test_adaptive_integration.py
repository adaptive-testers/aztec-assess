"""Integration tests for BKT/IRT updates and adaptive selection (flagged)."""

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from apps.courses.models import Topic
from apps.quizzes.models import Difficulty, StudentAbility, StudentTopicMastery
from apps.quizzes.services.attempts import submit_answer
from apps.quizzes.services.selection import select_next_question
from apps.quizzes.tests.test_utils import (
    make_attempt,
    make_course_and_chapter,
    make_question,
    make_quiz,
)

User = get_user_model()


@override_settings(
    ADAPTIVE_ENGINE_V2=True,
    ADAPTIVE_ENGINE_V2_SELECTION=False,
)
class AdaptiveSubmitUpdatesTests(TestCase):
    def setUp(self):
        self.course, self.chapter = make_course_and_chapter()
        self.student = User.objects.create_user(email="s@example.com", password="p")
        self.topic = Topic.objects.create(course=self.course, name="Algebra")
        self.q1 = make_question(self.chapter, prompt="Q1", difficulty=Difficulty.MEDIUM)
        self.q1.topics.add(self.topic)
        self.q2 = make_question(self.chapter, prompt="Q2", difficulty=Difficulty.MEDIUM)
        self.q2.topics.add(self.topic)
        self.quiz = make_quiz(self.chapter, num_questions=2)
        self.attempt = make_attempt(self.student, self.quiz)
        self.attempt.current_question = self.q1
        self.attempt.save(update_fields=["current_question"])

    def test_submit_updates_theta_and_mastery(self):
        result = submit_answer(self.attempt, self.q1.id, self.q1.correct_index)
        self.assertFalse(result["completed"])
        self.assertIsNotNone(result.get("theta"))
        self.assertIsNotNone(result.get("topic_mastery"))
        ability = StudentAbility.objects.get(student=self.student)
        self.assertIsNotNone(ability.theta)
        mastery = StudentTopicMastery.objects.get(student=self.student, topic=self.topic)
        self.assertGreaterEqual(mastery.p_knowledge, 0.0)
        self.assertLessEqual(mastery.p_knowledge, 1.0)


@override_settings(
    ADAPTIVE_ENGINE_V2=True,
    ADAPTIVE_ENGINE_V2_SELECTION=True,
)
class AdaptiveSelectionTests(TestCase):
    def setUp(self):
        self.course, self.chapter = make_course_and_chapter()
        self.student = User.objects.create_user(email="s2@example.com", password="p")
        self.topic = Topic.objects.create(course=self.course, name="T1")
        self.q1 = make_question(self.chapter, prompt="A", difficulty=Difficulty.EASY)
        self.q1.topics.add(self.topic)
        self.q2 = make_question(self.chapter, prompt="B", difficulty=Difficulty.HARD)
        self.q2.topics.add(self.topic)
        self.quiz = make_quiz(self.chapter, num_questions=5, title="Adaptive")
        self.quiz.adaptive_enabled = True
        self.quiz.save(update_fields=["adaptive_enabled"])
        self.attempt = make_attempt(self.student, self.quiz)

    def test_adaptive_selector_returns_question_with_topics(self):
        nq = select_next_question(self.attempt, [])
        self.assertIsNotNone(nq)
        self.assertGreater(nq.topics.count(), 0)
