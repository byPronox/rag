from unittest.mock import patch, MagicMock
from database.connection import get_db
from api.deps import get_current_user

def test_login_success(test_client, mock_db_session, mock_tenant_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    
    mock_db_session.query.return_value.filter.return_value.first.return_value = mock_tenant_user
    
    with patch('api.routes.auth_routes.verify_password', return_value=True), \
         patch('api.routes.auth_routes.create_access_token', return_value="fake_token"):
         
        response = test_client.post("/auth/login", data={"username": "test@test.com", "password": "123"})
        
        assert response.status_code == 200
        assert "rag_token" in response.cookies
        assert response.json()["user"]["email"] == "tenant@empresa.com"

def test_login_invalid_credentials(test_client, mock_db_session):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    mock_db_session.query.return_value.filter.return_value.first.return_value = None
    
    response = test_client.post("/auth/login", data={"username": "fake", "password": "123"})
    assert response.status_code == 401

def test_register_new_tenant(test_client, mock_db_session):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    mock_db_session.query.return_value.filter.return_value.first.return_value = None
    
    with patch('api.routes.auth_routes.get_password_hash', return_value="hashed"):
        payload = {"email": "new@tenant.com", "password": "pass", "role": "user"}
        response = test_client.post("/auth/register", json=payload)
        
        assert response.status_code == 200
        mock_db_session.add.assert_called()
        mock_db_session.commit.assert_called_once()

def test_logout(test_client):
    response = test_client.post("/auth/logout")
    assert response.status_code == 200

def test_get_current_user_info(test_client, mock_db_session, mock_tenant_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_user] = lambda: mock_tenant_user
    
    config_mock = MagicMock()
    config_mock.system_api_key = "rag_api_key_123"
    mock_db_session.query.return_value.filter.return_value.first.return_value = config_mock
    
    response = test_client.get("/auth/me")
    
    assert response.status_code == 200
    assert response.json()["email"] == "tenant@empresa.com"
    assert response.json()["api_key"] == "rag_api_key_123"

def test_login_inactive_user(test_client, mock_db_session, mock_tenant_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    
    mock_tenant_user.is_active = False
    mock_db_session.query.return_value.filter.return_value.first.return_value = mock_tenant_user
    
    with patch('api.routes.auth_routes.verify_password', return_value=True):
        response = test_client.post("/auth/login", data={"username": "test@test.com", "password": "123"})
        
        assert response.status_code == 403
        assert "desactivada" in response.json()["detail"].lower()

def test_register_existing_email(test_client, mock_db_session):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    
    mock_db_session.query.return_value.filter.return_value.first.return_value = MagicMock()
    
    payload = {"email": "existente@tenant.com", "password": "pass", "role": "user"}
    response = test_client.post("/auth/register", json=payload)
    
    assert response.status_code == 400
    assert "ya está registrado" in response.json()["detail"].lower()

