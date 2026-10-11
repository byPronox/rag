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


@patch('database.connection.register_vector')
@patch('database.connection.psycopg2.connect')
def test_new_db_connection_es_independiente(mock_connect, mock_register_vector):
    from database.connection import new_db_connection
    first, second = new_db_connection(), new_db_connection()
    assert mock_connect.call_count == 2
    assert first == second == mock_connect.return_value
    assert mock_register_vector.call_count == 2