from unittest.mock import MagicMock
from database.connection import get_db
from api.deps import get_current_user
from datetime import datetime

def test_get_chat_history(test_client, mock_db_session, mock_tenant_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_user] = lambda: mock_tenant_user
    
    chat_mock = MagicMock()
    chat_mock.id = 1
    chat_mock.session_id = "sess_1"
    chat_mock.role = "user"
    chat_mock.message = "Hello bot"
    chat_mock.tokens_used = 10
    chat_mock.latency_ms = 100
    chat_mock.created_at = datetime.now()
    
    mock_db_session.query.return_value.filter.return_value.order_by.return_value.all.return_value = [chat_mock]
    
    response = test_client.get("/user/history/chat/comp_123")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["message"] == "Hello bot"

def test_get_search_history(test_client, mock_db_session, mock_tenant_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_user] = lambda: mock_tenant_user
    
    search_mock = MagicMock()
    search_mock.id = 1
    search_mock.session_id = "sess_2"
    search_mock.query_text = "Search product"
    search_mock.created_at = datetime.now()
    
    mock_db_session.query.return_value.filter.return_value.order_by.return_value.all.return_value = [search_mock]
    
    response = test_client.get("/user/history/search/comp_123")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["query_text"] == "Search product"