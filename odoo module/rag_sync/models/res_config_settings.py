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

    rag_sync_active = fields.Boolean(
        string='Enable Automatic Sync',
        config_parameter='rag_rabbitmq_sync.sync_active',
        # Do not use default=True here. 
        # Config parameters handle defaults differently.
    )

    def set_values(self):
        super(ResConfigSettings, self).set_values()
        # Save the boolean as a string 'True' or 'False'
        self.env['ir.config_parameter'].sudo().set_param(
            'rag_rabbitmq_sync.sync_active', 
            str(self.rag_sync_active)
        )

    def get_values(self):
        res = super(ResConfigSettings, self).get_values()
        # Read the string parameter and convert it back to a boolean for the UI
        sync_active_str = self.env['ir.config_parameter'].sudo().get_param('rag_rabbitmq_sync.sync_active', 'True')
        res.update(
            rag_sync_active=sync_active_str.lower() == 'true'
        )
        return res