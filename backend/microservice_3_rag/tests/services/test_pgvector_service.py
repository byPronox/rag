from unittest.mock import MagicMock, patch

import pytest

import services.pgvector_service as pgs
from services.pgvector_service import (
    chat_params, company_categories, fetch_candidates, public_product, schema_features, search_params,
    search_products,
)

ROW = (1, 50, "SKU1", "Audífonos Pro", "desc", 15.5, "COP", 10, "Tecnologia", "https://p/1", "img.jpg", "7",
       ["auriculares"], 0.61)
WITH_004 = {"keywords": True, "trigram": True}
WITHOUT_004 = {"keywords": False, "trigram": False}


@pytest.fixture(autouse=True)
def reset_features():
    pgs._schema_features = None
    yield
    pgs._schema_features = None


def run_fetch(query="audifonos", filters=None, rows=(ROW,), features=WITH_004):
    pgs._schema_features = features
    db = MagicMock()
    db.execute.return_value.fetchall.return_value = list(rows)
    result = fetch_candidates(db, 3, "7", query, [0.1, 0.2], filters)
    statement, params = db.execute.call_args.args
    return result, str(statement), params


def test_fetch_maps_rows():
    empty = (2, None, None, "B", None, None, None, None, None, None, None, "global", None, 0.4)
    result, _, _ = run_fetch(rows=[ROW, empty])
    assert result[0]["name"] == "Audífonos Pro" and result[0]["keywords"] == ["auriculares"]
    assert result[0]["price"] == 15.5 and result[0]["stock"] == 10.0 and result[0]["similarity"] == 0.61
    assert result[1]["price"] == 0.0 and result[1]["stock"] == 0.0 and result[1]["keywords"] == []


def test_regression_filters_by_embedding_model_and_includes_global():
    # Defecto: MS3 comparaba vectores de otro modelo y no veía los productos compartidos ('global').
    _, sql, params = run_fetch()
    assert "embedding_model = :embedding_model" in sql
    assert "company_id IN (:company_id, 'global')" in sql
    assert params["embedding_model"] == "paraphrase-multilingual-MiniLM-L12-v2"


def test_lexical_branch_uses_search_text_keywords_and_trigrams():
    _, sql, params = run_fetch("Busco Audífonos para mi gato")
    assert "search_keywords" in sql
    assert "search_text LIKE ANY" in sql and "word_similarity(q.token, search_text)" in sql
    assert params["patterns"] == ["%audifono%", "%gato%"]
    assert params["fuzzy_tokens"] == ["audifono", "gato"]
    assert params["fuzzy_threshold"] == 0.5


def test_short_tokens_skip_trigram_condition():
    _, sql, _ = run_fetch("gps")
    assert "LIKE ANY" in sql and "word_similarity" not in sql


def test_works_before_migration_004():
    _, sql, _ = run_fetch("audifonos", features=WITHOUT_004)
    assert "CAST(NULL AS text[])" in sql and "search_text" not in sql and "translate(lower" in sql


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


@pytest.mark.parametrize("counts, expected", [
    ((2, 1), WITH_004), ((2, 0), {"keywords": True, "trigram": False}), ((0, 1), WITHOUT_004)])
def test_schema_features_detection_is_cached(counts, expected):
    db = MagicMock()
    db.execute.return_value.fetchone.return_value = counts
    assert schema_features(db) == expected
    assert schema_features(db) == expected
    db.execute.assert_called_once()


@patch("services.pgvector_service.fetch_candidates")
def test_search_products_ranks_candidates(mock_fetch):
    mock_fetch.return_value = [
        {"variant_id": 1, "template_id": 1, "name": "Audífonos Pro", "category": "Tecnologia", "stock": 5,
         "similarity": 0.6, "keywords": []},
        {"variant_id": 2, "template_id": 2, "name": "Cama", "category": "Mascotas", "stock": 5,
         "similarity": 0.2, "keywords": []},
    ]
    result = search_products(MagicMock(), 3, "7", "audifonos", [0.1], search_params())
    assert [p["variant_id"] for p in result] == [1]


def test_params_come_from_settings():
    params = search_params()
    assert params.min_similarity == 0.35 and params.keyword_weight == 0.30 and params.name_weight == 0.30
    assert chat_params().limit == 5


def test_public_product_hides_internal_fields():
    data = public_product({"variant_id": 1, "name": "A", "description": "x", "keywords": ["k"], "stock": 0})
    assert "description" not in data and "keywords" not in data
    assert data["in_stock"] is False and data["price"] == 0.0


def test_company_categories():
    db = MagicMock()
    db.execute.return_value.fetchall.return_value = [("Tecnologia",), ("Cocina",)]
    assert company_categories(db, 3, "7") == ["Tecnologia", "Cocina"]
