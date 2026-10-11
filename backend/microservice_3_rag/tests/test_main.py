import re
from pathlib import Path

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)
BACKEND = Path(__file__).resolve().parents[2]


def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Microservicio Inference API funcionando"}


def test_health_reports_embedding_model():
    response = client.get("/health")
    assert response.json() == {"status": "ok", "embedding_model": "paraphrase-multilingual-MiniLM-L12-v2"}


def test_cors_allows_any_origin_without_credentials():
    response = client.options("/api/v1/search/", headers={
        "Origin": "https://tienda.ejemplo.com", "Access-Control-Request-Method": "POST"})
    assert response.headers["access-control-allow-origin"] == "*"
    assert "access-control-allow-credentials" not in response.headers


def _default(path, pattern):
    return re.search(pattern, (BACKEND / path).read_text(encoding="utf-8")).group(1)


def test_regression_embedding_model_defaults_match_everywhere():
    # Defecto: los Dockerfiles traían all-MiniLM-L6-v2 por defecto; MS3 sin la variable en Railway
    # vectorizaba las consultas con otro modelo que MS1 y la búsqueda devolvía productos al azar.
    defaults = {
        _default("microservice_1_sync/Dockerfile", r"ARG EMBEDDING_MODEL=(\S+)"),
        _default("microservice_3_rag/Dockerfile", r"ARG EMBEDDING_MODEL=(\S+)"),
        _default("microservice_1_sync/config/settings.py", r'"EMBEDDING_MODEL",\s*"([^"]+)"'),
        _default("microservice_3_rag/config/settings.py", r'"EMBEDDING_MODEL",\s*"([^"]+)"'),
    }
    assert defaults == {"paraphrase-multilingual-MiniLM-L12-v2"}
