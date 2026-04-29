import json
from odoo import http
from odoo.http import request
import logging

_logger = logging.getLogger(__name__)

class RagWebhookController(http.Controller):
    
    @http.route('/api/rag/feedback', type='http', auth='public', methods=['POST'], csrf=False)
    def rag_feedback(self, **kwargs):
        """Endpoint for the RAG AI Microservice to report errors back to Odoo."""
        try:
            data = request.get_json_data()
            variant_id = data.get('variant_id')
            error_msg = data.get('error')
            
            _logger.error("RAG Sync Failed for Product ID %s: %s", variant_id, error_msg)
            
            if variant_id:
                product = request.env['product.product'].sudo().browse(variant_id)
                if product.exists():
                    # 1. Registrar el error en el Chatter
                    product.message_post(
                        body=f"<div style='color:red;'><b>⚠️ Error RAG AI:</b> {error_msg}</div>"
                    )
                    
                    # 2. Enviar una notificación ROJA en pantalla a los administradores o al usuario que lo creó
                    # Buscamos a los usuarios del grupo de ventas/inventario o administradores
                    users_to_notify = request.env['res.users'].sudo().search([('share', '=', False)])
                    
                    for user in users_to_notify:
                        request.env['bus.bus']._sendone(
                            user.partner_id,
                            'simple_notification',
                            {
                                'type': 'danger', # Esto la hace ROJA
                                'title': 'RAG Sync Error',
                                'message': f'Failed to sync {product.display_name}: {error_msg}',
                                'sticky': True, # Para que no desaparezca sola
                            }
                        )
                        
            return request.make_json_response({'status': 'received'})
        except Exception as e:
            _logger.exception("Error processing RAG feedback webhook")
            return request.make_json_response({'status': 'error', 'message': str(e)})