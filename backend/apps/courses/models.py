# Core data model for Courses app (Course, CourseRole, CourseMembership).

import uuid

from django.conf import settings
from django.db import models
from django.utils.text import slugify


class Course(models.Model):
    class CourseStatus(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        ACTIVE = "ACTIVE", "Active"
        ARCHIVED = "ARCHIVED", "Archived"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Single owner per course; used for permissions + default membership.
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_courses",
    )

    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=60, unique=True, db_index=True)

    status = models.CharField(
        max_length=10,
        choices=CourseStatus.choices,
        default=CourseStatus.DRAFT,
        db_index=True,
    )

    # Enrollment
    join_code = models.CharField(
        max_length=16,
        blank=True,
        default="",
        db_index=True,
    )
    join_code_enabled = models.BooleanField(default=False)

    # Meta
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_archived(self) -> bool:
        # Helper for views/permissions; archived courses are read-only.
        return self.status == self.CourseStatus.ARCHIVED

    def save(self, *args, **kwargs):
        """
        Ensure we always have a unique slug based on title.

        NOTE: This is intentionally simple and deterministic so tests are easy.
        """
        if not self.slug:
            base = slugify(self.title)[:50]
            candidate = base or "course"
            i = 1
            # Avoid collisions with existing slugs (excluding self when updating).
            while Course.objects.filter(slug=candidate).exclude(pk=self.pk).exists():
                i += 1
                candidate = f"{base}-{i}" if base else f"course-{i}"
            self.slug = candidate
        super().save(*args, **kwargs)

    def __str__(self) -> str:  # pragma: no cover (nice for admin only)
        return f"{self.title} ({self.status})"


class CourseRole(models.TextChoices):
    OWNER = "OWNER", "Owner"
    INSTRUCTOR = "INSTRUCTOR", "Instructor"
    TA = "TA", "Teaching Assistant"
    STUDENT = "STUDENT", "Student"


class CourseMembership(models.Model):
    """
    Link table between User and Course, with a role per user/course pair.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="course_memberships",
    )
    role = models.CharField(
        max_length=16,
        choices=CourseRole.choices,
        default=CourseRole.STUDENT,
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("course", "user")
        indexes = [
            models.Index(fields=["course", "user"]),
            models.Index(fields=["role"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.user_id} in {self.course_id} as {self.role}"
