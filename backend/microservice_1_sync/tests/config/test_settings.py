import os
from importlib import reload
from unittest.mock import patch
import config.settings


def test_settings_reemplaza_prefijo_postgres():
    """El prefijo postgres:// se reemplaza por postgresql://"""
    with patch.dict(os.environ, {"DATABASE_URL": "postgres://user:pass@localhost/db"}):
        reload(config.settings)
        assert config.settings.Config.DATABASE_URL == "postgresql://user:pass@localhost/db"


def test_settings_postgresql_no_se_altera():
    """Si ya usa postgresql:// no se modifica."""
    with patch.dict(os.environ, {"DATABASE_URL": "postgresql://user:pass@localhost/db"}):
        reload(config.settings)
        assert config.settings.Config.DATABASE_URL == "postgresql://user:pass@localhost/db"


def test_settings_sin_database_url_no_falla():
    """Regresión: antes lanzaba AttributeError si DATABASE_URL no estaba definida."""
    env = {k: v for k, v in os.environ.items() if k != "DATABASE_URL"}
    with patch.dict(os.environ, env, clear=True):
        reload(config.settings)
        assert config.settings.Config.DATABASE_URL is None


def test_colas_derivadas_del_nombre_principal():
    """Las colas de reintento y parking se derivan del nombre de la cola principal."""
    with patch.dict(os.environ, {"RABBITMQ_QUEUE": "cola_x", "DATABASE_URL": "postgresql://x"}):
        reload(config.settings)
        assert config.settings.Config.RETRY_QUEUE_NAME == "cola_x.retry"
        assert config.settings.Config.PARKING_QUEUE_NAME == "cola_x.parking"