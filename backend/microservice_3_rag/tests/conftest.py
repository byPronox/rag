import pytest
from unittest.mock import MagicMock
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.routes.chat import router as chat_router
from api.routes.search import router as search_router

@pytest.fixture
def mock_db_session():
    return MagicMock()

@pytest.fixture
def test_client():
    app = FastAPI()
    app.include_router(chat_router, prefix="/chat")
    app.include_router(search_router, prefix="/search")
    return TestClient(app)