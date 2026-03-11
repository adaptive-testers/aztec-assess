import pytest
from django.test import Client

pytestmark = pytest.mark.django_db


def test_root_endpoint_returns_ok_json() -> None:
    client = Client()
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"service": "aztec-assess-api", "status": "ok"}


def test_health_endpoint_returns_ok_json() -> None:
    client = Client()
    response = client.get("/api/health/")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_favicon_returns_no_content() -> None:
    client = Client()
    response = client.get("/favicon.ico")

    assert response.status_code == 204
