import os

class Config:
    RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://localhost:5672")
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/db")
    QUEUE_NAME = os.getenv("RABBITMQ_QUEUE", "rag_products_queue")
    EMBEDDING_MODEL = "all-MiniLM-L6-v2"