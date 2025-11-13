# Custom permission helpers for course-level roles.

from rest_framework.permissions import BasePermission

from .models import CourseMembership, CourseRole


def user_role(user, course):
    if not user or not user.is_authenticated:
        return None
    membership = CourseMembership.objects.filter(
        user=user,
        course=course,
    ).first()
    return membership.role if membership else None


class IsCourseStaff(BasePermission):
    # OWNER, INSTRUCTOR, or TA.
    def has_object_permission(self, request, view, obj):
        role = user_role(request.user, obj)
        return role in {CourseRole.OWNER, CourseRole.INSTRUCTOR, CourseRole.TA}


class IsCourseOwnerOrInstructor(BasePermission):
    def has_object_permission(self, request, view, obj):
        role = user_role(request.user, obj)
        return role in {CourseRole.OWNER, CourseRole.INSTRUCTOR}


class IsCourseMember(BasePermission):
    def has_object_permission(self, request, view, obj):
        return user_role(request.user, obj) is not None
