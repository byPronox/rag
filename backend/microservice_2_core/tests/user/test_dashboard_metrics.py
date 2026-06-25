from unittest.mock import MagicMock
from database.connection import get_db
from api.deps import get_current_user

def test_get_dashboard_metrics(test_client, mock_db_session, mock_tenant_user):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[get_current_user] = lambda: mock_tenant_user
    
    mock_query = mock_db_session.query.return_value.filter.return_value
    # Simulating scalar returns for products, chats, searches, tokens
    mock_query.scalar.side_effect = [150, 25, 10, 5000]
    
    mock_query.order_by.return_value.limit.return_value.all.return_value = []
    
    response = test_client.get("/user/dashboard-metrics/1")
    assert response.status_code == 200
    
    data = response.json()
    assert data["total_products"] == 150
    assert data["total_chats"] == 25