import logging
import time
import pika
from pika.exceptions import AMQPError
from config.settings import Config

log = logging.getLogger("sync.rabbitmq")


def declare_topology(channel):
    """Declara cola principal, cola de reintento (con TTL) y cola parking (DLQ)."""
    channel.queue_declare(queue=Config.QUEUE_NAME, durable=True)
    channel.queue_declare(
        queue=Config.RETRY_QUEUE_NAME,
        durable=True,
        arguments={
            "x-message-ttl": Config.RETRY_DELAY_MS,
            "x-dead-letter-exchange": "",
            "x-dead-letter-routing-key": Config.QUEUE_NAME,
        },
    )
    channel.queue_declare(queue=Config.PARKING_QUEUE_NAME, durable=True)


def _close_quietly(connection):
    if connection is not None and connection.is_open:
        try:
            connection.close()
        except Exception:  # pylint: disable=broad-except
            pass


def start_worker(max_connection_attempts=None):
    """Arranca el consumidor y se reconecta con backoff exponencial ante cualquier error de RabbitMQ."""
    from controllers.message_controller import process_product_message

    attempt = 0
    while True:
        connection = None
        try:
            connection = pika.BlockingConnection(pika.URLParameters(Config.RABBITMQ_URL))
            channel = connection.channel()
            # El reenvío a retry/parking queda confirmado por RabbitMQ antes de hacer ack del original
            channel.confirm_delivery()
            declare_topology(channel)
            channel.basic_qos(prefetch_count=Config.PREFETCH_COUNT)
            channel.basic_consume(queue=Config.QUEUE_NAME, on_message_callback=process_product_message)

            attempt = 0
            log.info("RabbitMQ worker running. Listening on '%s' (retry='%s', parking='%s')",
                     Config.QUEUE_NAME, Config.RETRY_QUEUE_NAME, Config.PARKING_QUEUE_NAME)
            channel.start_consuming()

        except (KeyboardInterrupt, SystemExit):
            log.info("Shutdown signal received, closing RabbitMQ connection...")
            _close_quietly(connection)
            break

        except AMQPError as e:
            attempt += 1
            _close_quietly(connection)
            if max_connection_attempts and attempt >= max_connection_attempts:
                log.error("Could not connect to RabbitMQ after %d attempts", attempt)
                raise
            delay = min(30, 2 ** attempt)
            log.warning("RabbitMQ error (%s: %s). Reconnecting in %ss (attempt %d)",
                        type(e).__name__, e, delay, attempt)
            time.sleep(delay)