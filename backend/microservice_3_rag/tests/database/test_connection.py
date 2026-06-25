from unittest.mock import patch, MagicMock
from database.connection import get_db

@patch('database.connection.SessionLocal')
def test_get_db_yields_and_closes(mock_session_local):
    mock_db_instance = MagicMock()
    mock_session_local.return_value = mock_db_instance
    
    db_generator = get_db()
    
    db = next(db_generator)
    assert db == mock_db_instance
    
    try:
        next(db_generator)
    except StopIteration:
        pass
        
    mock_db_instance.close.assert_called_once()