from unittest.mock import MagicMock
from database.connection import get_db
from api.deps import get_current_user

def test_get_current_api_key_success(test_client, mock_db_session, mock_tenant_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_user] = lambda: mock_tenant_user
    
    config_mock = MagicMock()
    config_mock.system_api_key = "sk_live_12345"
    mock_db_session.query.return_value.filter.return_value.first.return_value = config_mock
    
    response = test_client.get("/api-keys/")
    
    assert response.status_code == 200
    assert response.json()["api_key"] == "sk_live_12345"

def test_get_current_api_key_not_found(test_client, mock_db_session, mock_tenant_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_user] = lambda: mock_tenant_user
    
    mock_db_session.query.return_value.filter.return_value.first.return_value = None
    
    response = test_client.get("/api-keys/")
    assert response.status_code == 404

def test_create_new_api_key(test_client, mock_db_session, mock_tenant_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_user] = lambda: mock_tenant_user
    
    config_mock = MagicMock()
    config_mock.system_api_key = "old_key"
    mock_db_session.query.return_value.filter.return_value.first.return_value = config_mock
    
    response = test_client.post("/api-keys/generate")
    
    assert response.status_code == 200
    assert response.json()["api_key"].startswith("sk_live_")
    assert config_mock.system_api_key != "old_key"
    mock_db_session.commit.assert_called_once()