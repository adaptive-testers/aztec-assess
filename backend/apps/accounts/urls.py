from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import views

app_name = "accounts"

urlpatterns = [
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("register/", views.UserRegistrationView.as_view(), name="register"),
    path("login/", views.user_login_view, name="login"),
]

# TODO: Add these endpoints for implementing authentication

# Traditional Auth Endpoints
# path('register/', views.UserRegistrationView.as_view(), name='register'),
# path('login/', views.UserLoginView.as_view(), name='login'),
# path('logout/', views.UserLogoutView.as_view(), name='logout'),
# path('profile/', views.UserProfileView.as_view(), name='profile'),
# path('password/change/', views.PasswordChangeView.as_view(), name='password_change'),
# path('password/reset/', views.PasswordResetView.as_view(), name='password_reset'),
# path('verify-email/', views.EmailVerificationView.as_view(), name='verify_email'),

# OAuth Endpoints
# path('oauth/google/', views.GoogleOAuthView.as_view(), name='oauth_google'),
# path('oauth/microsoft/', views.MicrosoftOAuthView.as_view(), name='oauth_microsoft'),
# path('oauth/callback/', views.OAuthCallbackView.as_view(), name='oauth_callback'),
