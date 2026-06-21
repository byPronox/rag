from unittest.mock import patch, MagicMock
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

def test_create_user_by_admin(test_client, mock_db_session, mock_admin_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    
    mock_db_session.query.return_value.filter.return_value.first.return_value = None
    
    payload = {"email": "created@admin.com", "password": "123", "role": "user"}
    response = test_client.post("/admin/users", json=payload)
    
    assert response.status_code == 200
    assert mock_db_session.commit.call_count == 1

def test_delete_user(test_client, mock_db_session, mock_admin_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    
    user_to_delete = MagicMock()
    user_to_delete.is_active = True
    # Devolver el usuario a eliminar
    mock_db_session.query.return_value.filter.return_value.first.return_value = user_to_delete
    
    # Ojo: Intentar eliminarse a sí mismo (id=1)
    response_self = test_client.delete("/admin/users/1")
    assert response_self.status_code == 400
    
    # Eliminar a otro (id=2)
    response_other = test_client.delete("/admin/users/2")
    assert response_other.status_code == 200
    assert user_to_delete.is_active is False
    mock_db_session.commit.assert_called_once()

@patch('api.routes.admin_routes.requests.get')
def test_sync_models_with_groq_success(mock_get, test_client, mock_db_session, mock_admin_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    
    settings_mock = MagicMock()
    settings_mock.groq_api_key = "master_key_123"
    
    # 1. Devuelve settings, 2. Simula que el modelo no existe en la BD
    mock_db_session.query.return_value.filter.return_value.first.side_effect = [settings_mock, None]
    
    # Simulamos la respuesta de Groq
    mock_response = MagicMock()
    mock_response.json.return_value = {"data": [{"id": "llama3-8b-8192", "context_window": 8192}]}
    mock_get.return_value = mock_response
    
    response = test_client.post("/admin/models/sync")
    assert response.status_code == 200
    assert "guardaron 1 modelos nuevos" in response.json()["message"]