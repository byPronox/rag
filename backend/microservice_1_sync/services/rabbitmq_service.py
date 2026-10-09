import logging
import time
import pika
from pika.exceptions import AMQPConnectionError
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


def start_worker(max_connection_attempts=None):
    """Arranca el consumidor y se reconecta con backoff exponencial si RabbitMQ se cae."""
    from controllers.message_controller import process_product_message

    attempt = 0
    while True:
        connection = None
        try:
            connection = pika.BlockingConnection(pika.URLParameters(Config.RABBITMQ_URL))
            channel = connection.channel()
            declare_topology(channel)
            channel.basic_qos(prefetch_count=Config.PREFETCH_COUNT)
            channel.basic_consume(queue=Config.QUEUE_NAME, on_message_callback=process_product_message)

            attempt = 0
            log.info("RabbitMQ worker running. Listening on '%s' (retry='%s', parking='%s')",
                     Config.QUEUE_NAME, Config.RETRY_QUEUE_NAME, Config.PARKING_QUEUE_NAME)
            channel.start_consuming()

        except (KeyboardInterrupt, SystemExit):
            log.info("Shutdown signal received, closing RabbitMQ connection...")
            if connection is not None and connection.is_open:
                connection.close()
            break

        except AMQPConnectionError as e:
            attempt += 1
            if max_connection_attempts and attempt >= max_connection_attempts:
                log.error("Could not connect to RabbitMQ after %d attempts", attempt)
                raise
            delay = min(30, 2 ** attempt)
            log.warning("RabbitMQ unavailable (%s). Retrying in %ss (attempt %d)", e, delay, attempt)
            time.sleep(delay)