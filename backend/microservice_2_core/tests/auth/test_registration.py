from unittest.mock import patch, MagicMock
from database.connection import get_db

def test_register_new_tenant(test_client, mock_db_session):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    mock_db_session.query.return_value.filter.return_value.first.return_value = None
    
    with patch('api.routes.auth_routes.get_password_hash', return_value="hashed_password"):
        payload = {"email": "new@tenant.com", "password": "secure_pass", "role": "user"}
        response = test_client.post("/auth/register", json=payload)
        
        assert response.status_code == 200
        mock_db_session.add.assert_called()
        mock_db_session.commit.assert_called_once()

def test_register_existing_email(test_client, mock_db_session):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    
    # Simulate user already exists in the database
    mock_db_session.query.return_value.filter.return_value.first.return_value = MagicMock()
    
    payload = {"email": "existing@tenant.com", "password": "secure_pass", "role": "user"}
    response = test_client.post("/auth/register", json=payload)
    
    assert response.status_code == 400
    assert "ya está registrado" in response.json()["detail"].lower()