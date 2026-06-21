import pytest
from unittest.mock import MagicMock
from fastapi import FastAPI
from fastapi.testclient import TestClient

# Importamos los routers reales
from api.routes.chat import router as chat_router
from api.routes.search import router as search_router

@pytest.fixture
def mock_db_session():
    """Fixture para simular la sesión de SQLAlchemy (la base de datos)."""
    session = MagicMock()
    return session

@pytest.fixture
def test_client():
    """Fixture que crea una aplicación FastAPI de prueba e incluye tus rutas."""
    app = FastAPI()
    app.include_router(chat_router, prefix="/chat")
    app.include_router(search_router, prefix="/search")
    return TestClient(app)