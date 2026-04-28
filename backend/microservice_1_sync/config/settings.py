import os

class Config:
    RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://localhost:5672")
    
    _raw_db_url = os.getenv("DATABASE_URL")
    if _raw_db_url.startswith("postgres://"):
        DATABASE_URL = _raw_db_url.replace("postgres://", "postgresql://", 1)
    else:
        DATABASE_URL = _raw_db_url
    
    QUEUE_NAME = os.getenv("RABBITMQ_QUEUE") if os.getenv("RABBITMQ_QUEUE") else "rag_products_queue"
    
    # Modelo de Inteligencia Artificial
    EMBEDDING_MODEL = "all-MiniLM-L6-v2"