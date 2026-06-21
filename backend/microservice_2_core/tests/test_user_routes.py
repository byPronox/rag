from unittest.mock import MagicMock, patch
from database.connection import get_db
from api.deps import get_current_user

def test_get_user_companies(test_client, mock_db_session, mock_tenant_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_user] = lambda: mock_tenant_user
    
    company_mock = MagicMock()
    company_mock.platform = "odoo"
    company_mock.platform_company_id = "1"
    company_mock.company_name = "Mi Tienda"
    
    mock_db_session.query.return_value.filter.return_value.all.return_value = [company_mock]
    
    response = test_client.get("/user/companies")
    assert response.status_code == 200
    assert response.json()[0]["name"] == "Mi Tienda"

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

def test_get_dashboard_metrics(test_client, mock_db_session, mock_tenant_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_user] = lambda: mock_tenant_user
    
    # Mockear todos los scalar() para devolver números
    mock_query = mock_db_session.query.return_value.filter.return_value
    mock_query.scalar.side_effect = [150, 25, 10, 5000] # products, chats, searches, tokens
    
    # Mockear las listas vacías para la actividad reciente
    mock_query.order_by.return_value.limit.return_value.all.return_value = []
    
    response = test_client.get("/user/dashboard-metrics/1")
    assert response.status_code == 200
    
    data = response.json()
    assert data["total_products"] == 150
    assert data["total_chats"] == 25