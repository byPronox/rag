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

            if variant_id:
                product = request.env['product.product'].sudo().browse(int(variant_id))
                if product.exists():
                    product.message_post(
                        body=Markup("<div style='color:red;'><b>⚠️ Error RAG AI:</b> %s</div>") % error_msg)

                    admins = request.env.ref('base.group_system').sudo().users
                    for user in admins:
                        request.env['bus.bus'].sudo()._sendone(
                            user.partner_id,
                            'simple_notification',
                            {
                                'type': 'danger',
                                'title': 'RAG Sync Error',
                                'message': f'Failed to sync {product.display_name}: {error_msg}',
                                'sticky': False,
                            }
                        )
            return request.make_json_response({'status': 'received'})
        except Exception:
            _logger.exception("Error processing RAG feedback webhook")
            return request.make_json_response({'status': 'error'}, status=400)