import pytest
from unittest.mock import MagicMock
from fastapi import FastAPI
from fastapi.testclient import TestClient
from api.routes.admin_routes import router as admin_router
from api.routes.api_keys import router as api_keys_router
from api.routes.auth_routes import router as auth_router
from api.routes.user_routes import router as user_router
from database.connection import get_db

@pytest.fixture
def mock_db_session():
    """Simula la base de datos de SQLAlchemy."""
    session = MagicMock()
    return session

@pytest.fixture
def test_client():
    """Levanta FastAPI con todas las rutas del Microservicio 2."""
    app = FastAPI()
    app.include_router(auth_router, prefix="/auth")
    app.include_router(admin_router, prefix="/admin")
    app.include_router(user_router, prefix="/user")
    app.include_router(api_keys_router, prefix="/api-keys")
    return TestClient(app)

@pytest.fixture
def mock_admin_user():
    user = MagicMock()
    user.id = 1
    user.email = "admin@rag.com"
    user.role = "admin"
    user.is_active = True
    user.hashed_password = "hashed_pass"
    user.token_version = 1
    return user

@pytest.fixture
def mock_tenant_user():
    user = MagicMock()
    user.id = 99
    user.email = "tenant@empresa.com"
    user.role = "user"
    user.is_active = True
    user.hashed_password = "hashed_pass"
    user.token_version = 1
    return user