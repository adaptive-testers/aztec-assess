from typing import Any

from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import (
    UserLoginSerializer,
    UserProfileSerializer,
    UserRegistrationSerializer,
)


class UserRegistrationView(generics.CreateAPIView):
    """
    User registration endpoint.

    POST /api/auth/register/
    Body: {
        "email": "user@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "password": "securepassword",
        "role": "student" # or "instructor" or "admin"
    }
    """

    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    def create(self, request: Any) -> Response:
        # TODO: Implement user registration logic
        # 1. Validate serializer
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # 2. Create user
        user = serializer.save()

        # 3. Generate JWT tokens
        refresh = RefreshToken.for_user(user)

        # 4. Return user data + tokens, and set refresh cookie
        data = serializer.data
        data["tokens"] = {
            "access": str(refresh.access_token),
        }

        response = Response(data, status=status.HTTP_201_CREATED)
        _set_refresh_cookie(response, str(refresh))
        return response


@api_view(["POST"])
@permission_classes([AllowAny])
def user_login_view(request: Request) -> Response:
    """
    User login endpoint.

    POST /api/auth/login/
    Body: {
        "email": "user@example.com",
        "password": "securepassword"
    }
    """
    # Step 1: Validate input data format
    serializer = UserLoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Step 2: Extract and normalize data
    email = serializer.validated_data["email"]
    password = serializer.validated_data["password"]

    # Step 3: Authenticate user
    user = authenticate(request, username=email, password=password)

    # Step 4: Handle authentication results
    if not user:
        # Check if user exists but is inactive
        try:
            existing_user = User.objects.get(email=email)
            if not existing_user.is_active:
                return Response({"detail": "User inactive."}, status=status.HTTP_403_FORBIDDEN)
        except User.DoesNotExist:
            pass
        return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

    # Step 5: Ensure it's our custom User model and is active
    if not isinstance(user, User) or not user.is_active:
        return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
    refresh = RefreshToken.for_user(user)
    data = {
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "tokens": {"access": str(refresh.access_token)},
    }

    response = Response(data, status=status.HTTP_200_OK)
    _set_refresh_cookie(response, str(refresh))
    return response


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def user_profile_view(request: Request) -> Response:
    """
    User profile endpoint.

    GET /api/auth/profile/ - Retrieve current user profile
    PATCH /api/auth/profile/ - Update user profile
    """
    user = request.user

    if request.method == "GET":
        # Return current user profile data
        serializer = UserProfileSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == "PATCH":
        # Update user profile
        serializer = UserProfileSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    return Response({"detail": "Method not allowed"}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


@api_view(["POST"])
@permission_classes([AllowAny])
def token_refresh_cookie_view(request: Request) -> Response:
    """
    Refresh access (and rotate refresh) using refresh token stored in http-only cookie.

    POST /api/auth/token/refresh/
    """
    refresh_cookie = request.COOKIES.get("refresh_token")
    if not refresh_cookie:
        return Response({"detail": "Missing refresh token."}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        serializer = TokenRefreshSerializer(data={"refresh": refresh_cookie})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_401_UNAUTHORIZED)
    except TokenError:
        return Response({"detail": "Token is blacklisted."}, status=status.HTTP_401_UNAUTHORIZED)

    access = serializer.validated_data.get("access")
    new_refresh = serializer.validated_data.get("refresh")

    data = {"tokens": {"access": access}}
    response = Response(data, status=status.HTTP_200_OK)

    # If rotation is enabled, a new refresh will be returned
    if new_refresh:
        _set_refresh_cookie(response, new_refresh)

    return response


@api_view(["POST"])
@permission_classes([AllowAny])
def user_logout_view(request: Request) -> Response:
    """
    Clear refresh cookie and blacklist the token for security.
    """
    response = Response({"detail": "Logged out."}, status=status.HTTP_200_OK)

    # Try to blacklist the refresh token from cookie
    refresh_cookie = request.COOKIES.get("refresh_token")
    if refresh_cookie:
        try:
            # Create RefreshToken instance and blacklist it
            token = RefreshToken(refresh_cookie)  # type: ignore[arg-type]
            token.blacklist()
        except TokenError:
            # Token is invalid or already blacklisted, that's fine
            pass

    _delete_refresh_cookie(response)
    return response


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """Set the refresh token as a secure, HttpOnly cookie."""
    lifetime = settings.SIMPLE_JWT.get("REFRESH_TOKEN_LIFETIME")
    max_age = int(lifetime.total_seconds()) if lifetime else None

    secure = getattr(settings, "COOKIE_SECURE", True)
    # Path limited to auth endpoints
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=max_age,
        httponly=True,
        secure=secure,
        samesite="Lax",
        path="/api/auth/",
    )


def _delete_refresh_cookie(response: Response) -> None:
    response.delete_cookie("refresh_token", path="/api/auth/")

# TODO: Implement these endpoints:
# - User password change
# - User password reset
# - User email verification
# - User OAuth endpoints (Google, Microsoft)
