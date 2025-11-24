# DRF serializers for Course + Membership + join flow.

from typing import Any

from rest_framework import serializers

from .models import Course, CourseMembership, CourseRole


class CourseSerializer(serializers.ModelSerializer):
    owner_id = serializers.UUIDField(source="owner.id", read_only=True)
    member_count = serializers.SerializerMethodField()

    def get_member_count(self, obj: Course) -> int:
        """Return the number of members in the course."""
        annotated_value = getattr(obj, "member_count", None)
        if annotated_value is not None:
            return int(annotated_value)
        return int(obj.memberships.count())  # type: ignore[attr-defined]

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "slug",
            "owner_id",
            "status",
            "join_code",
            "join_code_enabled",
            "member_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "slug",
            "owner_id",
            "member_count",
            "created_at",
            "updated_at",
        ]


class CourseCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ["id", "title", "status", "join_code", "join_code_enabled", "created_at"]
        read_only_fields = ["id", "status", "join_code", "join_code_enabled", "created_at"]

    def create(self, validated_data: dict[str, Any]) -> Course:
        user = self.context["request"].user
        course = Course.objects.create(
            owner=user,
            status=Course.CourseStatus.DRAFT,
            join_code=None,
            join_code_enabled=False,
            **validated_data,
        )
        CourseMembership.objects.create(
            course=course,
            user=user,
            role=CourseRole.OWNER,
        )
        return course


class CourseMembershipSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source="user.id", read_only=True)

    class Meta:
        model = CourseMembership
        fields = ["id", "user_id", "role", "joined_at"]
        read_only_fields = ["id", "user_id", "joined_at"]


class JoinCourseSerializer(serializers.Serializer):
    # Payload for /api/enrollment/join/
    join_code = serializers.CharField(max_length=16)
