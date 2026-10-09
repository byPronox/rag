import logging

import pika
from odoo import api, models

_logger = logging.getLogger(__name__)


class RabbitMQSender(models.AbstractModel):
    _name = 'rag.rabbitmq.sender'
    _description = 'RabbitMQ Message Sender Utility'

    @api.model
    def send_message(self, payload):
        self.env['rag.outbox'].enqueue([payload])
        return True

    @api.model
    def publish_batch(self, items):
        ICP = self.env['ir.config_parameter'].sudo()
        url = ICP.get_param('rag_rabbitmq_sync.rabbitmq_url')
        queue_name = ICP.get_param('rag_rabbitmq_sync.rabbitmq_queue') or 'rag_products_queue'
        if not url:
            return [], "RabbitMQ URL is missing in Settings"
        if not items:
            return [], None

        connection = None
        try:
            params = pika.URLParameters(url)
            params.socket_timeout = 5
            params.blocked_connection_timeout = 10
            params.connection_attempts = 1
            connection = pika.BlockingConnection(params)
            channel = connection.channel()
            channel.queue_declare(queue=queue_name, durable=True)
            channel.tx_select()
            for _key, body in items:
                channel.basic_publish(
                    exchange='',
                    routing_key=queue_name,
                    body=body,
                    properties=pika.BasicProperties(delivery_mode=2, content_type='application/json'),
                )
            channel.tx_commit()
            return [key for key, _body in items], None

        except Exception as e:
            _logger.error("RabbitMQ publish error (%d message(s) kept in outbox): %s", len(items), e)
            return [], str(e)
        finally:
            if connection is not None and connection.is_open:
                try:
                    connection.close()
                except Exception:  # pylint: disable=broad-except
                    pass