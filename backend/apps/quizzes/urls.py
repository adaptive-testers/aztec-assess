from rest_framework.routers import DefaultRouter
from .views import ChapterViewSet, QuestionViewSet, AttemptViewSet

router = DefaultRouter()
router.register(r"chapters", ChapterViewSet, basename="chapter")
router.register(r"questions", QuestionViewSet, basename="question")
router.register(r"attempts", AttemptViewSet, basename="attempt")

urlpatterns = router.urls