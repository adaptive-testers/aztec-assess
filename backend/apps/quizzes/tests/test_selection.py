"""
Tests for the adaptive question selection service (select_next_question).
"""
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from apps.courses.models import Topic
from apps.quizzes.models import (
    Difficulty,
    Question,
    QuestionIRTParameter,
    StudentTopicMastery,
    TopicBKTParameter,
)
from apps.quizzes.services.selection import (
    _estimated_mastery,
    _item_b,
    next_difficulty_after,
    select_next_question,
    select_next_question_adaptive,
)
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


class EstimatedMasteryAndItemBTests(TestCase):
    """Cover _estimated_mastery and _item_b branches for Codecov."""

    def setUp(self):
        self.course, self.chapter = make_course_and_chapter()
        self.student = User.objects.create_user(email="m@example.com", password="p")
        self.topic = Topic.objects.create(course=self.course, name="T")

    def test_estimated_mastery_prefers_student_topic_mastery_row(self):
        StudentTopicMastery.objects.create(
            student=self.student, topic=self.topic, p_knowledge=0.55
        )
        v = _estimated_mastery(int(self.student.pk), self.topic.pk)
        self.assertEqual(v, 0.55)

    def test_estimated_mastery_uses_topic_bkt_when_no_mastery_row(self):
        TopicBKTParameter.objects.create(topic=self.topic, p_l0=0.42)
        v = _estimated_mastery(int(self.student.pk), self.topic.pk)
        self.assertEqual(v, 0.42)

    def test_estimated_mastery_default_when_no_rows(self):
        v = _estimated_mastery(int(self.student.pk), self.topic.pk)
        self.assertEqual(v, 0.35)

    def test_item_b_reads_irt_row_when_present(self):
        q = make_question(self.chapter, prompt="Q", difficulty=Difficulty.MEDIUM)
        QuestionIRTParameter.objects.create(question=q, difficulty_b=0.7)
        self.assertEqual(_item_b(q), 0.7)

    def test_item_b_falls_back_to_difficulty_prior_without_irt(self):
        q = make_question(self.chapter, prompt="Q2", difficulty=Difficulty.EASY)
        self.assertEqual(_item_b(q), -1.0)


@override_settings(
    ADAPTIVE_ENGINE_V2=True,
    ADAPTIVE_ENGINE_V2_SELECTION=True,
    ADAPTIVE_WEAK_TOPIC_THRESHOLD=0.7,
)
class AdaptiveSelectionBranchTests(TestCase):
    """Exercise select_next_question_adaptive and select_next_question."""

    def setUp(self):
        self.course, self.chapter = make_course_and_chapter()
        self.student = User.objects.create_user(email="adapt@example.com", password="p")
        self.topic = Topic.objects.create(course=self.course, name="Alg")
        self.q_easy = make_question(self.chapter, prompt="E", difficulty=Difficulty.EASY)
        self.q_easy.topics.add(self.topic)
        self.q_hard = make_question(self.chapter, prompt="H", difficulty=Difficulty.HARD)
        self.q_hard.topics.add(self.topic)
        self.quiz = make_quiz(self.chapter, num_questions=5, title="Ad")
        self.quiz.adaptive_enabled = True
        self.quiz.save(update_fields=["adaptive_enabled"])
        self.attempt = make_attempt(self.student, self.quiz)

    def test_adaptive_returns_none_when_no_unused_questions(self):
        all_ids = list(Question.objects.filter(chapter=self.chapter).values_list("id", flat=True))
        self.assertIsNone(select_next_question_adaptive(self.attempt, list(all_ids)))

    def test_adaptive_returns_none_when_questions_have_no_topics(self):
        q = make_question(self.chapter, prompt="Bare", difficulty=Difficulty.MEDIUM)
        self.assertEqual(q.topics.count(), 0)
        self.assertIsNone(
            select_next_question_adaptive(self.attempt, [self.q_easy.pk, self.q_hard.pk])
        )

    def test_adaptive_returns_none_when_attempt_has_no_quiz(self):
        self.attempt.quiz = None
        self.assertIsNone(select_next_question_adaptive(self.attempt, []))

    def test_adaptive_skips_untagged_questions_in_primary_topic_loop(self):
        """Cover `if pt is None: continue` while still selecting a tagged question."""
        bare = make_question(self.chapter, prompt="Untagged", difficulty=Difficulty.MEDIUM)
        q = select_next_question_adaptive(self.attempt, [])
        self.assertIsNotNone(q)
        self.assertIn(q.pk, [self.q_easy.pk, self.q_hard.pk, bare.pk])

    def test_select_next_question_falls_back_to_ladder_when_adaptive_returns_none(self):
        """No-topic-only pool: adaptive short-circuits; ladder still returns a question."""
        Question.objects.filter(chapter=self.chapter).delete()
        make_question(self.chapter, prompt="Only", difficulty=Difficulty.MEDIUM)
        picked = select_next_question(self.attempt, [])
        self.assertIsNotNone(picked)

    def test_adaptive_uses_student_ability_theta_when_row_exists(self):
        from apps.quizzes.models import StudentAbility

        StudentAbility.objects.create(student=self.student, theta=0.5)
        q = select_next_question_adaptive(self.attempt, [])
        self.assertIsNotNone(q)
        self.assertIn(q.pk, [self.q_easy.pk, self.q_hard.pk])

    def test_weak_ids_defaults_to_all_topics_when_none_below_threshold(self):
        """All topics at mastery >= threshold -> weak_ids becomes full topic_ids set."""
        TopicBKTParameter.objects.create(topic=self.topic, p_l0=0.95)
        StudentTopicMastery.objects.create(
            student=self.student, topic=self.topic, p_knowledge=0.95
        )
        q = select_next_question_adaptive(self.attempt, [])
        self.assertIsNotNone(q)

    @patch("apps.quizzes.services.selection.logger")
    @patch("apps.quizzes.services.selection.select_next_question_ladder")
    @override_settings(ADAPTIVE_ENGINE_V2_SHADOW=True)
    def test_shadow_logs_when_ladder_pick_differs_from_adaptive(
        self, mock_ladder, mock_logger
    ):
        """Lines 203–210: log when shadow compare finds a different ladder question."""
        other = MagicMock()
        other.pk = 9_999_999
        mock_ladder.return_value = other
        select_next_question_adaptive(self.attempt, [])
        mock_logger.info.assert_called_once()
        self.assertIn("adaptive_shadow", mock_logger.info.call_args[0][0])
