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

def test_update_global_settings(test_client, mock_db_session, mock_admin_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    
    mock_settings = MagicMock()
    mock_db_session.query.return_value.filter.return_value.first.return_value = mock_settings
    
    payload = {
        "default_llm_model": "llama-3-new",
        "default_embedding_model": "all-MiniLM-new",
        "default_welcome_message": "Nuevo mensaje",
        "default_system_prompt": "Nuevo prompt",
        "supreme_system_prompt": "Nuevo supreme",
        "groq_api_key": "gsk_nueva_llave_123",
        "maintenance_mode": True
    }
    
    response = test_client.put("/admin/settings", json=payload)
    
    assert response.status_code == 200
    assert response.json()["message"] == "Configuración global actualizada"
    assert mock_settings.default_llm_model == "llama-3-new"
    assert mock_settings.groq_api_key == "gsk_nueva_llave_123"
    mock_db_session.commit.assert_called_once()

def test_get_all_users(test_client, mock_db_session, mock_admin_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    
    # Simular la tupla (User, UserConfig) que devuelve el outerjoin
    user_mock = MagicMock()
    user_mock.id = 1
    user_mock.email = "cliente@rag.com"
    user_mock.role = "user"
    user_mock.is_active = True
    config_mock = MagicMock()
    
    mock_db_session.query.return_value.outerjoin.return_value.all.return_value = [(user_mock, config_mock)]
    
    # Simular el conteo de compañías dentro del bucle
    mock_db_session.query.return_value.filter.return_value.count.return_value = 2
    
    response = test_client.get("/admin/users")
    
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["email"] == "cliente@rag.com"
    assert response.json()[0]["connected_companies"] == 2

def test_create_user_email_already_exists(test_client, mock_db_session, mock_admin_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    
    # Simular que el usuario ya existe
    mock_db_session.query.return_value.filter.return_value.first.return_value = MagicMock()
    
    payload = {"email": "existente@rag.com", "password": "123", "role": "user"}
    response = test_client.post("/admin/users", json=payload)
    
    assert response.status_code == 400
    assert "already in use" in response.json()["detail"]

def test_delete_user_not_found(test_client, mock_db_session, mock_admin_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    
    # Simular que el usuario a eliminar no existe
    mock_db_session.query.return_value.filter.return_value.first.return_value = None
    
    response = test_client.delete("/admin/users/999")
    
    assert response.status_code == 404
    assert "Usuario no encontrado" in response.json()["detail"]

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
    assert "no encontrada" in response.json()["detail"]

def test_get_all_models(test_client, mock_db_session, mock_admin_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    
    model_mock = MagicMock()
    model_mock.id = "llama3-8b-8192"
    model_mock.name = "LLAMA3-8B"
    model_mock.provider = "Groq"
    model_mock.type = "llm"
    model_mock.is_active = True
    model_mock.description = "Test"
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
    
    response = test_client.put("/admin/models/modelo-inventado", json={"is_active": True})
    
    assert response.status_code == 404

def test_sync_models_missing_api_key(test_client, mock_db_session, mock_admin_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    
    settings_mock = MagicMock()
    settings_mock.groq_api_key = None
    mock_db_session.query.return_value.filter.return_value.first.return_value = settings_mock
    
    response = test_client.post("/admin/models/sync")
    
    assert response.status_code == 400
    assert "Groq API Key no configurada" in response.json()["detail"]

@patch('api.routes.admin_routes.requests.get')
def test_sync_models_api_failure(mock_get, test_client, mock_db_session, mock_admin_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    
    settings_mock = MagicMock()
    settings_mock.groq_api_key = "valid_key"
    mock_db_session.query.return_value.filter.return_value.first.return_value = settings_mock
    
    # Simular una caída de la API de Groq
    mock_get.side_effect = Exception("Connection Timeout")
    
    response = test_client.post("/admin/models/sync")
    
    assert response.status_code == 502
    assert "Error conectando con Groq" in response.json()["detail"]

def test_get_dashboard_metrics(test_client, mock_db_session, mock_admin_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    
    # Simular retornos de count() y scalar()
    # 1. Total RAG queries (count)
    # 2. Total searches (count)
    mock_db_session.query.return_value.filter.return_value.count.return_value = 50
    mock_db_session.query.return_value.count.return_value = 20
    
    # 3. Total Tokens (scalar)
    # 4. Avg Latency (scalar)
    mock_db_session.query.return_value.scalar.side_effect = [15000, 350]
    
    # Simular queries complejas de Top Searches y User Activity
    mock_db_session.query.return_value.group_by.return_value.order_by.return_value.limit.return_value.all.side_effect = [
        [("precio del producto x", 15)], # top searches
    ]
    
    mock_db_session.query.return_value.join.return_value.filter.return_value.group_by.return_value.order_by.return_value.limit.return_value.all.return_value = [
        ("usuario@empresa.com", 30, 8000) # user activity
    ]
    
    response = test_client.get("/admin/metrics")
    
    assert response.status_code == 200
    data = response.json()
    assert data["total_rag_queries"] == 50
    assert data["total_search_queries"] == 20
    assert data["total_tokens"] == 15000
    assert data["avg_latency_sec"] == 0.35  # 350 / 1000
    assert data["top_queries"][0]["query"] == "precio del producto x"
    assert data["user_activity"][0]["email"] == "usuario@empresa.com"

