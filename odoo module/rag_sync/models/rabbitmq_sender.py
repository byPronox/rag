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

        sent, connection = [], None
        try:
            params = pika.URLParameters(url)
            params.socket_timeout = 5
            params.blocked_connection_timeout = 10
            params.connection_attempts = 1
            connection = pika.BlockingConnection(params)
            channel = connection.channel()
            channel.tx_select()
            keys = []
            for key, body in items:
                channel.basic_publish(
                    exchange='',
                    routing_key=queue_name,
                    body=body,
                    properties=pika.BasicProperties(delivery_mode=2, content_type='application/json'),
                )
                keys.append(key)
            channel.tx_commit()  
            return keys, None
            
        except Exception as e:
            _logger.error("RabbitMQ publish error after %d message(s): %s", len(sent), e)
            return sent, str(e)
        finally:
            if connection is not None and connection.is_open:
                try:
                    connection.close()
                except Exception:
                    pass