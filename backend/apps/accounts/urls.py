from django.urls import path

from . import views

app_name = "accounts"

urlpatterns = [
    path("register/", views.UserRegistrationView.as_view(), name="register"),
    path("login/", views.user_login_view, name="login"),
    path("logout/", views.user_logout_view, name="logout"),
    path("token/refresh/", views.token_refresh_cookie_view, name="token_refresh"),
    path("profile/", views.user_profile_view, name="profile"),
    path("oauth/google/", views.google_oauth_view, name="oauth_google"),
    path("oauth/microsoft/", views.microsoft_oauth_view, name="oauth_microsoft"),
]

# TODO: Add these endpoints for implementing authentication

# Traditional Auth Endpoints
# path('password/change/', views.PasswordChangeView.as_view(), name='password_change'),
# path('password/reset/', views.PasswordResetView.as_view(), name='password_reset'),
# path('verify-email/', views.EmailVerificationView.as_view(), name='verify_email'),
