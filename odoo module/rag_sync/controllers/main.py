from odoo import http
from odoo.http import request
import logging

_logger = logging.getLogger(__name__)

class RagWebhookController(http.Controller):
    
    @http.route('/api/rag/feedback', type='json', auth='public', methods=['POST'], csrf=False)
    def rag_feedback(self, **kwargs):
        """Endpoint for the RAG AI Microservice to report errors back to Odoo."""
        data = request.jsonrequest
        variant_id = data.get('variant_id')
        error_msg = data.get('error')
        
        _logger.error("RAG Sync Failed for Product ID %s: %s", variant_id, error_msg)
        
        # Buscar el producto y dejarle una nota interna (Log Note) en Odoo
        if variant_id:
            product = request.env['product.product'].sudo().browse(variant_id)
            if product.exists():
                product.message_post(
                    body=f"<div style='color:red;'><b>⚠️ RAG AI Sync Failed:</b> {error_msg}</div>"
                )
                
        return {'status': 'received'}