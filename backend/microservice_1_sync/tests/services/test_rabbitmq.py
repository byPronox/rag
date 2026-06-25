from unittest.mock import patch, MagicMock
from services.rabbitmq_service import start_worker

@patch('services.rabbitmq_service.time.sleep')
@patch('services.rabbitmq_service.pika.BlockingConnection')
def test_start_worker(mock_connection_class, mock_sleep):
    mock_connection = MagicMock()
    mock_channel = MagicMock()
    mock_connection.channel.return_value = mock_channel
    mock_connection_class.return_value = mock_connection
    
    mock_channel.start_consuming.side_effect = KeyboardInterrupt()
    
    try:
        start_worker()
    except KeyboardInterrupt:
        pass
        
    mock_connection_class.assert_called_once()
    mock_channel.queue_declare.assert_called_once()
    mock_channel.basic_consume.assert_called_once()
    mock_channel.start_consuming.assert_called_once()