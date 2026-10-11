from services.ranking import RankingParams, coverage, rank_products
from services.text_utils import content_tokens

PARAMS = RankingParams(min_similarity=0.35, relative_margin=0.10, limit=5)


def product(variant_id, similarity, name="Producto", category="Varios", stock=10, template_id=None):
    return {"variant_id": variant_id, "template_id": template_id or variant_id, "name": name,
            "category": category, "stock": stock, "similarity": similarity}


def ids(results):
    return [p["variant_id"] for p in results]


def test_empty_candidates():
    assert rank_products("audifonos", [], PARAMS) == []


def test_regression_no_relevant_product_returns_empty():
    # Defecto: la búsqueda siempre devolvía 5 productos aunque ninguno fuera relevante ("bicicleta").
    candidates = [product(1, 0.28, "Hyundai Audifonos"), product(2, 0.25, "Cama para perros")]
    assert rank_products("bicicleta", candidates, PARAMS) == []


def test_regression_relative_margin_drops_tail_noise():
    # Defecto: después de los audífonos aparecían camas y areneros de relleno.
    candidates = [product(1, 0.50, "Hyundai Audifonos"), product(2, 0.46, "Redmi Buds"),
                  product(3, 0.36, "Cama ortopédica"), product(4, 0.36, "Arenero inteligente")]
    assert ids(rank_products("musica portatil", candidates, PARAMS)) == [1, 2]


def test_regression_one_variant_per_template():
    # Defecto: 4 variantes del mismo arnés ocupaban todo el top 5.
    candidates = [product(10 + i, 0.60, f"Arnés (talla {i})", template_id=99) for i in range(4)]
    candidates.append(product(20, 0.55, "Linterna dispensador"))
    assert ids(rank_products("pasear al perro de noche", candidates, PARAMS)) == [10, 20]


def test_dedupe_prefers_variant_with_stock():
    candidates = [product(1, 0.60, "Cama (Verde)", stock=0, template_id=7),
                  product(2, 0.60, "Cama (Gris)", stock=5, template_id=7)]
    assert ids(rank_products("cama", candidates, PARAMS)) == [2]


def test_category_query_accepts_products_below_semantic_floor():
    # "tecnologia": los productos de esa categoría entran aunque su similitud sea baja.
    candidates = [product(1, 0.42, "Batería externa", "Tecnologia"), product(2, 0.36, "Escurridor", "Cocina"),
                  product(3, 0.30, "Trípode Selfie", "Tecnologia"), product(4, 0.20, "Labial", "Belleza")]
    assert ids(rank_products("tecnologia", candidates, PARAMS)) == [1, 3, 2]


def test_regression_single_generic_word_does_not_force_match():
    # Defecto: en "calming treats for anxious pets", la palabra "pets" subía "Pet Training Pads" al 1.er lugar.
    candidates = [product(1, 0.71, "ChillPaws Calm Bites", "Supplements"),
                  product(2, 0.62, "Pet Training Pads", "Pets"),
                  product(3, 0.20, "Pet Hydration Station", "Pets")]
    result = rank_products("calming treats for anxious pets", candidates, PARAMS)
    assert ids(result)[0] == 1
    assert 3 not in ids(result)


def test_name_match_boosts_ranking():
    candidates = [product(1, 0.70, "Set juegos para gatos", "Gatos"),
                  product(2, 0.66, "Poste rascador para gatos", "Gatos")]
    assert ids(rank_products("rascador para gato", candidates, PARAMS))[0] == 2


def test_out_of_stock_penalty():
    candidates = [product(1, 0.60, "Producto A", stock=0), product(2, 0.58, "Producto B", stock=3)]
    result = rank_products("producto", candidates, PARAMS)
    assert ids(result) == [2, 1]
    assert result[1]["score"] < result[1]["similarity"]


def test_limit_and_scores_are_rounded():
    candidates = [product(i, 0.60 - i * 0.001, f"Lampara {i}") for i in range(10)]
    result = rank_products("lampara", candidates, PARAMS)
    assert len(result) == 5
    assert all(isinstance(p["score"], float) for p in result)


def test_coverage():
    tokens = content_tokens("cama para mi perro")
    assert coverage(tokens, "Cama ortopédica para perros (Gris)") == 1.0
    assert coverage(tokens, "Set juegos para perros") == 0.5
    assert coverage([], "algo") == 0.0
