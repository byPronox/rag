from unittest.mock import patch
from database.connection import get_db_connection

@patch('database.connection.register_vector')
@patch('database.connection.psycopg2.connect')
def test_get_db_connection(mock_connect, mock_register_vector):
    # Act
    conn = get_db_connection()
    
    # Assert
    mock_connect.assert_called_once()
    mock_register_vector.assert_called_once_with(mock_connect.return_value)
    assert conn == mock_connect.return_value