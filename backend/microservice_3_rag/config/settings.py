import os

class Settings:
    _raw_db_url = os.getenv("DATABASE_URL")
    if _raw_db_url.startswith("postgres://"):
        DATABASE_URL = _raw_db_url.replace("postgres://", "postgresql://", 1)
    else:
        DATABASE_URL = _raw_db_url
        
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    EMBEDDING_MODEL = "all-MiniLM-L6-v2"
    
    urls_crudas = os.getenv("FRONTEND_URLS", "")
    FRONTEND_URLS = [url.strip() for url in urls_crudas.split(",") if url.strip()]

settings = Settings()