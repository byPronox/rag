from unittest.mock import MagicMock
from database.connection import get_db
from api.deps import get_current_admin

def test_get_all_users(test_client, mock_db_session, mock_admin_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    
    # Mock the tuple (User, UserConfig) returned by the outerjoin
    user_mock = MagicMock()
    user_mock.id = 1
    user_mock.email = "client@rag.com"
    user_mock.role = "user"
    user_mock.is_active = True
    config_mock = MagicMock()
    
    mock_db_session.query.return_value.outerjoin.return_value.all.return_value = [(user_mock, config_mock)]
    
    # Mock the company count query inside the loop
    mock_db_session.query.return_value.filter.return_value.count.return_value = 2
    
    response = test_client.get("/admin/users")
    
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["email"] == "client@rag.com"
    assert response.json()[0]["connected_companies"] == 2

def test_create_user_by_admin(test_client, mock_db_session, mock_admin_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    
    mock_db_session.query.return_value.filter.return_value.first.return_value = None
    
    payload = {"email": "created@admin.com", "password": "123", "role": "user"}
    response = test_client.post("/admin/users", json=payload)
    
    assert response.status_code == 200
    assert mock_db_session.commit.call_count == 1

def test_create_user_email_already_exists(test_client, mock_db_session, mock_admin_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    
    # Simulate user already exists
    mock_db_session.query.return_value.filter.return_value.first.return_value = MagicMock()
    
    payload = {"email": "existing@rag.com", "password": "123", "role": "user"}
    response = test_client.post("/admin/users", json=payload)
    
    assert response.status_code == 400
    assert "already in use" in response.json()["detail"].lower()

def test_delete_user(test_client, mock_db_session, mock_admin_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    
    user_to_delete = MagicMock()
    user_to_delete.is_active = True
    # Return the user to be deleted
    mock_db_session.query.return_value.filter.return_value.first.return_value = user_to_delete
    
    # Attempting to delete oneself (id=1)
    response_self = test_client.delete("/admin/users/1")
    assert response_self.status_code == 400
    
    # Delete another user (id=2)
    response_other = test_client.delete("/admin/users/2")
    assert response_other.status_code == 200
    assert user_to_delete.is_active is False
    mock_db_session.commit.assert_called_once()

def test_delete_user_not_found(test_client, mock_db_session, mock_admin_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    
    # Simulate user not found
    mock_db_session.query.return_value.filter.return_value.first.return_value = None
    
    response = test_client.delete("/admin/users/999")
    
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

def test_regenerate_user_api_key_by_admin(test_client, mock_db_session, mock_admin_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    
    config_mock = MagicMock()
    config_mock.system_api_key = "old_key"
    mock_db_session.query.return_value.filter.return_value.first.return_value = config_mock
    
    response = test_client.post("/admin/users/2/api-key")
    
    assert response.status_code == 200
    assert "api_key" in response.json()
    assert response.json()["api_key"].startswith("rag_")
    mock_db_session.commit.assert_called_once()

def test_regenerate_user_api_key_not_found(test_client, mock_db_session, mock_admin_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    
    mock_db_session.query.return_value.filter.return_value.first.return_value = None
    
    response = test_client.post("/admin/users/999/api-key")
    
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()