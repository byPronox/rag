import os
from importlib import reload
from unittest.mock import patch
import config.settings

def test_settings_postgres_replacement():
    """Prueba que el prefijo postgres:// se reemplaza por postgresql://"""
    with patch.dict(os.environ, {"DATABASE_URL": "postgres://user:pass@localhost/db"}):
        reload(config.settings)
        assert config.settings.Config.DATABASE_URL == "postgresql://user:pass@localhost/db"

def test_settings_postgresql_no_replacement():
    """Prueba que si ya usa postgresql:// (u otro), no lo altera incorrectamente"""
    with patch.dict(os.environ, {"DATABASE_URL": "postgresql://user:pass@localhost/db"}):
        reload(config.settings)
        assert config.settings.Config.DATABASE_URL == "postgresql://user:pass@localhost/db"