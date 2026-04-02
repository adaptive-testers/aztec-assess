"""
Testing settings for adaptive_testing project.

This module contains settings specifically for running tests.
"""

from .base import *  # noqa: F403, F401

# Use in-memory SQLite database for faster tests
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# Disable migrations for faster tests
class DisableMigrations:
    def __contains__(self, item: str) -> bool:
        return True

    def __getitem__(self, item: str) -> None:
        return None

MIGRATION_MODULES = DisableMigrations()

# Disable password hashing for faster tests
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

# Disable logging during tests
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "null": {
            "class": "logging.NullHandler",
        },
    },
    "root": {
        "handlers": ["null"],
    },
}

# Disable CORS for tests
CORS_ALLOW_ALL_ORIGINS = True

# Use console email backend for tests
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Disable debug toolbar and other development tools
DEBUG = False

# Django test client uses plain HTTP; base.py defaults secure cookies / HTTPS redirect when DEBUG is False.
SECURE_SSL_REDIRECT = False
COOKIE_SECURE = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Use a test secret key
SECRET_KEY = "test-secret-key-for-testing-only"

# Disable cache during tests
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.dummy.DummyCache",
    }
}
