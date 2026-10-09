import os


def _normalize_db_url(raw):
    """Railway/Heroku entregan 'postgres://', pero psycopg2/SQLAlchemy esperan 'postgresql://'."""
    if raw and raw.startswith("postgres://"):
        return raw.replace("postgres://", "postgresql://", 1)
    return raw


class Config:
    # --- Infraestructura ---
    RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://localhost:5672")
    DATABASE_URL = _normalize_db_url(os.getenv("DATABASE_URL"))

    # --- Colas ---
    QUEUE_NAME = os.getenv("RABBITMQ_QUEUE") or "rag_products_queue"
    RETRY_QUEUE_NAME = os.getenv("RABBITMQ_RETRY_QUEUE") or f"{QUEUE_NAME}.retry"
    PARKING_QUEUE_NAME = os.getenv("RABBITMQ_PARKING_QUEUE") or f"{QUEUE_NAME}.parking"
    RETRY_DELAY_MS = int(os.getenv("RABBITMQ_RETRY_DELAY_MS", "15000"))
    MAX_RETRIES = int(os.getenv("SYNC_MAX_RETRIES", "3"))
    PREFETCH_COUNT = int(os.getenv("RABBITMQ_PREFETCH", "1"))

    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    EMBED_TEXT_VERSION = os.getenv("EMBED_TEXT_VERSION", "v1")

    ALLOW_PRIVATE_WEBHOOKS = os.getenv("ALLOW_PRIVATE_WEBHOOKS", "false").lower() == "true"

    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")