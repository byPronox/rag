import json
import requests
from unittest.mock import patch, MagicMock
from controllers.message_controller import process_product_message, send_feedback_to_odoo

@patch('controllers.message_controller.get_db_connection')
@patch('controllers.message_controller.send_feedback_to_odoo')
@patch('controllers.message_controller.embedding_service.generate_vector')
def test_process_product_message_auth_failed(mock_generate_vector, mock_send_feedback, mock_get_db, mock_rabbitmq_channel):
    """Test what happens when the API key is invalid."""
    channel, method = mock_rabbitmq_channel
    mock_conn, mock_cursor = MagicMock(), MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
    mock_get_db.return_value = mock_conn
    
    mock_cursor.fetchone.return_value = None
    
    payload = json.dumps({"api_key": "invalid_key", "action": "sync", "variant_id": 123})
    
    process_product_message(channel, method, None, payload)
    
    mock_cursor.execute.assert_called_once()
    mock_generate_vector.assert_not_called()
    channel.basic_ack.assert_called_once()
    mock_send_feedback.assert_called_once()

@patch('controllers.message_controller.get_db_connection')
@patch('controllers.message_controller.embedding_service.generate_vector')
def test_process_product_message_delete_action(mock_generate_vector, mock_get_db, mock_rabbitmq_channel):
    """Test the delete action path."""
    channel, method = mock_rabbitmq_channel
    mock_conn, mock_cursor = MagicMock(), MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
    mock_get_db.return_value = mock_conn
    
    mock_cursor.fetchone.return_value = (99,)
    
    payload = json.dumps({"api_key": "valid_key", "action": "delete", "variant_id": 123})
    
    process_product_message(channel, method, None, payload)
    
    assert mock_cursor.execute.call_count == 2
    delete_query_args = mock_cursor.execute.call_args_list[1][0]
    assert "DELETE FROM product_embeddings" in delete_query_args[0]
    assert delete_query_args[1] == (123, 99)
    
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
    
    process_product_message(channel, method, None, payload)
    
    assert mock_cursor.execute.call_count == 2
    insert_query_args = mock_cursor.execute.call_args_list[1][0]
    assert "INSERT INTO product_embeddings" in insert_query_args[0]
    
    sql_params = insert_query_args[1]
    assert sql_params[0] == 123
    assert sql_params[1] == 99
    assert sql_params[3] == "Product Name"
    assert sql_params[19] == [0.5, 0.5]
    
    mock_conn.commit.assert_called_once()
    channel.basic_ack.assert_called_once()

@patch('controllers.message_controller.get_db_connection')
def test_process_product_message_sync_companies(mock_get_db, mock_rabbitmq_channel):
    """Test para la sincronización de múltiples empresas (Tenant Handshake)."""
    channel, method = mock_rabbitmq_channel
    mock_conn, mock_cursor = MagicMock(), MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
    mock_get_db.return_value = mock_conn
    
    mock_cursor.fetchone.return_value = (99,)
    
    payload = json.dumps({
        "api_key": "valid_key", 
        "action": "sync_companies", 
        "companies": [
            {"id": 10, "name": "Empresa A"},
            {"id": 20, "name": "Empresa B"}
        ]
    })
    
    process_product_message(channel, method, None, payload)
    
    assert mock_cursor.execute.call_count == 3
    
    last_query_args = mock_cursor.execute.call_args_list[2][0]
    assert "INSERT INTO user_companies" in last_query_args[0]
    assert last_query_args[1] == (99, "20", "Empresa B")
    
    mock_conn.commit.assert_called_once()
    channel.basic_ack.assert_called_once()

@patch('controllers.message_controller.get_db_connection')
@patch('controllers.message_controller.send_feedback_to_odoo')
def test_process_product_message_db_exception(mock_send_feedback, mock_get_db, mock_rabbitmq_channel):
    """Test para verificar el ROLLBACK y NACK cuando ocurre un error grave (ej. base de datos caída)."""
    channel, method = mock_rabbitmq_channel
    mock_conn, mock_cursor = MagicMock(), MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
    mock_get_db.return_value = mock_conn
    
    mock_cursor.execute.side_effect = Exception("Fatal DB Error")
    
    payload = json.dumps({"api_key": "valid_key", "action": "delete", "variant_id": 123, "webhook_url": "http://odoo.local"})
    
    process_product_message(channel, method, None, payload)
    
    mock_conn.rollback.assert_called_once()
    channel.basic_nack.assert_called_once_with(delivery_tag=method.delivery_tag, requeue=True)
    mock_send_feedback.assert_called_once()
    mock_conn.close.assert_called_once()

@patch('controllers.message_controller.get_db_connection')
def test_process_product_message_unknown_action(mock_get_db, mock_rabbitmq_channel):
    """Test para verificar que una acción no soportada no rompa el worker."""
    channel, method = mock_rabbitmq_channel
    mock_conn, mock_cursor = MagicMock(), MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
    mock_get_db.return_value = mock_conn
    
    mock_cursor.fetchone.return_value = (99,)
    
    payload = json.dumps({"api_key": "valid_key", "action": "accion_inventada", "variant_id": 123})
    
    process_product_message(channel, method, None, payload)
    
    mock_conn.commit.assert_called_once()
    channel.basic_ack.assert_called_once()
    mock_conn.close.assert_called_once()

@patch('controllers.message_controller.requests.post')
def test_send_feedback_success(mock_post):
    """Test cuando el webhook de Odoo responde bien."""
    mock_post.return_value.status_code = 200
    send_feedback_to_odoo("http://odoo.test/webhook", 123, "Error simulado")
    mock_post.assert_called_once()

@patch('controllers.message_controller.requests.post')
def test_send_feedback_network_error(mock_post):
    """Test cuando Odoo está caído o hay timeout."""
    mock_post.side_effect = requests.exceptions.Timeout("Timeout error")
    
    send_feedback_to_odoo("http://odoo.test/webhook", 123, "Error simulado")
    mock_post.assert_called_once()

def test_send_feedback_no_url():
    """Test cuando no se envía webhook_url."""
    send_feedback_to_odoo(None, 123, "Error simulado")

@patch('controllers.message_controller.get_db_connection')
@patch('controllers.message_controller.send_feedback_to_odoo')
def test_process_product_message_invalid_json(mock_send_feedback, mock_get_db, mock_rabbitmq_channel):
    """Test para verificar el manejo de un JSON malformado (falla en json.loads)."""
    channel, method = mock_rabbitmq_channel
    mock_conn = MagicMock()
    mock_get_db.return_value = mock_conn

    payload = "esto_no_es_un_json_valido"

    process_product_message(channel, method, None, payload)

    mock_conn.rollback.assert_called_once()
    channel.basic_nack.assert_called_once_with(delivery_tag=method.delivery_tag, requeue=True)
    
    assert mock_send_feedback.call_count == 1
    call_args = mock_send_feedback.call_args[0]
    assert call_args[0] is None
    assert call_args[1] is None
    assert "Database or processing failure" in call_args[2]