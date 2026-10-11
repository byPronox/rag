"""Generación de palabras clave de búsqueda con el LLM de Groq (document expansion).
Se piden varios productos por llamada para gastar pocas peticiones del plan gratuito."""
import json
import logging
import re

from groq import Groq, RateLimitError

from config.settings import Config

log = logging.getLogger("sync.keywords")

PROMPT = """You improve an e-commerce search engine. Customers search with their own words, which are \
often different from the product name. For EACH product, give the OTHER names people use for its \
generic type.

For each product return:
- "synonyms_es": up to 8 different Spanish names for the same type of product, including regional words \
used in Latin America (Mexico, Colombia, Ecuador, Peru, Argentina, Chile, Venezuela, Caribbean).
- "synonyms_en": up to 5 different English names for the same type of product.
- "uses": up to 3 very short phrases (2-4 words, in the language of the product name) describing what \
the customer needs it for.

Rules:
- Each item must be a genuinely DIFFERENT word, not the product name with extra words.
- No sizes, capacities, colors, materials, specs, model numbers, country names or marketing words.
- Only brands that appear in the product name or description.
- If a product has no common synonyms, return fewer items. Never invent unrelated product types.

Example for "Cubo de basura con pedal 12L":
{{"id": "0", "synonyms_es": ["basurero", "caneca de basura", "papelera", "tacho de basura", "bote de basura", \
"zafacón", "cesto de basura", "tarro de basura"], "synonyms_en": ["trash can", "garbage bin", "waste bin", \
"dustbin"], "uses": ["tirar la basura", "basura de cocina"]}}

Return only JSON: {{"products": [{{"id": "...", "synonyms_es": [], "synonyms_en": [], "uses": []}}]}}

Products:
{products}"""


class KeywordsRateLimited(Exception):
    """Groq respondió 429: hay que esperar al siguiente ciclo (no cuenta como intento fallido)."""


class KeywordsUnavailable(Exception):
    """El LLM no respondió o devolvió algo que no se pudo interpretar."""


def clean_keywords(raw, product_name, limit=None):
    """Normaliza y filtra: sin duplicados, sin el propio nombre, frases cortas, máximo `limit`."""
    limit = limit or Config.KEYWORDS_MAX_PER_PRODUCT
    seen, result = set(), []
    name = (product_name or "").strip().lower()
    for item in raw if isinstance(raw, list) else []:
        if not isinstance(item, str):
            continue
        kw = re.sub(r"\s+", " ", item.strip().lower().strip(".,;:\"'"))
        if not kw or len(kw) > 40 or len(kw.split()) > 4 or kw.isdigit() or kw in seen or kw == name:
            continue
        seen.add(kw)
        result.append(kw)
    return result[:limit]


def _format_products(products):
    lines = []
    for i, p in enumerate(products):
        lines.append(json.dumps({"id": str(i), "name": p["name"], "category": p.get("category") or "",
                                 "description": p.get("description") or ""}, ensure_ascii=False))
    return "\n".join(lines)


def generate_keywords_batch(products, api_key):
    """products: [{name, category, description}]. Devuelve {índice: [keywords]} solo para los que el
    modelo respondió. Lanza KeywordsRateLimited o KeywordsUnavailable."""
    client = Groq(api_key=api_key, timeout=Config.KEYWORDS_TIMEOUT_SECONDS, max_retries=0)
    kwargs = {}
    if Config.KEYWORDS_LLM_MODEL.startswith("openai/gpt-oss"):
        kwargs["extra_body"] = {"reasoning_effort": "low", "include_reasoning": False}
    try:
        completion = client.chat.completions.create(
            model=Config.KEYWORDS_LLM_MODEL,
            temperature=0.2,
            max_tokens=400 * len(products) + 200,
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": PROMPT.format(products=_format_products(products))}],
            **kwargs,
        )
    except RateLimitError as exc:
        raise KeywordsRateLimited(str(exc)) from exc
    except Exception as exc:  # pylint: disable=broad-except
        raise KeywordsUnavailable(f"{type(exc).__name__}: {exc}") from exc

    try:
        items = json.loads(completion.choices[0].message.content or "{}").get("products") or []
    except (ValueError, AttributeError) as exc:
        raise KeywordsUnavailable(f"Invalid JSON from LLM: {exc}") from exc

    result = {}
    for item in items if isinstance(items, list) else []:
        if not isinstance(item, dict) or not str(item.get("id", "")).isdigit():
            continue
        index = int(item["id"])
        if 0 <= index < len(products):
            merged = [kw for key in ("synonyms_es", "synonyms_en", "uses") for kw in (item.get(key) or [])]
            keywords = clean_keywords(merged, products[index]["name"])
            if keywords:
                result[index] = keywords
    return result
