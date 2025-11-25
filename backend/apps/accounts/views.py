import logging
from typing import Any, Literal

import requests
from decouple import config
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
    GoogleOAuthSerializer,
    UserLoginSerializer,
    UserProfileSerializer,
    UserRegistrationSerializer,
)

logger = logging.getLogger(__name__)


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
    samesite: Literal["Lax", "Strict", "None"] | None = getattr(settings, "COOKIE_SAMESITE", "Lax")
    # Path limited to auth endpoints
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=max_age,
        httponly=True,
        secure=secure,
        samesite=samesite,
        path="/api/auth/",
    )


def _delete_refresh_cookie(response: Response) -> None:
    response.delete_cookie("refresh_token", path="/api/auth/")


@api_view(["POST"])
@permission_classes([AllowAny])
def google_oauth_view(request: Request) -> Response:
    """
    Google OAuth authentication endpoint.

    POST /api/auth/oauth/google/
    Body: {
        "code": "oauth_authorization_code",
        "role": "student"  # or "instructor" or "admin"
    }

    Flow:
    1. Receives OAuth authorization code from frontend
    2. Exchanges code for access token with Google
    3. Fetches user info from Google
    4. Creates or finds user by email/oauth_id
    5. Returns JWT tokens
    """
    # Step 1: Validate input
    serializer = GoogleOAuthSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    code = serializer.validated_data["code"]
    role = serializer.validated_data.get("role")  # Optional - required for sign-up, not for login

    # Step 2: Get Google OAuth credentials from environment
    google_client_id = config("GOOGLE_CLIENT_ID", default="")
    google_client_secret = config("GOOGLE_CLIENT_SECRET", default="")
    redirect_uri = config("GOOGLE_REDIRECT_URI", default="http://localhost:5173")

    if not google_client_id or not google_client_secret:
        logger.error("Google OAuth credentials not configured")
        return Response(
            {"detail": "OAuth service not configured."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # Step 3: Exchange authorization code for access token
    try:
        token_response = requests.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": google_client_id,
                "client_secret": google_client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10,
        )
        token_response.raise_for_status()
        token_data = token_response.json()
        access_token = token_data.get("access_token")
    except requests.RequestException as e:
        logger.error(f"Failed to exchange Google OAuth code: {e}")
        return Response(
            {"detail": "Failed to authenticate with Google."}, status=status.HTTP_401_UNAUTHORIZED
        )

    if not access_token:
        return Response(
            {"detail": "Invalid OAuth code."}, status=status.HTTP_401_UNAUTHORIZED
        )

    # Step 4: Fetch user info from Google
    try:
        user_info_response = requests.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
        user_info_response.raise_for_status()
        user_info = user_info_response.json()
    except requests.RequestException as e:
        logger.error(f"Failed to fetch Google user info: {e}")
        return Response(
            {"detail": "Failed to fetch user information from Google."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Step 5: Extract user information
    google_id = user_info.get("id")
    email = user_info.get("email", "").lower().strip()
    first_name = user_info.get("given_name", "").strip()
    last_name = user_info.get("family_name", "").strip()
    verified_email = user_info.get("verified_email", False)

    if not email:
        return Response(
            {"detail": "Email not provided by Google."}, status=status.HTTP_400_BAD_REQUEST
        )

    if not google_id:
        return Response(
            {"detail": "Google ID not provided."}, status=status.HTTP_400_BAD_REQUEST
        )

    # Step 6: Create or find user
    try:
        # Try to find user by oauth_id first (existing OAuth user)
        user = User.objects.filter(oauth_provider="google", oauth_id=google_id).first()

        if not user:
            # Try to find user by email (existing user might want to link OAuth)
            user = User.objects.filter(email=email).first()

        if user:
            # Update existing user with OAuth info if not already set
            if not user.oauth_provider or not user.oauth_id:
                user.oauth_provider = "google"
                user.oauth_id = google_id
                user.save()
            # Update name if missing
            if not user.first_name and first_name:
                user.first_name = first_name
            if not user.last_name and last_name:
                user.last_name = last_name
            if verified_email and not user.is_verified:
                user.is_verified = True
            user.save()
        else:
            # Create new user (sign-up flow)
            if not role:
                return Response(
                    {"detail": "Role is required for new user registration."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not first_name:
                first_name = email.split("@")[0]  # Fallback to email prefix
            if not last_name:
                last_name = ""

            user = User.objects.create_user(
                email=email,
                first_name=first_name,
                last_name=last_name,
                role=role,
                oauth_provider="google",
                oauth_id=google_id,
                is_verified=verified_email,
                password=None,  # OAuth users don't have passwords
            )

        # Ensure user is active
        if not user.is_active:
            return Response(
                {"detail": "User account is inactive."}, status=status.HTTP_403_FORBIDDEN
            )

    except Exception as e:
        logger.error(f"Failed to create/find user: {e}")
        return Response(
            {"detail": "Failed to create user account."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Step 7: Generate JWT tokens
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


# TODO: Implement these endpoints:
# - User password change
# - User password reset
# - User email verification
# - User OAuth endpoints (Microsoft)
