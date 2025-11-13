from typing import Any

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

from .managers import UserManager


class UserRole(models.TextChoices):
    ADMIN = "admin", "Admin"
    INSTRUCTOR = "instructor", "Instructor"
    STUDENT = "student", "Student"


class User(AbstractUser):
    """
    Custom User model with email as username and additional fields.

    This model extends the AbstractUser model to:
    - Use email as the primary identifier
    - Add additional fields for user profiles
    - Support both traditional auth and social auth
    """

    # Remove username field
    username = None

    # Set email as the primary identifier
    email: models.EmailField = models.EmailField(
        unique=True, help_text="User's email address (used as username)"
    )

    # Add additional fields for user profiles
    first_name: models.CharField = models.CharField(max_length=40, help_text="User's first name")
    last_name: models.CharField = models.CharField(max_length=40, help_text="User's last name")

    role: models.CharField = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.STUDENT,
        help_text="User's role in the system",
    )

    # User status fields
    is_active = models.BooleanField(
        default=True, help_text="Whether the user account is active"
    )
    is_verified: models.BooleanField = models.BooleanField(
        default=False, help_text="Whether the user's email has been verified"
    )

    # Timestamps
    created_at: models.DateTimeField = models.DateTimeField(
        auto_now_add=True, help_text="Date and time when the user account was created"
    )
    updated_at: models.DateTimeField = models.DateTimeField(
        auto_now=True, help_text="Date and time when the user account was last updated"
    )
    last_login = models.DateTimeField(
        default=timezone.now,
        null=True,
        blank=True,
        help_text="Date and time when the user last logged in",
    )

    # Oauth fields
    oauth_provider: models.CharField = models.CharField(
        max_length=50,
        blank=True,
        default="",
        help_text="The provider of the user's OAuth account",
    )
    oauth_id: models.CharField = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="The ID of the user's OAuth account",
    )

    # Set email as the USERNAME_FIELD
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    # Set the custom user manager
    objects = UserManager()  # type: ignore[assignment]

    class Meta:
        db_table = "auth_user"
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return str(self.email)

    @property
    def full_name(self) -> str:
        """Return the user's full name"""
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def display_name(self) -> str:
        """Return the user's display name"""
        return self.full_name if self.full_name else self.email.split("@")[0]

    @property
    def is_admin(self) -> bool:
        """Return True if the user is an admin"""
        return bool(self.role == UserRole.ADMIN)

    @property
    def is_instructor(self) -> bool:
        """Return True if the user is an instructor"""
        return bool(self.role == UserRole.INSTRUCTOR)

    @property
    def is_student(self) -> bool:
        """Return True if the user is a student"""
        return bool(self.role == UserRole.STUDENT)

    def save(self, *args: Any, **kwargs: Any) -> None:
        """Override save to ensure email is lowercase"""
        self.email = self.email.lower()
        super().save(*args, **kwargs)
