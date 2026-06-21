from unittest.mock import patch, MagicMock
from database.connection import get_db, init_db

@patch('database.connection.engine.connect')
@patch('database.connection.Base.metadata.create_all')
def test_init_db(mock_create_all, mock_connect):
    """Test the database initialization and extension creation."""
    mock_conn = MagicMock()
    mock_connect.return_value.__enter__.return_value = mock_conn
    
    init_db()
    
    mock_conn.execute.assert_called_once()
    mock_conn.commit.assert_called_once()
    mock_create_all.assert_called_once()

@patch('database.connection.SessionLocal')
def test_get_db_generator(mock_session_local):
    """Test the DB dependency generator."""
    mock_session = MagicMock()
    mock_session_local.return_value = mock_session
    
    db_gen = get_db()
    db = next(db_gen)
    assert db == mock_session
    
    try:
        next(db_gen)
    except StopIteration:
        pass
    
    mock_session.close.assert_called_once()