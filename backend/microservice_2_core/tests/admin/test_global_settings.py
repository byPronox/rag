from unittest.mock import MagicMock
from database.connection import get_db
from api.deps import get_current_admin
from models.schema import GlobalSetting

def test_get_global_settings(test_client, mock_db_session, mock_admin_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    
    settings_mock = GlobalSetting(
        id=1, 
        default_llm_model="llama-3",
        default_embedding_model="all-MiniLM-L6-v2",
        default_welcome_message="Welcome",
        default_system_prompt="System",
        supreme_system_prompt="Supreme",
        maintenance_mode=False
    )
    mock_db_session.query.return_value.filter.return_value.first.return_value = settings_mock
    
    response = test_client.get("/admin/settings")
    
    assert response.status_code == 200
    assert response.json()["default_llm_model"] == "llama-3"

def test_update_global_settings(test_client, mock_db_session, mock_admin_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    
    mock_settings = MagicMock()
    mock_db_session.query.return_value.filter.return_value.first.return_value = mock_settings
    
    payload = {
        "default_llm_model": "llama-3-new",
        "default_embedding_model": "all-MiniLM-new",
        "default_welcome_message": "New welcome message",
        "default_system_prompt": "New system prompt",
        "supreme_system_prompt": "New supreme prompt",
        "groq_api_key": "gsk_new_key_123",
        "maintenance_mode": True
    }
    
    response = test_client.put("/admin/settings", json=payload)
    
    assert response.status_code == 200
    assert "actualizada" in response.json()["message"].lower()
    assert mock_settings.default_llm_model == "llama-3-new"
    assert mock_settings.groq_api_key == "gsk_new_key_123"
    mock_db_session.commit.assert_called_once()

def test_get_dashboard_metrics(test_client, mock_db_session, mock_admin_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    
    # Simulate count() and scalar() returns
    # 1. Total RAG queries (count)
    # 2. Total searches (count)
    mock_db_session.query.return_value.filter.return_value.count.return_value = 50
    mock_db_session.query.return_value.count.return_value = 20
    
    # 3. Total Tokens (scalar)
    # 4. Avg Latency (scalar)
    mock_db_session.query.return_value.scalar.side_effect = [15000, 350]
    
    # Simulate complex queries for Top Searches and User Activity
    mock_db_session.query.return_value.group_by.return_value.order_by.return_value.limit.return_value.all.side_effect = [
        [("price of product x", 15)], # top searches
    ]
    
    mock_db_session.query.return_value.join.return_value.filter.return_value.group_by.return_value.order_by.return_value.limit.return_value.all.return_value = [
        ("user@company.com", 30, 8000) # user activity
    ]
    
    response = test_client.get("/admin/metrics")
    
    assert response.status_code == 200
    data = response.json()
    assert data["total_rag_queries"] == 50
    assert data["total_search_queries"] == 20
    assert data["total_tokens"] == 15000
    assert data["avg_latency_sec"] == 0.35  # 350 / 1000
    assert data["top_queries"][0]["query"] == "price of product x"
    assert data["user_activity"][0]["email"] == "user@company.com"