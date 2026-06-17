import pytest
from unittest.mock import MagicMock, patch

@pytest.fixture
def mock_db_connection():
    """Fixture to mock the database connection and cursor."""
    with patch('database.connection.psycopg2.connect') as mock_connect:
        mock_conn = MagicMock()
        mock_connect.return_value = mock_conn
        
        mock_cursor = MagicMock()

        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        
        yield mock_conn, mock_cursor

@pytest.fixture
def mock_rabbitmq_channel():
    """Fixture to mock the RabbitMQ channel."""
    channel = MagicMock()
    method = MagicMock()
    method.delivery_tag = 1
    return channel, method