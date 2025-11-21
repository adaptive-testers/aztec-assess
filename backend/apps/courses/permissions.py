# Custom permission helpers for course-level roles.

from typing import TYPE_CHECKING, Any, Optional, Union

from django.contrib.auth.models import AbstractBaseUser, AnonymousUser
from rest_framework.permissions import BasePermission

if TYPE_CHECKING:
    from rest_framework.request import Request
    from rest_framework.views import APIView

    from .models import Course, CourseRole

from .models import CourseMembership, CourseRole


def user_role(
    user: AbstractBaseUser | AnonymousUser | None, course: "Course"
) -> Optional["CourseRole"]:
    if not user or not user.is_authenticated:
        return None
    membership = CourseMembership.objects.filter(
        user=user,
        course=course,
    ).first()
    return membership.role if membership else None


class IsCourseStaff(BasePermission):
    # OWNER, INSTRUCTOR, or TA.
    def has_object_permission(
        self, request: "Request", view: Union["APIView", Any], obj: "Course" # noqa: ARG002
    ) -> bool:
        role = user_role(request.user, obj)
        return role in {CourseRole.OWNER, CourseRole.INSTRUCTOR, CourseRole.TA}


class IsCourseOwnerOrInstructor(BasePermission):
    def has_object_permission(
        self, request: "Request", view: Union["APIView", Any], obj: "Course" # noqa: ARG002
    ) -> bool:
        role = user_role(request.user, obj)
        return role in {CourseRole.OWNER, CourseRole.INSTRUCTOR}


class IsCourseMember(BasePermission):
    def has_object_permission(
        self, request: "Request", view: Union["APIView", Any], obj: "Course" # noqa: ARG002
    ) -> bool:
        return user_role(request.user, obj) is not None
