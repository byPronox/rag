from odoo import fields, models

class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    rag_rabbitmq_url = fields.Char(
        string='RabbitMQ AMQP URL',
        config_parameter='rag_rabbitmq_sync.rabbitmq_url',
        help="Example: amqps://user:pass@railway.app:5672"
    )
    
    rag_rabbitmq_queue = fields.Char(
        string='Queue Name',
        config_parameter='rag_rabbitmq_sync.rabbitmq_queue',
        default='rag_products_queue'
    )

    rag_api_key = fields.Char(
        string='System API Key (Tenant)',
        config_parameter='rag_rabbitmq_sync.api_key',
        help="The unique API Key provided by the RAG Admin Panel."
    )

    # NUEVO CAMPO: Public Base URL
    rag_public_base_url = fields.Char(
        string='Public Base URL (Ngrok/Prod)',
        config_parameter='rag_rabbitmq_sync.public_base_url',
        help="External URL to serve images (e.g., https://egomaniac-earshot-wound.ngrok-free.dev)"
    )

    rag_sync_active = fields.Boolean(
        string='Enable Automatic Sync',
        config_parameter='rag_rabbitmq_sync.sync_active'
    )

    def set_values(self):
        super(ResConfigSettings, self).set_values()
        self.env['ir.config_parameter'].sudo().set_param('rag_rabbitmq_sync.sync_active', str(self.rag_sync_active))
        
        if self.rag_sync_active and self.rag_api_key:
            active_companies = self.env['res.company'].sudo().search([])
            companies_data = [{'id': str(c.id), 'name': c.name} for c in active_companies]
            
            payload = {
                'api_key': self.rag_api_key,
                'action': 'sync_companies',
                'companies': companies_data
            }
            self.env['rag.rabbitmq.sender'].send_message(payload)

    def get_values(self):
        res = super(ResConfigSettings, self).get_values()
        sync_active_str = self.env['ir.config_parameter'].sudo().get_param('rag_rabbitmq_sync.sync_active', 'True')
        res.update(rag_sync_active=sync_active_str.lower() == 'true')
        return res