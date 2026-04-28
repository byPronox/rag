import os

class Config:
    RABBITMQ_URL = os.getenv("RABBITMQ_URL")
    DATABASE_URL = os.getenv("DATABASE_URL")
    QUEUE_NAME = os.getenv("RABBITMQ_QUEUE")
    EMBEDDING_MODEL = "all-MiniLM-L6-v2"