import psycopg2
from pgvector.psycopg2 import register_vector
from config.settings import Config

def get_db_connection():
    """Returns a new connection to the database."""
    conn = psycopg2.connect(Config.DATABASE_URL)
    register_vector(conn)
    return conn