from unittest.mock import patch, MagicMock
import pytest
from pika.exceptions import AMQPConnectionError
from services import rabbitmq_service
from services.rabbitmq_service import start_worker


def _conexion_mock():
    mock_connection = MagicMock()
    mock_channel = MagicMock()
    mock_connection.channel.return_value = mock_channel
    mock_channel.start_consuming.side_effect = KeyboardInterrupt()
    return mock_connection, mock_channel


@patch('services.rabbitmq_service.time.sleep')
@patch('services.rabbitmq_service.pika.BlockingConnection')
def test_worker_declara_tres_colas_y_consume(mock_connection_class, mock_sleep):
    """Declara principal, retry y parking; consume de la principal y cierra limpio."""
    mock_connection, mock_channel = _conexion_mock()
    mock_connection_class.return_value = mock_connection

    start_worker()

    mock_channel.confirm_delivery.assert_called_once()

    cfg = rabbitmq_service.Config
    colas = [c.kwargs["queue"] for c in mock_channel.queue_declare.call_args_list]
    assert colas == [cfg.QUEUE_NAME, cfg.RETRY_QUEUE_NAME, cfg.PARKING_QUEUE_NAME]
    assert "arguments" not in mock_channel.queue_declare.call_args_list[0].kwargs
    mock_channel.basic_consume.assert_called_once()
    assert mock_channel.basic_consume.call_args.kwargs["queue"] == cfg.QUEUE_NAME
    mock_connection.close.assert_called_once()
    mock_sleep.assert_not_called()


@patch('services.rabbitmq_service.time.sleep')
@patch('services.rabbitmq_service.pika.BlockingConnection')
def test_worker_se_reconecta_si_rabbitmq_no_esta_disponible(mock_connection_class, mock_sleep):
    """Si RabbitMQ falla al inicio, espera y reintenta la conexión."""
    mock_connection, _ = _conexion_mock()
    mock_connection_class.side_effect = [AMQPConnectionError("caido"), mock_connection]

    start_worker()

    assert mock_connection_class.call_count == 2
    mock_sleep.assert_called_once_with(2)


@patch('services.rabbitmq_service.time.sleep')
@patch('services.rabbitmq_service.pika.BlockingConnection')
def test_worker_se_rinde_tras_maximo_de_intentos(mock_connection_class, mock_sleep):
    """Con límite de intentos, propaga el error al agotarlos."""
    mock_connection_class.side_effect = AMQPConnectionError("caido")

    with pytest.raises(AMQPConnectionError):
        start_worker(max_connection_attempts=2)

    assert mock_connection_class.call_count == 2
    mock_sleep.assert_called_once()