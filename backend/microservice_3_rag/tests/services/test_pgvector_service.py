from unittest.mock import MagicMock, patch

from services.pgvector_service import (
    chat_params, company_categories, fetch_candidates, public_product, search_params, search_products,
)

ROW = (1, 50, "SKU1", "Audífonos Pro", "desc", 15.5, "COP", 10, "Tecnologia", "https://p/1", "img.jpg", "7", 0.61)


def run_fetch(query="audifonos", filters=None, rows=(ROW,)):
    db = MagicMock()
    db.execute.return_value.fetchall.return_value = list(rows)
    result = fetch_candidates(db, 3, "7", query, [0.1, 0.2], filters)
    statement, params = db.execute.call_args.args
    return result, str(statement), params


def test_fetch_maps_rows():
    result, _, _ = run_fetch(rows=[ROW, (2, None, None, "B", None, None, None, None, None, None, None, "global", 0.4)])
    assert result[0]["name"] == "Audífonos Pro"
    assert result[0]["price"] == 15.5 and result[0]["stock"] == 10.0 and result[0]["similarity"] == 0.61
    assert result[1]["price"] == 0.0 and result[1]["stock"] == 0.0


def test_regression_filters_by_embedding_model_and_includes_global():
    # Defecto: MS3 comparaba vectores de otro modelo y no veía los productos compartidos ('global').
    _, sql, params = run_fetch()
    assert "embedding_model = :embedding_model" in sql
    assert "company_id IN (:company_id, 'global')" in sql
    assert params["embedding_model"] == "paraphrase-multilingual-MiniLM-L12-v2"


def test_lexical_branch_uses_normalized_patterns():
    _, sql, params = run_fetch("Busco Audífonos para mi gato")
    assert "UNION" in sql and "LIKE ANY" in sql
    assert params["patterns"] == ["%audifono%", "%gato%"]


def test_no_lexical_branch_without_tokens():
    _, sql, _ = run_fetch("para mi")
    assert "UNION" not in sql


def test_filters_are_bound_parameters():
    _, sql, params = run_fetch(filters={"category": "Tecnologia", "min_price": 10, "max_price": 99,
                                        "in_stock_only": True})
    assert "lower(category) = lower(:category)" in sql
    assert "price_included >= :min_price" in sql and "price_included <= :max_price" in sql
    assert "stock > 0" in sql
    assert params["category"] == "Tecnologia" and params["min_price"] == 10 and params["max_price"] == 99


@patch("services.pgvector_service.fetch_candidates")
def test_search_products_ranks_candidates(mock_fetch):
    mock_fetch.return_value = [
        {"variant_id": 1, "template_id": 1, "name": "Audífonos Pro", "category": "Tecnologia", "stock": 5,
         "similarity": 0.6},
        {"variant_id": 2, "template_id": 2, "name": "Cama", "category": "Mascotas", "stock": 5, "similarity": 0.2},
    ]
    result = search_products(MagicMock(), 3, "7", "audifonos", [0.1], search_params())
    assert [p["variant_id"] for p in result] == [1]


def test_params_come_from_settings():
    assert search_params().min_similarity == 0.35
    assert chat_params().limit == 5


def test_public_product_hides_description():
    data = public_product({"variant_id": 1, "name": "A", "description": "secreto", "stock": 0, "score": 0.5})
    assert "description" not in data
    assert data["in_stock"] is False and data["price"] == 0.0


def test_company_categories():
    db = MagicMock()
    db.execute.return_value.fetchall.return_value = [("Tecnologia",), ("Cocina",)]
    assert company_categories(db, 3, "7") == ["Tecnologia", "Cocina"]
