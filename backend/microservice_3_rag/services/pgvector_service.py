"""Recuperación de candidatos (semántica + léxica) en pgvector y ranking final.
La misma función sirve a la búsqueda y al chat; solo cambian los parámetros de RankingParams."""
from sqlalchemy import text

from config.settings import settings
from services.ranking import RankingParams, rank_products
from services.text_utils import content_tokens

# Quita tildes en SQL sin depender de la extensión unaccent (mismo largo en ambas cadenas).
_ACCENTED = "áàäâéèëêíìïîóòöôúùüûñ"
_PLAIN = "aaaaeeeeiiiioooouuuun"
_LEGACY_HAYSTACK = (f"translate(lower(coalesce(display_name, '') || ' ' || coalesce(category, '')), "
                    f"'{_ACCENTED}', '{_PLAIN}')")

# Se detecta una vez si la migración 004 está aplicada (keywords + search_text + pg_trgm), así MS3
# funciona igual antes y después de aplicarla.
_schema_features = None


def schema_features(db):
    global _schema_features  # pylint: disable=global-statement
    if _schema_features is None:
        columns, trigram = db.execute(text("""
            SELECT
              (SELECT count(*) FROM information_schema.columns
               WHERE table_name = 'product_embeddings' AND column_name IN ('search_text', 'search_keywords')),
              (SELECT count(*) FROM pg_extension WHERE extname = 'pg_trgm')
        """)).fetchone()
        _schema_features = {"keywords": columns == 2, "trigram": columns == 2 and trigram == 1}
    return _schema_features


def _params(min_similarity, relative_margin, limit):
    return RankingParams(
        min_similarity=min_similarity,
        relative_margin=relative_margin,
        limit=limit,
        name_weight=settings.SEARCH_NAME_WEIGHT,
        category_weight=settings.SEARCH_CATEGORY_WEIGHT,
        keyword_weight=settings.SEARCH_KEYWORD_WEIGHT,
        out_of_stock_penalty=settings.SEARCH_OUT_OF_STOCK_PENALTY,
    )


def search_params():
    return _params(settings.SEARCH_MIN_SIMILARITY, settings.SEARCH_RELATIVE_MARGIN, settings.SEARCH_DEFAULT_LIMIT)


def chat_params():
    return _params(settings.CHAT_MIN_SIMILARITY, settings.CHAT_RELATIVE_MARGIN, settings.CHAT_MAX_PRODUCTS)


def _build_filters(filters):
    """Solo fragmentos fijos; los valores van como parámetros enlazados."""
    clauses, values = [], {}
    if filters.get("category"):
        clauses.append("lower(category) = lower(:category)")
        values["category"] = filters["category"]
    if filters.get("min_price") is not None:
        clauses.append("price_included >= :min_price")
        values["min_price"] = filters["min_price"]
    if filters.get("max_price") is not None:
        clauses.append("price_included <= :max_price")
        values["max_price"] = filters["max_price"]
    if filters.get("in_stock_only"):
        clauses.append("stock > 0")
    return "".join(f" AND {c}" for c in clauses), values


def _lexical_condition(features, has_fuzzy_tokens):
    """Coincidencia por palabra (LIKE) y, con pg_trgm, por similitud de trigramas para errores de tipeo."""
    if not features["keywords"]:
        return f"{_LEGACY_HAYSTACK} LIKE ANY(CAST(:patterns AS text[]))"
    condition = "search_text LIKE ANY(CAST(:patterns AS text[]))"
    if features["trigram"] and has_fuzzy_tokens:
        condition = (f"({condition} OR EXISTS (SELECT 1 FROM unnest(CAST(:fuzzy_tokens AS text[])) AS q(token) "
                     f"WHERE word_similarity(q.token, search_text) >= :fuzzy_threshold))")
    return condition


def fetch_candidates(db, user_id, company_id, query, query_vector, filters=None, candidates=None):
    """Los N más cercanos por vector + los que contienen palabras de la consulta en nombre, categoría o
    keywords. Incluye los productos 'global' y solo vectores del modelo actual (evita mezclar espacios)."""
    features = schema_features(db)
    extra_where, values = _build_filters(filters or {})
    where = ("user_id = :user_id AND company_id IN (:company_id, 'global') "
             "AND embedding_model = :embedding_model AND embedding IS NOT NULL" + extra_where)
    tokens = content_tokens(query)
    patterns = [f"%{token}%" for token in tokens if len(token) >= 3]
    fuzzy_tokens = [token for token in tokens if len(token) >= 4]

    keywords_column = "search_keywords" if features["keywords"] else "CAST(NULL AS text[])"
    columns = f"""
        variant_id, template_id, sku, display_name, description, price_included, currency, stock,
        category, website_url, image_512_url, company_id, {keywords_column},
        1 - (embedding <=> CAST(:vector AS vector)) AS similarity
    """
    sql = (f"(SELECT {columns} FROM product_embeddings WHERE {where} "
           f"ORDER BY embedding <=> CAST(:vector AS vector) LIMIT :candidates)")
    if patterns:
        sql += (f" UNION (SELECT {columns} FROM product_embeddings WHERE {where} "
                f"AND {_lexical_condition(features, bool(fuzzy_tokens))} LIMIT :candidates)")

    rows = db.execute(text(sql), {
        "user_id": user_id,
        "company_id": company_id,
        "embedding_model": settings.EMBEDDING_MODEL,
        "vector": str(list(query_vector)),
        "candidates": candidates or settings.SEARCH_CANDIDATES,
        "patterns": patterns,
        "fuzzy_tokens": fuzzy_tokens,
        "fuzzy_threshold": settings.SEARCH_FUZZY_THRESHOLD,
        **values,
    }).fetchall()

    return [{
        "variant_id": row[0],
        "template_id": row[1],
        "sku": row[2],
        "name": row[3],
        "description": row[4],
        "price": float(row[5]) if row[5] is not None else 0.0,
        "currency": row[6],
        "stock": float(row[7]) if row[7] is not None else 0.0,
        "category": row[8],
        "url": row[9],
        "image_url": row[10],
        "company_id": row[11],
        "keywords": list(row[12] or []),
        "similarity": float(row[13]),
    } for row in rows]


def search_products(db, user_id, company_id, query, query_vector, params, filters=None):
    candidates = fetch_candidates(db, user_id, company_id, query, query_vector, filters)
    return rank_products(query, candidates, params)


def public_product(product):
    """Campos que se exponen al widget/panel (sin descripción, keywords ni datos internos)."""
    return {
        "variant_id": product["variant_id"],
        "sku": product.get("sku"),
        "name": product["name"],
        "price": product.get("price", 0.0),
        "currency": product.get("currency"),
        "stock": product.get("stock", 0.0),
        "in_stock": (product.get("stock") or 0) > 0,
        "category": product.get("category"),
        "image_url": product.get("image_url"),
        "url": product.get("url"),
        "score": product.get("score"),
        "similarity": product.get("similarity"),
    }


def company_categories(db, user_id, company_id, limit=30):
    """Categorías con stock de la compañía: le permiten al asistente sugerir qué vende la tienda."""
    rows = db.execute(text("""
        SELECT category FROM product_embeddings
        WHERE user_id = :user_id AND company_id IN (:company_id, 'global')
          AND category IS NOT NULL AND category <> '' AND stock > 0
        GROUP BY category ORDER BY count(*) DESC LIMIT :limit
    """), {"user_id": user_id, "company_id": company_id, "limit": limit}).fetchall()
    return [row[0] for row in rows]
