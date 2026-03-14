from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CourseViewSet, EnrollmentViewSet, TopicViewSet

router = DefaultRouter()
router.register(r"courses", CourseViewSet, basename="course")
router.register(r"topics", TopicViewSet, basename="topic")
router.register(r"enrollment", EnrollmentViewSet, basename="enrollment")

urlpatterns = [
    path("", include(router.urls)),
]
