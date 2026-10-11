from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

import api.routes.search as search_module
from api.deps import validate_tenant_api_key
from database.connection import get_db

RESULT = {"variant_id": 1, "template_id": 1, "sku": "S1", "name": "Teclado Mecánico", "price": 100.0,
          "currency": "USD", "stock": 3.0, "category": "Tecnologia", "image_url": None, "url": None,
          "score": 0.71, "similarity": 0.61, "description": "interna"}


@pytest.fixture(autouse=True)
def setup(test_client, mock_db_session):
    test_client.app.dependency_overrides[get_db] = lambda: mock_db_session
    test_client.app.dependency_overrides[validate_tenant_api_key] = lambda: {"user_id": 99, "groq_api_key": "k"}
    search_module._history_has_metrics = None
    with patch("api.routes.search.get_active_company") as company, \
         patch("api.routes.search.embedding_service.generate_vector", return_value=[0.5, 0.5]), \
         patch("api.routes.search.search_products") as search:
        company.return_value = {}
        search.return_value = [RESULT]
        yield {"company": company, "search": search}


def post(client, **payload):
    body = {"query": "teclado rgb", "company_id": "123", "session_id": "sess-1", **payload}
    return client.post("/search/", json=body, headers={"x-api-key": "dummy"})


def test_search_success_keeps_widget_contract(test_client, mock_db_session):
    mock_db_session.execute.return_value.scalar.return_value = 0
    response = post(test_client)
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 1 and data["query"] == "teclado rgb"
    item = data["results"][0]
    assert item["name"] == "Teclado Mecánico" and item["price"] == 100.0 and "image_url" in item
    assert "description" not in item
    mock_db_session.commit.assert_called_once()


def test_search_passes_filters_and_caps_limit(test_client, setup):
    post(test_client, limit=500, category="Tecnologia", min_price=1, max_price=9, in_stock_only=True)
    args, kwargs = setup["search"].call_args
    assert args[5].limit == 20
    assert kwargs["filters"] == {"category": "Tecnologia", "min_price": 1.0, "max_price": 9.0, "in_stock_only": True}


def test_history_with_metrics_when_migration_applied(test_client, mock_db_session):
    mock_db_session.execute.return_value.scalar.return_value = 3
    post(test_client)
    insert_sql = str(mock_db_session.execute.call_args_list[-1].args[0])
    params = mock_db_session.execute.call_args_list[-1].args[1]
    assert "results_count" in insert_sql
    assert params["count"] == 1 and params["top"] == 0.61 and params["lat"] >= 0


def test_history_without_metrics_before_migration(test_client, mock_db_session):
    mock_db_session.execute.return_value.scalar.return_value = 0
    post(test_client)
    assert "results_count" not in str(mock_db_session.execute.call_args_list[-1].args[0])


def test_history_failure_does_not_break_search(test_client, mock_db_session):
    mock_db_session.execute.side_effect = Exception("db down")
    response = post(test_client)
    assert response.status_code == 200
    mock_db_session.rollback.assert_called_once()


def test_blank_query_returns_empty_without_embedding(test_client, mock_db_session, setup):
    mock_db_session.execute.return_value.scalar.return_value = 0
    response = post(test_client, query="   ")
    assert response.json()["count"] == 0
    setup["search"].assert_not_called()


def test_inactive_company_returns_404(test_client, setup):
    setup["company"].side_effect = HTTPException(status_code=404, detail="Company configuration not found")
    assert post(test_client).status_code == 404


def test_invalid_payload(test_client):
    assert post(test_client, query="").status_code == 422
    assert post(test_client, min_price=-1).status_code == 422


def test_supports_metrics_is_cached():
    db = MagicMock()
    db.execute.return_value.scalar.return_value = 3
    assert search_module._supports_metrics(db) is True
    assert search_module._supports_metrics(db) is True
    db.execute.assert_called_once()
