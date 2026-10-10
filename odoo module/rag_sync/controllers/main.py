import hashlib
import hmac
import json
import logging

from markupsafe import Markup
from odoo import http
from odoo.http import request

_logger = logging.getLogger(__name__)


class RagWebhookController(http.Controller):

    @http.route('/api/rag/feedback', type='http', auth='public', methods=['POST'], csrf=False)
    def rag_feedback(self, **kwargs):
        raw_body = request.httprequest.get_data()
        api_key = request.env['ir.config_parameter'].sudo().get_param('rag_rabbitmq_sync.api_key') or ''
        signature = request.httprequest.headers.get('X-RAG-Signature', '')
        expected = hmac.new(api_key.encode('utf-8'), raw_body, hashlib.sha256).hexdigest()

        if not api_key or not hmac.compare_digest(expected, signature):
            _logger.warning("RAG feedback rejected: invalid signature from %s", request.httprequest.remote_addr)
            return request.make_json_response({'status': 'unauthorized'}, status=401)

        try:
            data = json.loads(raw_body or b'{}')
            variant_id = data.get('variant_id')
            error_msg = str(data.get('error') or 'Unknown error')[:1000]
            _logger.error("RAG Sync Failed for Product ID %s: %s", variant_id, error_msg)
            sender = request.env['rag.rabbitmq.sender'].sudo()

            if 'API Key' in error_msg:
                sender._rag_notify_admins(
                    'RAG AI: invalid API Key',
                    'The RAG backend rejected the API Key configured in Settings > RAG AI Sync. '
                    'Fix it and then press "Run full resync".',
                    throttle_key='invalid_key', every_seconds=3600, sticky=True)
                return request.make_json_response({'status': 'received'})

            product = request.env['product.product'].sudo()
            if variant_id:
                try:
                    product = product.browse(int(variant_id)).exists()
                except (TypeError, ValueError):
                    product = product.browse()

            if product:
                product.message_post(
                    body=Markup("<div style='color:red;'><b>⚠️ Error RAG AI:</b> %s</div>") % error_msg)
                label = product.display_name
            else:
                label = 'RAG sync'

            # Máximo una notificación por minuto
            sender._rag_notify_admins(
                'RAG Sync Error',
                f'{label}: {error_msg} (more errors may follow; see the product chatter or the server log)',
                throttle_key='feedback', every_seconds=60)
            return request.make_json_response({'status': 'received'})
        except Exception:  # pylint: disable=broad-except
            _logger.exception("Error processing RAG feedback webhook")
            return request.make_json_response({'status': 'error'}, status=400)