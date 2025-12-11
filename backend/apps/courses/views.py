# ViewSets + actions for Courses and Enrollment.

from typing import Any, cast

from django.contrib.auth import get_user_model
from django.db.models import Count, QuerySet
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import BaseSerializer

from .models import Course, CourseMembership, CourseRole
from .permissions import (
    IsCourseMember,
    IsCourseOwnerOrInstructor,
)
from .serializers import (
    CourseCreateSerializer,
    CourseMembershipSerializer,
    CourseSerializer,
    JoinCourseSerializer,
)
from .utils import generate_join_code

User = get_user_model()


class CourseViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for courses + custom actions for lifecycle and membership.

    Endpoints (under /api/courses/):
    - list/create/retrieve/update/destroy
    - POST {id}/activate/
    - POST {id}/archive/
    - POST {id}/rotate-join-code/
    - POST {id}/join-code/enable/
    - POST {id}/join-code/disable/
    - GET  {id}/members/
    - POST {id}/members/add/
    - POST {id}/members/remove/
    """

    # Baseline permission; we override for specific actions in get_permissions.
    permission_classes = [IsAuthenticated]

    def get_queryset(self) -> QuerySet[Course]:
        user = self.request.user
        qs = Course.objects.all().annotate(member_count=Count("memberships")).order_by(
            "created_at"
        )

        action = getattr(self, "action", None)
        if action == "list":
            qs = qs.filter(memberships__user=user).distinct()
            status_param = self.request.query_params.get("status")
            if status_param:
                qs = qs.filter(status=status_param)
            else:
                qs = qs.exclude(status=Course.CourseStatus.ARCHIVED)
                # Exclude DRAFT courses for non-staff members (students/TA can't see drafts)
                from .models import CourseMembership, CourseRole

                # Get all memberships for this user to check roles efficiently
                user_memberships = CourseMembership.objects.filter(user=user).select_related('course')
                draft_course_ids_to_exclude = []

                for membership in user_memberships:
                    if membership.course.status == Course.CourseStatus.DRAFT and membership.role not in {CourseRole.OWNER, CourseRole.INSTRUCTOR}:
                        draft_course_ids_to_exclude.append(membership.course.id)

                if draft_course_ids_to_exclude:
                    qs = qs.exclude(id__in=draft_course_ids_to_exclude)
            return qs

        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        return qs

    def get_serializer_class(self) -> type[BaseSerializer]:
        # Separate serializer for create vs list/detail.
        if self.action == "create":
            return CourseCreateSerializer
        return CourseSerializer

    def get_permissions(self) -> list[BasePermission]:
        # We override this to attach stricter perms on mutating actions.
        if self.action in {"list", "retrieve", "create"}:
            return [IsAuthenticated()]
        if self.action in {"update", "partial_update", "destroy"}:
            return [IsAuthenticated(), IsCourseOwnerOrInstructor()]
        perms = super().get_permissions()
        return [cast("BasePermission", perm) for perm in perms]

    def retrieve(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        course = self.get_object()
        # Must be a member to see course detail
        self.check_object_permissions(request, course)
        if not IsCourseMember().has_object_permission(request, self, course):
            return Response(
                {"detail": "Not a member."},
                status=status.HTTP_403_FORBIDDEN,
            )
        # Block non-staff from accessing DRAFT courses
        if course.status == Course.CourseStatus.DRAFT:
            from .models import CourseRole
            from .permissions import user_role
            role = user_role(request.user, course)
            if role not in {CourseRole.OWNER, CourseRole.INSTRUCTOR}:
                return Response(
                    {"detail": "Draft courses are only accessible to course owners and instructors."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        return super().retrieve(request, *args, **kwargs)

    # --- Lifecycle actions -------------------------------------------------

    @action(
        detail=True,
        methods=["post"],
        url_path="activate",
        permission_classes=[IsAuthenticated, IsCourseOwnerOrInstructor],
    )
    def activate(self, request: Request, pk: Any = None) -> Response:  # noqa: ARG002
        _ = (request, pk)
        course = self.get_object()
        if course.status == Course.CourseStatus.ARCHIVED:
            return Response(
                {"detail": "Cannot activate an archived course."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        course.status = Course.CourseStatus.ACTIVE
        if not course.join_code:
            course.join_code = generate_join_code()
        course.save(update_fields=["status", "join_code"])
        return Response(
            {"status": course.status, "join_code": course.join_code},
            status=status.HTTP_200_OK,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="archive",
        permission_classes=[IsAuthenticated, IsCourseOwnerOrInstructor],
    )
    def archive(self, request: Request, pk: Any = None) -> Response:  # noqa: ARG002
        _ = (request, pk)
        course = self.get_object()
        course.status = Course.CourseStatus.ARCHIVED
        course.join_code_enabled = False
        course.save(update_fields=["status", "join_code_enabled"])
        return Response({"status": course.status}, status=status.HTTP_200_OK)

    @action(
        detail=True,
        methods=["post"],
        url_path="rotate-join-code",
        permission_classes=[IsAuthenticated, IsCourseOwnerOrInstructor],
    )
    def rotate_join_code(self, request: Request, pk: Any = None) -> Response:  # noqa: ARG002
        _ = (request, pk)
        course = self.get_object()
        if course.status == Course.CourseStatus.ARCHIVED:
            return Response(
                {"detail": "Archived courses cannot rotate codes."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        course.join_code = generate_join_code()
        course.save(update_fields=["join_code"])
        return Response({"join_code": course.join_code}, status=status.HTTP_200_OK)

    @action(
        detail=True,
        methods=["post"],
        url_path="join-code/enable",
        permission_classes=[IsAuthenticated, IsCourseOwnerOrInstructor],
    )
    def enable_join_code(self, request: Request, pk: Any = None) -> Response:  # noqa: ARG002
        _ = (request, pk)
        course = self.get_object()
        if course.status != Course.CourseStatus.ACTIVE:
            return Response(
                {"detail": "Join code can be enabled only for ACTIVE courses."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not course.join_code:
            course.join_code = generate_join_code()
        course.join_code_enabled = True
        course.save(update_fields=["join_code", "join_code_enabled"])
        return Response(
            {
                "join_code_enabled": course.join_code_enabled,
                "join_code": course.join_code,
            },
            status=status.HTTP_200_OK,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="join-code/disable",
        permission_classes=[IsAuthenticated, IsCourseOwnerOrInstructor],
    )
    def disable_join_code(self, request: Request, pk: Any = None) -> Response:  # noqa: ARG002
        _ = (request, pk)
        course = self.get_object()
        course.join_code_enabled = False
        course.save(update_fields=["join_code_enabled"])
        return Response(
            {"join_code_enabled": course.join_code_enabled},
            status=status.HTTP_200_OK,
        )

    # --- Membership actions ------------------------------------------------

    @action(
        detail=True,
        methods=["get"],
        url_path="members",
        permission_classes=[IsAuthenticated, IsCourseMember],
    )
    def members(self, request: Request, pk: Any = None) -> Response:  # noqa: ARG002
        _ = (request, pk)
        course = self.get_object()
        qs = CourseMembership.objects.filter(course=course).select_related("user")
        serializer = CourseMembershipSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(
        detail=True,
        methods=["post"],
        url_path="members/add",
        permission_classes=[IsAuthenticated, IsCourseOwnerOrInstructor],
    )
    def add_member(self, request: Request, pk: Any = None) -> Response:  # noqa: ARG002
        _ = pk
        course = self.get_object()
        role_value = request.data.get("role", CourseRole.STUDENT)
        if isinstance(role_value, str):
            role_value = role_value.upper()
        if role_value not in CourseRole.values:
            return Response(
                {"detail": "Invalid role supplied."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        role = role_value
        email = request.data.get("email")
        user_id = request.data.get("user_id")

        if not email and not user_id:
            return Response(
                {"detail": "email or user_id required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = None
        if email:
            user = User.objects.filter(email__iexact=email).first()
        elif user_id:
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:  # pragma: no cover - defensive
                user = None

        if not user:
            return Response(
                {"detail": "user not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        membership, created = CourseMembership.objects.get_or_create(
            course=course,
            user=user,
            defaults={"role": role},
        )

        if not created:
            membership.role = role
            membership.save(update_fields=["role"])

        serializer = CourseMembershipSerializer(membership)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="members/remove",
        permission_classes=[IsAuthenticated, IsCourseOwnerOrInstructor],
    )
    def remove_member(self, request: Request, pk: Any = None) -> Response:  # noqa: ARG002
        _ = pk
        course = self.get_object()
        user_id = request.data.get("user_id")

        if not user_id:
            return Response(
                {"detail": "user_id required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        membership = CourseMembership.objects.filter(
            course=course,
            user_id=user_id,
        ).first()
        if not membership:
            return Response(
                {"detail": "membership not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        if membership.role == CourseRole.OWNER:
            return Response(
                {"detail": "Owner membership cannot be removed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EnrollmentViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    """
    /api/enrollment/join/ endpoint for joining via join_code.
    /api/enrollment/preview/ endpoint for previewing course details by join_code.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = JoinCourseSerializer
    queryset = Course.objects.none()

    @action(detail=False, methods=["post"], url_path="preview")
    def preview(self, request: Request) -> Response:
        """
        Preview course details by join_code without joining.
        Returns course information if the code is valid and enabled.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        code = serializer.validated_data["join_code"].strip().upper()

        course = Course.objects.filter(
            join_code=code,
            status=Course.CourseStatus.ACTIVE,
            join_code_enabled=True,
        ).annotate(member_count=Count("memberships")).first()

        if not course:
            return Response(
                {"detail": "Invalid or disabled join code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if user is already a member
        is_member = CourseMembership.objects.filter(
            course=course, user=request.user
        ).exists()

        serializer = CourseSerializer(course)
        return Response(
            {
                **serializer.data,
                "is_member": is_member,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="join")
    def join(self, request: Request) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        code = serializer.validated_data["join_code"].strip().upper()

        course = Course.objects.filter(
            join_code=code,
            status=Course.CourseStatus.ACTIVE,
            join_code_enabled=True,
        ).first()

        if not course:
            return Response(
                {"detail": "Invalid or disabled join code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        membership, created = CourseMembership.objects.get_or_create(
            course=course,
            user=request.user,
            defaults={"role": CourseRole.STUDENT},
        )

        return Response(
            {
                "course_id": str(course.id),
                "course_slug": course.slug,
                "role": membership.role,
                "created": created,
            },
            status=status.HTTP_201_CREATED
            if created
            else status.HTTP_200_OK,
        )
