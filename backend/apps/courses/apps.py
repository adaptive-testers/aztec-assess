from django.apps import AppConfig


class CoursesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"

    # This must match the dotted path used in INSTALLED_APPS
    # in base.py: "apps.courses"
    name = "apps.courses"

    # short label used internally by Django
    label = "courses"
