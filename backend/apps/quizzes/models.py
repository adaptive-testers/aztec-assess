from django.conf import settings
from django.db import models

class Chapter(models.Model):
    course = models.ForeignKey("courses.Course", null=True, blank=True, on_delete=models.SET_NULL)
    title = models.CharField(max_length=255)
    order_index = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class Question(models.Model):
    DIFFICULTY_CHOICES = [
        ("EASY", "Easy"),
        ("MEDIUM", "Medium"),
        ("HARD", "Hard"),
    ]
    chapter = models.ForeignKey(Chapter, related_name="questions", on_delete=models.CASCADE)
    prompt = models.TextField()
    choices = models.JSONField(default=list)  # expects list of strings (4)
    correct_choice = models.IntegerField()  # 0..3
    difficulty = models.CharField(max_length=6, choices=DIFFICULTY_CHOICES, default="MEDIUM")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["chapter", "difficulty"]),
        ]

    def __str__(self):
        return f"Q{self.id} ({self.difficulty})"

class QuizAttempt(models.Model):
    MODE_CHOICES = [("PRACTICE", "Practice"), ("QUIZ", "Quiz")]
    STATUS_CHOICES = [("IN_PROGRESS", "In Progress"), ("COMPLETED", "Completed")]

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE)
    mode = models.CharField(max_length=10, choices=MODE_CHOICES, default="QUIZ")
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default="IN_PROGRESS")
    current_difficulty = models.CharField(max_length=6, choices=Question.DIFFICULTY_CHOICES, default="MEDIUM")
    num_answered = models.IntegerField(default=0)
    num_correct = models.IntegerField(default=0)

    def is_finished(self):
        return self.status == "COMPLETED"

    def calculate_score(self):
        return {"num_correct": self.num_correct, "num_answered": self.num_answered}

    def __str__(self):
        return f"Attempt {self.id} by {self.student}"

class AttemptAnswer(models.Model):
    attempt = models.ForeignKey(QuizAttempt, related_name="answers", on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.PROTECT)
    selected_choice = models.IntegerField(null=True, blank=True)
    is_correct = models.BooleanField(default=False)
    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("attempt", "question")
