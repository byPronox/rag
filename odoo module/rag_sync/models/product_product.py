from odoo import models, api
from odoo.tools import html2plaintext

class ProductProduct(models.Model):
    _inherit = 'product.product'

def _prepare_rag_payload(self, action):
        """Prepares the JSON payload including multi-tenant, company, 3 images and webhook data."""
        self.ensure_one()
        
        Config = self.env['ir.config_parameter'].sudo()
        api_key = Config.get_param('rag_rabbitmq_sync.api_key')
        
        # 1. Obtener la URL pública configurada (o usar la local si está vacía)
        base_url = Config.get_param('rag_rabbitmq_sync.public_base_url')
        if not base_url:
            base_url = Config.get_param('web.base.url')
        base_url = base_url.rstrip('/') # Evita errores si la URL termina en '/'
        
        img_128 = f"{base_url}/web/image/product.product/{self.id}/image_variant_128"
        img_512 = f"{base_url}/web/image/product.product/{self.id}/image_variant_512"
        img_1920 = f"{base_url}/web/image/product.product/{self.id}/image_variant_1920"
        
        webhook_url = f"{base_url}/api/rag/feedback" 

        raw_description = self.description_ecommerce or self.description_sale or self.name
        clean_description = html2plaintext(raw_description).strip()
        category_name = self.categ_id.name if self.categ_id else "Uncategorized"

        return {
            'api_key': api_key,
            'action': action,
            'variant_id': self.id,
            'template_id': self.product_tmpl_id.id,
            'sku': self.default_code,
            'display_name': self.display_name,
            'description': clean_description,
            'price': self.lst_price,
            'stock': self.qty_available,
            'category': category_name,
            'website_url': self.website_url,
            'image_128_url': img_128,    
            'image_512_url': img_512,    
            'image_1920_url': img_1920, 
            'company_id': self.company_id.id,       
            'company_name': self.company_id.name,   
            'webhook_url': webhook_url              
        }