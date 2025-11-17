# ViewSets + actions for Courses and Enrollment.

from django.contrib.auth import get_user_model
from django.db.models import Count
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Course, CourseMembership, CourseRole
from .permissions import (
    IsCourseMember,
    IsCourseOwnerOrInstructor,
    IsCourseStaff,
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

    def get_queryset(self):
        user = self.request.user

        # Users only see courses they are a member of.
        qs = (
            Course.objects.filter(memberships__user=user)
            .annotate(member_count=Count("memberships"))
            .distinct()
        )

        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        else:
            # Default: hide archived courses from list unless explicitly requested.
            qs = qs.exclude(status=Course.CourseStatus.ARCHIVED)

        return qs

    def get_serializer_class(self):
        # Separate serializer for create vs list/detail.
        if self.action == "create":
            return CourseCreateSerializer
        return CourseSerializer

    def get_permissions(self):
        # We override this to attach stricter perms on mutating actions.
        if self.action in {"list", "retrieve", "create"}:
            return [IsAuthenticated()]
        if self.action in {"update", "partial_update", "destroy"}:
            return [IsAuthenticated(), IsCourseOwnerOrInstructor()]
        return super().get_permissions()

    def retrieve(self, request, *args, **kwargs):
        course = self.get_object()
        # Must be a member to see course detail (even DRAFT).
        if not IsCourseMember().has_object_permission(request, self, course):
            return Response(
                {"detail": "Not a member."},
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
    def activate(self, request, pk=None): # noqa: ARG002
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
    def archive(self, request, pk=None): # noqa: ARG002
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
    def rotate_join_code(self, request, pk=None): # noqa: ARG002
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
    def enable_join_code(self, request, pk=None): # noqa: ARG002
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
    def disable_join_code(self, request, pk=None): # noqa: ARG002
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
        permission_classes=[IsAuthenticated, IsCourseStaff],
    )
    def members(self, request, pk=None): # noqa: ARG002
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
    def add_member(self, request, pk=None): # noqa: ARG002
        course = self.get_object()
        user_id = request.data.get("user_id")
        role = request.data.get("role", CourseRole.STUDENT)

        if not user_id:
            return Response(
                {"detail": "user_id required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
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
    def remove_member(self, request, pk=None): # noqa: ARG002
        course = self.get_object()
        user_id = request.data.get("user_id")

        if not user_id:
            return Response(
                {"detail": "user_id required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        CourseMembership.objects.filter(course=course, user_id=user_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EnrollmentViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    """
    /api/enrollment/join/ endpoint for joining via join_code.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = JoinCourseSerializer
    queryset = Course.objects.none()

    @action(detail=False, methods=["post"], url_path="join")
    def join(self, request):
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
                "role": membership.role,
                "created": created,
            },
            status=status.HTTP_201_CREATED
            if created
            else status.HTTP_200_OK,
        )
