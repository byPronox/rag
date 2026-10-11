import os


def _float(name, default):
    return float(os.getenv(name, default))


def _int(name, default):
    return int(os.getenv(name, default))


class Settings:
    _raw_db_url = os.getenv("DATABASE_URL")
    if _raw_db_url.startswith("postgres://"):
        DATABASE_URL = _raw_db_url.replace("postgres://", "postgresql://", 1)
    else:
        DATABASE_URL = _raw_db_url

    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    # Debe ser el mismo modelo que usa MS1 para vectorizar el catálogo.
    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "paraphrase-multilingual-MiniLM-L12-v2")

    urls_crudas = os.getenv("FRONTEND_URLS", "")
    FRONTEND_URLS = [url.strip() for url in urls_crudas.split(",") if url.strip()]

    # Búsqueda (calibrado con el set de evaluación, experimento E4)
    SEARCH_MIN_SIMILARITY = _float("SEARCH_MIN_SIMILARITY", "0.35")
    SEARCH_RELATIVE_MARGIN = _float("SEARCH_RELATIVE_MARGIN", "0.10")
    SEARCH_DEFAULT_LIMIT = _int("SEARCH_DEFAULT_LIMIT", "5")
    SEARCH_MAX_LIMIT = _int("SEARCH_MAX_LIMIT", "20")
    SEARCH_CANDIDATES = _int("SEARCH_CANDIDATES", "50")
    SEARCH_NAME_WEIGHT = _float("SEARCH_NAME_WEIGHT", "0.30")
    SEARCH_CATEGORY_WEIGHT = _float("SEARCH_CATEGORY_WEIGHT", "0.10")
    SEARCH_KEYWORD_WEIGHT = _float("SEARCH_KEYWORD_WEIGHT", "0.30")
    SEARCH_OUT_OF_STOCK_PENALTY = _float("SEARCH_OUT_OF_STOCK_PENALTY", "0.05")
    # Similitud de trigramas (pg_trgm) para traer candidatos con errores de tipeo; el ranking los confirma.
    SEARCH_FUZZY_THRESHOLD = _float("SEARCH_FUZZY_THRESHOLD", "0.5")

    # Chat
    CHAT_MIN_SIMILARITY = _float("CHAT_MIN_SIMILARITY", "0.35")
    CHAT_RELATIVE_MARGIN = _float("CHAT_RELATIVE_MARGIN", "0.10")
    CHAT_MAX_PRODUCTS = _int("CHAT_MAX_PRODUCTS", "5")
    CHAT_HISTORY_MESSAGES = _int("CHAT_HISTORY_MESSAGES", "6")
    CHAT_DESCRIPTION_CHARS = _int("CHAT_DESCRIPTION_CHARS", "200")
    CHAT_DETAIL_DESCRIPTION_CHARS = _int("CHAT_DETAIL_DESCRIPTION_CHARS", "320")  # vista de detalle del widget
    CHAT_MAX_MESSAGE_CHARS = _int("CHAT_MAX_MESSAGE_CHARS", "1000")
    DEFAULT_LLM_MODEL = os.getenv("DEFAULT_LLM_MODEL", "openai/gpt-oss-20b")
    LLM_TEMPERATURE = _float("LLM_TEMPERATURE", "0.2")
    LLM_MAX_TOKENS = _int("LLM_MAX_TOKENS", "700")
    LLM_TIMEOUT_SECONDS = _float("LLM_TIMEOUT_SECONDS", "20")
    LLM_REASONING_EFFORT = os.getenv("LLM_REASONING_EFFORT", "low")
    CHAT_FALLBACK_MESSAGE = os.getenv(
        "CHAT_FALLBACK_MESSAGE",
        "Lo siento, en este momento no puedo responder. Por favor intenta de nuevo en unos minutos.",
    )
    CHAT_BLOCKED_MESSAGE = os.getenv(
        "CHAT_BLOCKED_MESSAGE",
        "Solo puedo ayudarte con preguntas sobre los productos de la tienda. ¿Qué estás buscando?",
    )


settings = Settings()
