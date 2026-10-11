import os
import importlib
from unittest.mock import patch


def reload_settings(env):
    with patch.dict(os.environ, env, clear=True):
        import config.settings
        importlib.reload(config.settings)
        return config.settings.settings


def test_settings_postgres_replacement():
    settings = reload_settings({
        "DATABASE_URL": "postgres://user:pass@localhost:5432/db",
        "FRONTEND_URLS": "http://localhost:3000, https://mi-saas.com, ",
        "GROQ_API_KEY": "test_key",
    })
    assert settings.DATABASE_URL == "postgresql://user:pass@localhost:5432/db"
    assert settings.FRONTEND_URLS == ["http://localhost:3000", "https://mi-saas.com"]
    assert settings.GROQ_API_KEY == "test_key"


def test_settings_defaults():
    settings = reload_settings({"DATABASE_URL": "postgresql://user:pass@localhost/db"})
    assert settings.DATABASE_URL == "postgresql://user:pass@localhost/db"
    assert settings.FRONTEND_URLS == []
    assert settings.GROQ_API_KEY == ""
    assert settings.EMBEDDING_MODEL == "paraphrase-multilingual-MiniLM-L12-v2"
    assert settings.SEARCH_MIN_SIMILARITY == 0.35 and settings.SEARCH_RELATIVE_MARGIN == 0.10
    assert settings.CHAT_MIN_SIMILARITY == 0.35 and settings.CHAT_MAX_PRODUCTS == 5
    assert settings.DEFAULT_LLM_MODEL == "openai/gpt-oss-20b"


def test_settings_overrides_from_env():
    settings = reload_settings({"DATABASE_URL": "postgresql://x/db", "SEARCH_MIN_SIMILARITY": "0.4",
                                "CHAT_MAX_PRODUCTS": "3"})
    assert settings.SEARCH_MIN_SIMILARITY == 0.4
    assert settings.CHAT_MAX_PRODUCTS == 3
