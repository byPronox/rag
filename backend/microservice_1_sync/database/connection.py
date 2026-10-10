import psycopg2
from pgvector.psycopg2 import register_vector
from config.settings import Config

_connection = None


def get_db_connection():
    """Conexión persistente: el worker procesa un mensaje a la vez, así que reutiliza una sola
    conexión en lugar de abrir una por mensaje (con TLS hacia Railway cuesta decenas de ms)."""
    global _connection  # pylint: disable=global-statement
    if _connection is None or _connection.closed:
        _connection = psycopg2.connect(
            Config.DATABASE_URL,
            connect_timeout=10,
            keepalives=1, keepalives_idle=30, keepalives_interval=10, keepalives_count=3,
        )
        register_vector(_connection)
    return _connection


def reset_db_connection():
    """Descarta la conexión (p. ej. tras una caída de la base); la próxima llamada abre una nueva."""
    global _connection  # pylint: disable=global-statement
    if _connection is not None:
        try:
            _connection.close()
        except Exception:  # pylint: disable=broad-except
            pass
    _connection = None