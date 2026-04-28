import os

class Settings:
    _raw_db_url = os.getenv("DATABASE_URL")
    
    if _raw_db_url.startswith("postgres://"):
        DATABASE_URL = _raw_db_url.replace("postgres://", "postgresql://", 1)
    else:
        DATABASE_URL = _raw_db_url

    SECRET_KEY = os.getenv("SECRET_KEY")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 1440
    FRONTEND_URLS = os.getenv("FRONTEND_URLS")

settings = Settings()