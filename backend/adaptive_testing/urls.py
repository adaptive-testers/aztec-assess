"""
URL configuration for adaptive_testing project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from .views import favicon_view, health_view, root_view


def build_urlpatterns() -> list:
    urlpatterns = [
        path("", root_view, name="root"),
        path("favicon.ico", favicon_view, name="favicon"),
        path("api/auth/", include("apps.accounts.urls")),
        path("api/health/", health_view, name="health"),
        # Courses API routes
        path("api/", include("apps.courses.urls")),
        # Quizzes API routes
        path("api/", include("apps.quizzes.urls")),
    ]

    if settings.ENABLE_DJANGO_ADMIN:
        urlpatterns.append(path("admin/", admin.site.urls))

    if settings.ENABLE_API_DOCS:
        urlpatterns.extend(
            [
                path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
                path(
                    "api/docs/",
                    SpectacularSwaggerView.as_view(url_name="schema"),
                    name="swagger-ui",
                ),
            ]
        )

    return urlpatterns


urlpatterns = build_urlpatterns()
