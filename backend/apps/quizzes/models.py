from django.conf import settings
from django.db import models
from django.db.models import Q


class Chapter(models.Model):
    course = models.ForeignKey("courses.Course", on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    order_index = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return str(self.title)


class Difficulty(models.TextChoices):
    EASY = "EASY", "Easy"
    MEDIUM = "MEDIUM", "Medium"
    HARD = "HARD", "Hard"


class Question(models.Model):
    chapter = models.ForeignKey(Chapter, related_name="questions", on_delete=models.CASCADE)
    prompt = models.TextField()
    choices = models.JSONField(default=list)  # expects list of strings (4)
    correct_index = models.IntegerField()  # 0..3
    difficulty = models.CharField(max_length=6, choices=Difficulty.choices, default=Difficulty.MEDIUM)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["chapter", "difficulty", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"Q{self.pk} ({self.difficulty})"


class SelectionMode(models.TextChoices):
    BANK = "BANK", "Bank"
    FIXED = "FIXED", "Fixed"


class Quiz(models.Model):
    chapter = models.ForeignKey(Chapter, related_name="quizzes", on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    adaptive_enabled = models.BooleanField(default=True)
    selection_mode = models.CharField(
        max_length=5,
        choices=SelectionMode.choices,
        default=SelectionMode.BANK,
    )
    num_questions = models.PositiveSmallIntegerField(default=10)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return str(self.title)


class AttemptStatus(models.TextChoices):
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    COMPLETED = "COMPLETED", "Completed"


class QuizAttempt(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    quiz = models.ForeignKey(Quiz, related_name="attempts", on_delete=models.CASCADE)
    current_question = models.ForeignKey(
        Question,
        related_name="current_attempts",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=12, choices=AttemptStatus.choices, default=AttemptStatus.IN_PROGRESS)
    current_difficulty = models.CharField(max_length=6, choices=Difficulty.choices, default=Difficulty.MEDIUM)
    num_answered = models.IntegerField(default=0)
    num_correct = models.IntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["student", "quiz"],
                condition=Q(status=AttemptStatus.IN_PROGRESS),
                name="unique_in_progress_attempt_per_student_quiz",
            ),
        ]

    def is_finished(self) -> bool:
        return bool(self.status == AttemptStatus.COMPLETED)

    def calculate_score(self) -> dict[str, int]:
        return {"num_correct": self.num_correct, "num_answered": self.num_answered}

    def __str__(self) -> str:
        return f"Attempt {self.pk} by {self.student}"


class AttemptAnswer(models.Model):
    attempt = models.ForeignKey(QuizAttempt, related_name="answers", on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.PROTECT)
    selected_index = models.IntegerField(null=True, blank=True)
    is_correct = models.BooleanField(default=False)
    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("attempt", "question")
