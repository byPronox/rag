from unittest.mock import patch, MagicMock
from database.connection import get_db
from api.deps import get_current_admin

def test_get_all_models(test_client, mock_db_session, mock_admin_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    
    model_mock = MagicMock()
    model_mock.id = "llama3-8b-8192"
    model_mock.name = "LLAMA3-8B"
    model_mock.provider = "Groq"
    model_mock.type = "llm"
    model_mock.is_active = True
    model_mock.description = "Test description"
    model_mock.context_window = 8192
    model_mock.dimensions = None
    
    mock_db_session.query.return_value.all.return_value = [model_mock]
    
    response = test_client.get("/admin/models")
    
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["id"] == "llama3-8b-8192"

def test_update_model_status_success(test_client, mock_db_session, mock_admin_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    
    model_mock = MagicMock()
    model_mock.id = "llama3-8b-8192"
    model_mock.name = "LLAMA3-8B"
    model_mock.provider = "Groq"
    model_mock.type = "llm"
    model_mock.description = "Official model"
    model_mock.context_window = 8192
    model_mock.dimensions = None
    model_mock.is_active = False
    
    mock_db_session.query.return_value.filter.return_value.first.return_value = model_mock
    
    response = test_client.put("/admin/models/llama3-8b-8192", json={"is_active": True})
    
    assert response.status_code == 200
    assert model_mock.is_active is True
    mock_db_session.commit.assert_called_once()

def test_update_model_status_not_found(test_client, mock_db_session, mock_admin_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    
    mock_db_session.query.return_value.filter.return_value.first.return_value = None
    
    response = test_client.put("/admin/models/fake-model-id", json={"is_active": True})
    
    assert response.status_code == 404

@patch('api.routes.admin_routes.requests.get')
def test_sync_models_with_groq_success(mock_get, test_client, mock_db_session, mock_admin_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    
    settings_mock = MagicMock()
    settings_mock.groq_api_key = "master_key_123"
    
    # 1. Returns settings, 2. Simulates model does not exist in DB
    mock_db_session.query.return_value.filter.return_value.first.side_effect = [settings_mock, None]
    
    # Simulate Groq API response
    mock_response = MagicMock()
    mock_response.json.return_value = {"data": [{"id": "llama3-8b-8192", "context_window": 8192}]}
    mock_get.return_value = mock_response
    
    response = test_client.post("/admin/models/sync")
    assert response.status_code == 200
    assert "saved" in response.json()["message"].lower()

def test_sync_models_missing_api_key(test_client, mock_db_session, mock_admin_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    
    settings_mock = MagicMock()
    settings_mock.groq_api_key = None
    mock_db_session.query.return_value.filter.return_value.first.return_value = settings_mock
    
    response = test_client.post("/admin/models/sync")
    
    assert response.status_code == 400
    assert "not configured" in response.json()["detail"].lower()

@patch('api.routes.admin_routes.requests.get')
def test_sync_models_api_failure(mock_get, test_client, mock_db_session, mock_admin_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    
    settings_mock = MagicMock()
    settings_mock.groq_api_key = "valid_key"
    mock_db_session.query.return_value.filter.return_value.first.return_value = settings_mock
    
    # Simulate a Groq API failure
    mock_get.side_effect = Exception("Connection Timeout")
    
    response = test_client.post("/admin/models/sync")
    
    assert response.status_code == 502
    assert "error connecting" in response.json()["detail"].lower()