import os
import importlib
from unittest.mock import patch

def test_settings_postgres_replacement():
    mock_env = {
        "DATABASE_URL": "postgres://user:pass@localhost:5432/db",
        "FRONTEND_URLS": "http://localhost:3000, https://mi-saas.com, ",
        "GROQ_API_KEY": "test_key"
    }
    with patch.dict(os.environ, mock_env, clear=True):
        import config.settings
        importlib.reload(config.settings)
        
        assert config.settings.settings.DATABASE_URL == "postgresql://user:pass@localhost:5432/db"
        assert config.settings.settings.FRONTEND_URLS == ["http://localhost:3000", "https://mi-saas.com"]
        assert config.settings.settings.GROQ_API_KEY == "test_key"

def test_settings_postgresql_no_replacement():
    mock_env = {
        "DATABASE_URL": "postgresql://user:pass@localhost/db",
        "FRONTEND_URLS": ""
    }
    with patch.dict(os.environ, mock_env, clear=True):
        import config.settings
        importlib.reload(config.settings)
        
        assert config.settings.settings.DATABASE_URL == "postgresql://user:pass@localhost/db"
        assert config.settings.settings.FRONTEND_URLS == []
        assert config.settings.settings.GROQ_API_KEY == ""