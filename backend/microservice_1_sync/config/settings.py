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
    # Base de datos caída: se reintenta sin gastar MAX_RETRIES (40 x 15 s = 10 min)
    INFRA_MAX_RETRIES = int(os.getenv("SYNC_INFRA_MAX_RETRIES", "40"))
    RECONCILE_GRACE_MINUTES = int(os.getenv("RECONCILE_GRACE_MINUTES", "10"))
    PREFETCH_COUNT = int(os.getenv("RABBITMQ_PREFETCH", "1"))

    # --- Modelo de IA (MS1 y MS3 deben usar el mismo) ---
    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    EMBED_TEXT_VERSION = os.getenv("EMBED_TEXT_VERSION", "v1")

    # --- Webhook hacia Odoo ---
    ALLOW_PRIVATE_WEBHOOKS = os.getenv("ALLOW_PRIVATE_WEBHOOKS", "false").lower() == "true"
    FEEDBACK_DEDUPE_SECONDS = int(os.getenv("FEEDBACK_DEDUPE_SECONDS", "600"))
    WEBHOOK_TIMEOUT_SECONDS = float(os.getenv("WEBHOOK_TIMEOUT_SECONDS", "3"))
    WEBHOOK_BREAKER_THRESHOLD = int(os.getenv("WEBHOOK_BREAKER_THRESHOLD", "5"))
    WEBHOOK_BREAKER_SECONDS = int(os.getenv("WEBHOOK_BREAKER_SECONDS", "60"))

    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")