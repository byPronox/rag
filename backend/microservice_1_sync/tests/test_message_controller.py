import json
from unittest.mock import patch, MagicMock
from controllers.message_controller import process_product_message

@patch('controllers.message_controller.get_db_connection')
@patch('controllers.message_controller.send_feedback_to_odoo')
@patch('controllers.message_controller.embedding_service.generate_vector')
def test_process_product_message_auth_failed(mock_generate_vector, mock_send_feedback, mock_get_db, mock_rabbitmq_channel):
    """Test what happens when the API key is invalid."""
    channel, method = mock_rabbitmq_channel
    mock_conn, mock_cursor = MagicMock(), MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
    mock_get_db.return_value = mock_conn
    
    # Simulate DB returning None (user not found / invalid API key)
    mock_cursor.fetchone.return_value = None
    
    payload = json.dumps({"api_key": "invalid_key", "action": "sync", "variant_id": 123})
    
    # Act
    process_product_message(channel, method, None, payload)
    
    # Assert
    mock_cursor.execute.assert_called_once() # Only the auth query should run
    mock_generate_vector.assert_not_called()
    channel.basic_ack.assert_called_once() # Acknowledged to drop the invalid message
    mock_send_feedback.assert_called_once() # Should notify Odoo

@patch('controllers.message_controller.get_db_connection')
@patch('controllers.message_controller.embedding_service.generate_vector')
def test_process_product_message_delete_action(mock_generate_vector, mock_get_db, mock_rabbitmq_channel):
    """Test the delete action path."""
    channel, method = mock_rabbitmq_channel
    mock_conn, mock_cursor = MagicMock(), MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
    mock_get_db.return_value = mock_conn
    
    # Simulate valid API key, returning user_id = 99
    mock_cursor.fetchone.return_value = (99,)
    
    payload = json.dumps({"api_key": "valid_key", "action": "delete", "variant_id": 123})
    
    # Act
    process_product_message(channel, method, None, payload)
    
    # Assert
    # First call is Auth, second is Delete
    assert mock_cursor.execute.call_count == 2
    delete_query_args = mock_cursor.execute.call_args_list[1][0]
    assert "DELETE FROM product_embeddings" in delete_query_args[0]
    assert delete_query_args[1] == (123, 99) # variant_id, user_id
    
    mock_conn.commit.assert_called_once()
    channel.basic_ack.assert_called_once()

@patch('controllers.message_controller.get_db_connection')
@patch('controllers.message_controller.embedding_service.generate_vector')
def test_process_product_message_sync_action(mock_generate_vector, mock_get_db, mock_rabbitmq_channel):
    """Test the product synchronization path."""
    channel, method = mock_rabbitmq_channel
    mock_conn, mock_cursor = MagicMock(), MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
    mock_get_db.return_value = mock_conn
    
    # Simulate valid API key, returning user_id = 99
    mock_cursor.fetchone.return_value = (99,)
    mock_generate_vector.return_value = [0.5, 0.5]
    
    payload = json.dumps({
        "api_key": "valid_key", 
        "action": "sync", 
        "variant_id": 123,
        "display_name": "[SKU1] Product Name",
        "company_id": 1,
        "company_name": "Test Co"
    })
    
    # Act
    process_product_message(channel, method, None, payload)
    
    assert mock_cursor.execute.call_count == 2
    insert_query_args = mock_cursor.execute.call_args_list[1][0]
    assert "INSERT INTO product_embeddings" in insert_query_args[0]
    
    # Verify the parameters passed to the SQL query
    sql_params = insert_query_args[1]
    assert sql_params[0] == 123 # variant_id
    assert sql_params[1] == 99 # user_id
    assert sql_params[3] == "Product Name" # Cleaned display_name
    assert sql_params[19] == [0.5, 0.5] # The vector
    
    mock_conn.commit.assert_called_once()
    channel.basic_ack.assert_called_once()