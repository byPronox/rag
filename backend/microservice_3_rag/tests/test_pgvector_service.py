from unittest.mock import MagicMock
from services.pgvector_service import search_similar_products

def test_search_similar_products_mapping():
    """Valida que los registros crudos de PostgreSQL se mapeen bien a Diccionarios."""
    mock_db = MagicMock()
    # Simulamos lo que devuelve la consulta SQL (variant_id, sku, name, price, stock, category, img)
    mock_db.execute.return_value.fetchall.return_value = [
        (1, "SKU1", "Producto A", 15.50, 10, "Cat A", "url1.jpg"),
        (2, "SKU2", "Producto B", None, None, "Cat B", "url2.jpg") # Caso: sin precio/stock definido
    ]
    
    results = search_similar_products(mock_db, 99, [0.1, 0.2], "123")
    
    assert len(results) == 2
    assert results[0]["price"] == 15.50
    assert results[0]["stock"] == 10
    
    # Validamos el manejo de Nulos (None) del código
    assert results[1]["price"] == 0.0
    assert results[1]["stock"] == 0
    assert results[1]["name"] == "Producto B"