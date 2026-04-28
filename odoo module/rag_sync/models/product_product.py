from odoo import models, api
from odoo.tools import html2plaintext

class ProductProduct(models.Model):
    _inherit = 'product.product'

    def _prepare_rag_payload(self, action):
        """Prepares the JSON payload including the multi-tenant API Key."""
        self.ensure_one()
        
        # Get the API Key to identify the tenant
        api_key = self.env['ir.config_parameter'].sudo().get_param('rag_rabbitmq_sync.api_key')
        
        raw_description = self.description_ecommerce or self.description_sale or self.name
        clean_description = html2plaintext(raw_description).strip()
        category_name = self.categ_id.name if self.categ_id else "Uncategorized"

        return {
            'api_key': api_key, # Multi-tenant identifier
            'action': action,
            'variant_id': self.id,
            'template_id': self.product_tmpl_id.id,
            'sku': self.default_code,
            'display_name': self.display_name,
            'description': clean_description,
            'price': self.lst_price,
            'stock': self.qty_available,
            'category': category_name,
            'website_url': self.website_url 
        }

    @api.model_create_multi
    def create(self, vals_list):
        records = super().create(vals_list)
        for record in records:
            if record.is_published:
                payload = record._prepare_rag_payload('create')
                self.env['rag.rabbitmq.sender'].send_message(payload)
        return records

    def write(self, vals):
        result = super().write(vals)
        triggers = ['lst_price', 'qty_available', 'description_ecommerce', 'is_published', 'name']
        if any(key in vals for key in triggers):
            for record in self:
                action = 'update' if record.is_published else 'delete'
                payload = record._prepare_rag_payload(action)
                self.env['rag.rabbitmq.sender'].send_message(payload)
        return result

    def action_massive_sync_rag(self):
        """Manual action to export variants to RabbitMQ."""
        count = 0
        for record in self:
            if record.is_published:
                payload = record._prepare_rag_payload('sync')
                if self.env['rag.rabbitmq.sender'].send_message(payload):
                    count += 1
        
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': 'RAG Sync Completed',
                'message': f'Successfully queued {count} product variant(s) to RabbitMQ.',
                'type': 'success',
                'sticky': False,
            }
        }