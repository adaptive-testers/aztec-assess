from django.urls import path

from .views import AiGenerateQuestionView, CourseMaterialListCreateView

urlpatterns = [
    path(
        "courses/<uuid:course_id>/materials/",
        CourseMaterialListCreateView.as_view(),
        name="course-material-list-create",
    ),
    path(
        "chapters/<int:chapter_id>/ai-generate-question/",
        AiGenerateQuestionView.as_view(),
        name="ai-generate-question",
    ),
]
