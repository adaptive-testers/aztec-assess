"""Project-level lightweight operational endpoints."""

from django.http import HttpRequest, HttpResponse, JsonResponse


def root_view(_request: HttpRequest) -> JsonResponse:
    """Return a simple service response for the root URL."""
    return JsonResponse({"service": "aztec-assess-api", "status": "ok"})


def health_view(_request: HttpRequest) -> JsonResponse:
    """Return health status for uptime checks."""
    return JsonResponse({"status": "ok"})


def favicon_view(_request: HttpRequest) -> HttpResponse:
    """Return an empty favicon response to avoid noisy 404 logs."""
    return HttpResponse(status=204)
