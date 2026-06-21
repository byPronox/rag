from unittest.mock import patch, MagicMock
from database.connection import get_db
from api.deps import validate_tenant_api_key

def override_auth():
    return {"user_id": 99, "groq_api_key": "valid_groq_key"}

def test_get_chat_config_success(test_client, mock_db_session):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[validate_tenant_api_key] = override_auth
    
    mock_db_session.execute.return_value.fetchone.return_value = ("Hola, ¿en qué ayudo?", "#ff0000", "robot.png")
    
    response = test_client.get("/chat/config?company_id=123", headers={"x-api-key": "dummy"})
    
    assert response.status_code == 200
    assert response.json() == {
        "welcome_message": "Hola, ¿en qué ayudo?",
        "theme_color": "#ff0000",
        "chat_icon": "robot.png"
    }

def test_get_chat_config_not_found(test_client, mock_db_session):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[validate_tenant_api_key] = override_auth
    
    mock_db_session.execute.return_value.fetchone.return_value = None
    response = test_client.get("/chat/config?company_id=123", headers={"x-api-key": "dummy"})
    assert response.status_code == 404

@patch('api.routes.chat.embedding_service.generate_vector')
@patch('api.routes.chat.search_similar_products')
@patch('api.routes.chat.generate_rag_response')
def test_chat_interaction_success(mock_generate_rag, mock_search, mock_embed, test_client, mock_db_session):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[validate_tenant_api_key] = override_auth
    
    # 1. Company info, 2. Global Prompt
    mock_db_session.execute.return_value.fetchone.side_effect = [
        ("Vendes zapatos", "llama3-8b-8192"), 
        ("Eres experto.",)
    ]
    # 3. Chat history
    mock_db_session.execute.return_value.fetchall.return_value = [("user", "busco botas")]
    
    mock_embed.return_value = [0.1, 0.2]
    mock_search.return_value = [{"name": "Bota Negra", "price": 50}]
    mock_generate_rag.return_value = ("Claro, tengo botas.", 150)
    
    payload = {"session_id": "sess-1", "message": "tallas?", "company_id": "123"}
    response = test_client.post("/chat/", json=payload, headers={"x-api-key": "dummy"})
    
    assert response.status_code == 200
    assert response.json()["reply"] == "Claro, tengo botas."
    mock_db_session.commit.assert_called_once()

def test_chat_interaction_company_not_found(test_client, mock_db_session):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[validate_tenant_api_key] = override_auth
    
    mock_db_session.execute.return_value.fetchone.return_value = None
    
    payload = {"session_id": "sess-1", "message": "hola", "company_id": "invalid_id"}
    response = test_client.post("/chat/", json=payload, headers={"x-api-key": "dummy"})
    
    assert response.status_code == 404