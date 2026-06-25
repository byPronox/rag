from unittest.mock import MagicMock, patch
from database.connection import get_db
from api.deps import get_current_user
from models.schema import AIModel

def test_get_user_companies(test_client, mock_db_session, mock_tenant_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_user] = lambda: mock_tenant_user
    
    company_mock = MagicMock()
    company_mock.platform = "odoo"
    company_mock.platform_company_id = "1"
    company_mock.company_name = "My Store"
    
    mock_db_session.query.return_value.filter.return_value.all.return_value = [company_mock]
    
    response = test_client.get("/user/companies")
    assert response.status_code == 200
    assert response.json()[0]["name"] == "My Store"

def test_get_user_config_success(test_client, mock_db_session, mock_tenant_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_user] = lambda: mock_tenant_user
    
    company_mock = MagicMock()
    company_mock.id = 1
    company_mock.platform_company_id = "comp_123"
    company_mock.selected_embedding_model = "all-MiniLM"
    company_mock.selected_llm_model = "llama-3"
    company_mock.welcome_message = "Hello"
    company_mock.system_prompt = "Prompt"
    company_mock.theme_color = "#fff"
    company_mock.chat_icon = "bot"
    company_mock.is_active = True
    
    mock_db_session.query.return_value.filter.return_value.first.return_value = company_mock
    
    response = test_client.get("/user/config/comp_123")
    
    assert response.status_code == 200
    assert response.json()["company_id"] == "comp_123"
    assert response.json()["theme_color"] == "#fff"

def test_get_user_config_not_found(test_client, mock_db_session, mock_tenant_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_user] = lambda: mock_tenant_user
    
    mock_db_session.query.return_value.filter.return_value.first.return_value = None
    
    response = test_client.get("/user/config/fake_comp")
    assert response.status_code == 404

def test_update_user_config(test_client, mock_db_session, mock_tenant_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_user] = lambda: mock_tenant_user
    
    company_mock = MagicMock()
    mock_db_session.query.return_value.filter.return_value.first.return_value = company_mock
    
    payload = {"theme_color": "#000000"}
    response = test_client.put("/user/config/1", json=payload)
    
    assert response.status_code == 200
    assert company_mock.theme_color == "#000000"
    mock_db_session.commit.assert_called_once()

def test_update_user_config_not_found(test_client, mock_db_session, mock_tenant_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_user] = lambda: mock_tenant_user
    
    mock_db_session.query.return_value.filter.return_value.first.return_value = None
    
    payload = {"theme_color": "#000"}
    response = test_client.put("/user/config/fake_comp", json=payload)
    
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

def test_get_user_active_models(test_client, mock_db_session, mock_tenant_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_user] = lambda: mock_tenant_user
    
    model_instance = AIModel(
        id="llama-3",
        name="LLaMA 3",
        provider="Groq",
        type="llm",
        is_active=True,
        description="Test description",
        context_window=8192,
        dimensions=None
    )
    
    mock_db_session.query.return_value.filter.return_value.all.return_value = [model_instance]
    
    response = test_client.get("/user/models")
    
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["id"] == "llama-3"

def test_get_user_products(test_client, mock_db_session, mock_tenant_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_user] = lambda: mock_tenant_user
    
    product_mock = MagicMock()
    product_mock.variant_id = 101
    product_mock.sku = "SKU-001"
    product_mock.display_name = "Test Product"
    product_mock.description = "Product description"
    product_mock.price_excluded = 10.0
    product_mock.price_included = 11.2
    product_mock.stock = 50
    product_mock.category = "Tech"
    product_mock.website_url = "http"
    product_mock.image_128_url = "img"
    product_mock.image_512_url = "img"
    product_mock.company_id = "comp_123"
    
    mock_db_session.query.return_value.filter.return_value.all.return_value = [product_mock]
    
    response = test_client.get("/user/products/comp_123")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["sku"] == "SKU-001"

def test_update_user_password_success(test_client, mock_db_session, mock_tenant_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_user] = lambda: mock_tenant_user
    
    payload = {
        "current_password": "old_password",
        "new_password": "new_password_123"
    }
    
    with patch('api.routes.user_routes.verify_password', return_value=True), \
         patch('api.routes.user_routes.get_password_hash', return_value="new_hash"):
         
        response = test_client.put("/user/settings/password", json=payload)
        
        assert response.status_code == 200
        assert mock_tenant_user.hashed_password == "new_hash"
        mock_db_session.commit.assert_called_once()

def test_update_user_password_wrong_current(test_client, mock_db_session, mock_tenant_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_user] = lambda: mock_tenant_user
    
    payload = {
        "current_password": "wrong_password",
        "new_password": "new_password_123"
    }
    
    with patch('api.routes.user_routes.verify_password', return_value=False):
        response = test_client.put("/user/settings/password", json=payload)
        
        assert response.status_code == 400
        assert "incorrect" in response.json()["detail"].lower()

def test_logout_all_devices(test_client, mock_db_session, mock_tenant_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_user] = lambda: mock_tenant_user
    
    initial_version = mock_tenant_user.token_version
    
    response = test_client.post("/user/settings/logout-all")
    
    assert response.status_code == 200
    assert mock_tenant_user.token_version == initial_version + 1
    mock_db_session.commit.assert_called_once()

def test_regenerate_user_api_key_success(test_client, mock_db_session, mock_tenant_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_user] = lambda: mock_tenant_user
    
    config_mock = MagicMock()
    config_mock.system_api_key = "old_key"
    mock_db_session.query.return_value.filter.return_value.first.return_value = config_mock
    
    response = test_client.post("/user/settings/api-key/regenerate")
    
    assert response.status_code == 200
    assert "api_key" in response.json()
    assert config_mock.system_api_key != "old_key"
    mock_db_session.commit.assert_called_once()

def test_regenerate_user_api_key_not_found(test_client, mock_db_session, mock_tenant_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_user] = lambda: mock_tenant_user
    
    mock_db_session.query.return_value.filter.return_value.first.return_value = None
    
    response = test_client.post("/user/settings/api-key/regenerate")
    
    assert response.status_code == 404
    assert "no encontrada" in response.json()["detail"].lower()