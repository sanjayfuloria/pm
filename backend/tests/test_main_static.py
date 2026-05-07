from fastapi.testclient import TestClient

from app.main import app


def test_health_route() -> None:
    client = TestClient(app)
    response = client.get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"


def test_root_serves_html() -> None:
    client = TestClient(app)
    response = client.get("/")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
