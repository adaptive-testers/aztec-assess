"""
CI settings for adaptive_testing project.

This module contains settings specifically for CI/CD environments.
"""

import os
from datetime import timedelta

# Database configuration
# Always use Neon database for CI - fail if not available
import dj_database_url
from decouple import config

from .base import *  # noqa: F403, F401

DATABASE_URL = config("DATABASE_URL", default=None)
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required for CI environment.")

DATABASES = {
    "default": dj_database_url.parse(DATABASE_URL)
}

CONN_MAX_AGE = 0

# Use a unique test database per CI run when provided, to avoid clashes on reruns.
_test_db_suffix = os.getenv("DJANGO_TEST_DB_SUFFIX")
if _test_db_suffix:
    _base_name = DATABASES["default"].get("NAME")
    if _base_name:
        DATABASES["default"]["TEST"] = {
            "NAME": f"test_{_base_name}_{_test_db_suffix}",
        }

# Disable password hashing for faster CI
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

# Disable logging during CI
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

# CI-specific settings
DEBUG = False
SECRET_KEY = "ci-secret-key-for-testing-only"

# Disable CORS for CI
CORS_ALLOW_ALL_ORIGINS = True

# Use console email backend for CI
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Disable cache during CI
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.dummy.DummyCache",
    }
}

# CI-specific JWT settings (shorter lifetimes for faster tests)
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=5),
    "REFRESH_TOKEN_LIFETIME": timedelta(hours=1),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "VERIFYING_KEY": None,
    "AUDIENCE": None,
    "ISSUER": None,
    "JWK_URL": None,
    "LEEWAY": 0,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "USER_AUTHENTICATION_RULE": "rest_framework_simplejwt.authentication.default_user_authentication_rule",
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "TOKEN_TYPE_CLAIM": "token_type",
    "JTI_CLAIM": "jti",
    "SLIDING_TOKEN_REFRESH_EXP_CLAIM": "refresh_exp",
    "SLIDING_TOKEN_LIFETIME": timedelta(minutes=5),
    "SLIDING_TOKEN_REFRESH_LIFETIME": timedelta(hours=1),
}
