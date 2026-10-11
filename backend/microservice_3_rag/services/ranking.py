"""Ranking híbrido (semántico + léxico) sin acceso a BD: recibe candidatos ya recuperados y decide
cuáles se devuelven y en qué orden. Al ser puro se puede evaluar offline y probar sin Postgres."""
from dataclasses import dataclass

from services.text_utils import content_tokens, tokens_match


@dataclass(frozen=True)
class RankingParams:
    min_similarity: float          # piso de similitud coseno para aceptar un producto solo por semántica
    relative_margin: float         # además, su similitud no puede quedar a más de este margen de la mejor
    limit: int
    name_weight: float = 0.30      # bono si las palabras de la consulta aparecen en el nombre
    category_weight: float = 0.10  # bono si la consulta nombra la categoría (ej. "tecnologia")
    keyword_weight: float = 0.30   # bono si aparecen en las keywords (sinónimos/traducciones del LLM)
    out_of_stock_penalty: float = 0.05
    strong_ratio: float = 0.6      # si nombre, categoría o keywords cubren esta fracción, se acepta siempre
    fuzzy: bool = True             # tolera errores de tipeo ("audifnos", "cosina")


def coverage(query_tokens, text_tokens, fuzzy=False):
    """Fracción de las palabras de la consulta que aparecen en el texto (0..1)."""
    if not query_tokens or not text_tokens:
        return 0.0
    hits = sum(1 for q in query_tokens if any(tokens_match(q, t, fuzzy) for t in text_tokens))
    return hits / len(query_tokens)


def rank_products(query, candidates, params):
    """candidates: dicts con similarity, name, category, keywords, stock, template_id, variant_id.
    Devuelve los aceptados (con 'score' y 'similarity'), una variante por plantilla, ordenados."""
    if not candidates:
        return []
    query_tokens = content_tokens(query)
    semantic_floor = max(params.min_similarity,
                         max(float(p["similarity"]) for p in candidates) - params.relative_margin)
    scored = []
    for product in candidates:
        similarity = float(product["similarity"])
        name_ratio = coverage(query_tokens, content_tokens(product.get("name")), params.fuzzy)
        category_ratio = coverage(query_tokens, content_tokens(product.get("category")), params.fuzzy)
        keyword_ratio = coverage(query_tokens, content_tokens(" ".join(product.get("keywords") or [])),
                                 params.fuzzy)
        # Una palabra suelta ("pets", "recargable") no basta: nombre, categoría o keywords deben cubrir
        # la mayor parte de la consulta ("tecnologia", "cama para mi perro", "basurero").
        strong_lexical = max(name_ratio, category_ratio, keyword_ratio) >= params.strong_ratio
        if similarity < semantic_floor and not strong_lexical:
            continue
        # Bono cuadrático: coincidir con toda la consulta pesa mucho; con una palabra de cuatro, casi nada.
        score = (similarity + params.name_weight * name_ratio ** 2
                 + params.category_weight * category_ratio ** 2 + params.keyword_weight * keyword_ratio ** 2)
        if (product.get("stock") or 0) <= 0:
            score -= params.out_of_stock_penalty
        scored.append({**product, "similarity": round(similarity, 4), "score": round(score, 4)})

    if not scored:
        return []

    # Una sola variante por plantilla: la de mejor puntaje (con stock gana en caso de empate).
    def preference(p):
        return p["score"], p.get("stock") or 0

    best_by_template = {}
    for product in scored:
        key = product.get("template_id") or f"variant-{product['variant_id']}"
        current = best_by_template.get(key)
        if current is None or preference(product) > preference(current):
            best_by_template[key] = product

    ranked = sorted(best_by_template.values(), key=lambda p: p["score"], reverse=True)
    return ranked[:params.limit]
