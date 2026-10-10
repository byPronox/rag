import logging
import time

import pika
from pika.exceptions import (
    AMQPConnectionError, ChannelClosedByBroker, ProbableAccessDeniedError, ProbableAuthenticationError,
)
from odoo import api, models

_logger = logging.getLogger(__name__)

DEFAULT_QUEUE = 'rag_products_queue'


class RabbitMQSender(models.AbstractModel):
    _name = 'rag.rabbitmq.sender'
    _description = 'RabbitMQ Message Sender Utility'

    @api.model
    def send_message(self, payload):
        self.env['rag.outbox'].enqueue([payload])
        return True

    # ==========================================
    # CONFIGURACIÓN Y CONEXIÓN
    # ==========================================
    @api.model
    def _rag_settings(self):
        ICP = self.env['ir.config_parameter'].sudo()
        return (ICP.get_param('rag_rabbitmq_sync.rabbitmq_url'),
                ICP.get_param('rag_rabbitmq_sync.rabbitmq_queue') or DEFAULT_QUEUE)

    @api.model
    def _rag_connect(self, url):
        params = pika.URLParameters(url)
        params.socket_timeout = 5
        params.blocked_connection_timeout = 10
        params.connection_attempts = 1
        return pika.BlockingConnection(params)

    @api.model
    def _rag_close(self, connection):
        if connection is not None and connection.is_open:
            try:
                connection.close()
            except Exception:  # pylint: disable=broad-except
                pass

    @api.model
    def _rag_friendly_error(self, exc, queue_name):
        if isinstance(exc, ChannelClosedByBroker):
            if exc.reply_code == 404:
                return (f"Queue '{queue_name}' does not exist yet. "
                        "Start the RAG sync worker once so it creates the queues.")
            if exc.reply_code == 403:
                return f"RabbitMQ user has no permission on queue '{queue_name}': {exc.reply_text}"
        if isinstance(exc, (ProbableAuthenticationError, ProbableAccessDeniedError)):
            return "RabbitMQ rejected the user or password of the AMQP URL."
        if isinstance(exc, AMQPConnectionError):
            return "Could not connect to RabbitMQ (check host, port and network)."
        return str(exc) or exc.__class__.__name__

    @api.model
    def check_connection(self, url=None, queue_name=None):
        """Comprueba que RabbitMQ acepte la conexión y que la cola exista.
        Devuelve (error, mensajes_en_cola); error es None si todo está bien."""
        stored_url, stored_queue = self._rag_settings()
        url = url or stored_url
        queue_name = queue_name or stored_queue
        if not url:
            return "RabbitMQ URL is missing in Settings", 0
        connection = None
        try:
            connection = self._rag_connect(url)
            result = connection.channel().queue_declare(queue=queue_name, passive=True)
            return None, result.method.message_count
        except Exception as e:  # pylint: disable=broad-except
            return self._rag_friendly_error(e, queue_name), 0
        finally:
            self._rag_close(connection)

    # ==========================================
    # PUBLICACIÓN
    # ==========================================
    @api.model
    def publish_batch(self, items):
        """Publica [(key, body)] en una transacción AMQP: salen todos o ninguno.
        Devuelve (keys_enviadas, error)."""
        url, queue_name = self._rag_settings()
        if not url:
            return [], "RabbitMQ URL is missing in Settings"
        if not items:
            return [], None

        connection = None
        try:
            connection = self._rag_connect(url)
            channel = connection.channel()
            # Pasiva: verifica que la cola exista sin necesitar permiso 'configure' (mínimo privilegio).
            # Si no existe, falla con 404 y los mensajes se quedan en el outbox.
            channel.queue_declare(queue=queue_name, passive=True)
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

        except Exception as e:  # pylint: disable=broad-except
            error = self._rag_friendly_error(e, queue_name)
            _logger.error("RabbitMQ publish error (%d message(s) kept in outbox): %s", len(items), error)
            return [], error
        finally:
            self._rag_close(connection)

    @api.model
    def _rag_notify_admins(self, title, message, throttle_key=None, every_seconds=0,
                           notif_type='danger', sticky=False):
        """Notificación en pantalla para los administradores.
        Con throttle_key se envía como máximo una vez cada 'every_seconds'."""
        if throttle_key:
            ICP = self.env['ir.config_parameter'].sudo()
            param = f'rag_rabbitmq_sync.alert.{throttle_key}'
            now = int(time.time())
            if now - int(ICP.get_param(param) or 0) < every_seconds:
                return False
            ICP.set_param(param, str(now))
        for user in self.env.ref('base.group_system').sudo().users:
            self.env['bus.bus'].sudo()._sendone(user.partner_id, 'simple_notification', {
                'type': notif_type, 'title': title, 'message': message, 'sticky': sticky,
            })
        return True