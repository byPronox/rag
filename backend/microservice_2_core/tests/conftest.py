import pytest
from unittest.mock import MagicMock
from fastapi import FastAPI
from fastapi.testclient import TestClient
from api.routes.admin_routes import router as admin_router
from api.routes.api_keys import router as api_keys_router
from api.routes.auth_routes import router as auth_router
from api.routes.user_routes import router as user_router

@pytest.fixture
def mock_db_session():
    """Mocks the SQLAlchemy database session."""
    session = MagicMock()
    return session

@pytest.fixture
def test_client():
    """Initializes FastAPI with all routes from Microservice 2 for testing."""
    app = FastAPI()
    app.include_router(auth_router, prefix="/auth")
    app.include_router(admin_router, prefix="/admin")
    app.include_router(user_router, prefix="/user")
    app.include_router(api_keys_router, prefix="/api-keys")
    return TestClient(app)

@pytest.fixture
def mock_admin_user():
    """Returns a mock admin user."""
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
    """Returns a mock standard tenant user."""
    user = MagicMock()
    user.id = 99
    user.email = "tenant@company.com"
    user.role = "user"
    user.is_active = True
    user.hashed_password = "hashed_pass"
    user.token_version = 1
    return user