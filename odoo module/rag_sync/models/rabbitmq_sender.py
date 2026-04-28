from odoo import models, api
import pika
import json
import logging

_logger = logging.getLogger(__name__)

class RabbitMQSender(models.AbstractModel):
    _name = 'rag.rabbitmq.sender'
    _description = 'RabbitMQ Message Sender Utility'

    @api.model
    def send_message(self, payload):
        is_active = self.env['ir.config_parameter'].sudo().get_param('rag_rabbitmq_sync.sync_active', 'True')
        if is_active.lower() != 'true':
            _logger.info("RAG Sync is globally disabled via Settings. Message dropped.")
            return False

        
        url = self.env['ir.config_parameter'].sudo().get_param('rag_rabbitmq_sync.rabbitmq_url')
        queue_name = self.env['ir.config_parameter'].sudo().get_param('rag_rabbitmq_sync.rabbitmq_queue', 'rag_products_queue')

        if not url:
            _logger.warning("RabbitMQ URL is missing in Settings. Synchronization aborted.")
            return False

        try:
            parameters = pika.URLParameters(url)
            connection = pika.BlockingConnection(parameters)
            channel = connection.channel()
            channel.queue_declare(queue=queue_name, durable=True)

            channel.basic_publish(
                exchange='',
                routing_key=queue_name,
                body=json.dumps(payload),
                properties=pika.BasicProperties(
                    delivery_mode=2,
                    content_type='application/json',
                ))
            
            connection.close()
            return True
        except Exception as e:
            _logger.error("RabbitMQ Connection Error: %s", str(e))
            return False