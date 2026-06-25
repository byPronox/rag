from unittest.mock import patch
from database.connection import get_db
from api.deps import validate_tenant_api_key

def test_semantic_search_success(test_client, mock_db_session):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[validate_tenant_api_key] = lambda: {"user_id": 99, "groq_api_key": "k"}
    
    with patch('api.routes.search.embedding_service.generate_vector') as mock_embed, \
         patch('api.routes.search.search_similar_products') as mock_search:
        
        mock_embed.return_value = [0.5, 0.5, 0.5]
        mock_search.return_value = [{"name": "Teclado Mecánico", "price": 100}]
        
        payload = {"query": "teclado rgb", "company_id": "123", "session_id": "sess-1"}
        response = test_client.post("/search/", json=payload, headers={"x-api-key": "dummy"})
        
        assert response.status_code == 200
        assert response.json()["results"][0]["name"] == "Teclado Mecánico"
        mock_db_session.commit.assert_called_once()

def test_semantic_search_no_session_id(test_client, mock_db_session):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[validate_tenant_api_key] = lambda: {"user_id": 99, "groq_api_key": "k"}
    
    with patch('api.routes.search.embedding_service.generate_vector') as mock_embed, \
         patch('api.routes.search.search_similar_products') as mock_search:
        
        mock_embed.return_value = [0.1, 0.2]
        mock_search.return_value = [{"name": "Mouse", "price": 20}]
        
        payload = {"query": "mouse barato", "company_id": "123"}
        response = test_client.post("/search/", json=payload, headers={"x-api-key": "dummy"})
        
        assert response.status_code == 200
        assert len(response.json()["results"]) == 1
        mock_db_session.commit.assert_called_once()