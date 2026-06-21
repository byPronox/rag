from unittest.mock import patch, MagicMock
from database.connection import get_db
from api.deps import get_current_user

def test_login_success(test_client, mock_db_session, mock_tenant_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    
    # Hacemos que la BD devuelva al usuario
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
    # Simulamos que no existe nadie con ese correo
    mock_db_session.query.return_value.filter.return_value.first.return_value = None
    
    with patch('api.routes.auth_routes.get_password_hash', return_value="hashed"):
        payload = {"email": "new@tenant.com", "password": "pass", "role": "user"}
        response = test_client.post("/auth/register", json=payload)
        
        assert response.status_code == 200
        mock_db_session.add.assert_called() # Asegura que intentó guardar usuario y config
        mock_db_session.commit.assert_called_once()

def test_logout(test_client):
    response = test_client.post("/auth/logout")
    assert response.status_code == 200