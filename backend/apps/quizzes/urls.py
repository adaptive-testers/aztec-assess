from django.urls import path

from .views import (
    AttemptDetailView,
    ChapterDetailView,
    ChapterListCreateView,
    QuestionDetailView,
    QuestionListCreateView,
    QuizDetailView,
    QuizListCreateView,
    StartAttemptView,
    StudentQuizListView,
    SubmitAnswerView,
)

urlpatterns = [
    # Instructor endpoints
    path("courses/<uuid:course_id>/chapters/", ChapterListCreateView.as_view(), name="chapter-list-create"),
    path("chapters/<int:pk>/", ChapterDetailView.as_view(), name="chapter-detail"),
    path("chapters/<int:chapter_id>/questions/", QuestionListCreateView.as_view(), name="question-list-create"),
    path("questions/<int:pk>/", QuestionDetailView.as_view(), name="question-detail"),
    path("chapters/<int:chapter_id>/quizzes/", QuizListCreateView.as_view(), name="quiz-list-create"),
    path("quizzes/<int:pk>/", QuizDetailView.as_view(), name="quiz-detail"),

    # Student endpoints
    path("quizzes/", StudentQuizListView.as_view(), name="quiz-list"),
    path("quizzes/<int:pk>/attempts/", StartAttemptView.as_view(), name="quiz-attempt-start"),
    path("attempts/<int:pk>/answer/", SubmitAnswerView.as_view(), name="attempt-answer"),
    path("attempts/<int:pk>/", AttemptDetailView.as_view(), name="attempt-detail"),
]
