from odoo import models, api
from odoo.tools import html2plaintext

class ProductProduct(models.Model):
    _inherit = 'product.product'

    def _prepare_rag_payload(self, action):
        self.ensure_one()
        Config = self.env['ir.config_parameter'].sudo()
        api_key = Config.get_param('rag_rabbitmq_sync.api_key')
        
        base_url = Config.get_param('rag_rabbitmq_sync.public_base_url') or Config.get_param('web.base.url')
        base_url = base_url.rstrip('/')
        
        if self.image_variant_1920:
            img_128 = f"{base_url}/web/image/product.product/{self.id}/image_variant_128"
            img_512 = f"{base_url}/web/image/product.product/{self.id}/image_variant_512"
            img_1920 = f"{base_url}/web/image/product.product/{self.id}/image_variant_1920"
        else:
            tmpl_id = self.product_tmpl_id.id
            img_128 = f"{base_url}/web/image/product.template/{tmpl_id}/image_128"
            img_512 = f"{base_url}/web/image/product.template/{tmpl_id}/image_512"
            img_1920 = f"{base_url}/web/image/product.template/{tmpl_id}/image_1920"
        
        webhook_url = f"{base_url}/api/rag/feedback" 
        clean_description = html2plaintext(self.description_ecommerce or self.description_sale or self.name).strip()
        category_name = self.categ_id.name if self.categ_id else "Uncategorized"

        # --- NUEVA LÓGICA DE PRECIOS E IMPUESTOS ---
        currency_name = self.currency_id.name or 'USD'
        base_price = round(self.lst_price, 2) # Aquí arreglamos el 48.8000000004
        
        if self.taxes_id:
            # Odoo calcula mágicamente los totales excluyendo e incluyendo el impuesto
            tax_calc = self.taxes_id.compute_all(base_price, self.currency_id, 1.0, product=self)
            price_excluded = round(tax_calc['total_excluded'], 2)
            price_included = round(tax_calc['total_included'], 2)
            # Sumamos los porcentajes de impuestos (Ej. si hay un IVA del 15%)
            tax_percent = round(sum(self.taxes_id.mapped('amount')), 2)
        else:
            price_excluded = base_price
            price_included = base_price
            tax_percent = 0.0

        return {
            'api_key': api_key,
            'action': action,
            'variant_id': self.id,
            'template_id': self.product_tmpl_id.id,
            'sku': self.default_code,
            'display_name': self.display_name,
            'description': clean_description,
            'category': category_name,
            'website_url': self.website_url,
            'stock': self.qty_available,
            'image_128_url': img_128,
            'image_512_url': img_512,
            'image_1920_url': img_1920,
            'company_id': self.company_id.id,       
            'company_name': self.company_id.name,   
            'webhook_url': webhook_url,
            'currency': currency_name,
            'price_excluded': price_excluded,
            'price_included': price_included,
            'tax_percent': tax_percent
        }

    # ==========================================
    # TRIGGERS AUTOMÁTICOS (CREATE, WRITE, UNLINK)
    # ==========================================

    @api.model_create_multi
    def create(self, vals_list):
        """Se ejecuta al CREAR un producto nuevo"""
        records = super().create(vals_list)
        for record in records:
            if record.is_published:
                payload = record._prepare_rag_payload('create')
                self.env['rag.rabbitmq.sender'].send_message(payload)
        return records

    def write(self, vals):
        """Se ejecuta al ACTUALIZAR un producto"""
        result = super().write(vals)
        # Solo mandamos actualización si cambiaron campos importantes para el RAG
        triggers = ['lst_price', 'qty_available', 'description_ecommerce', 'is_published', 'name', 'image_1920', 'image_variant_1920']
        if any(key in vals for key in triggers):
            for record in self:
                # Si le quitan el check de publicado, le decimos al RAG que lo borre de sus vectores
                action = 'update' if record.is_published else 'delete'
                payload = record._prepare_rag_payload(action)
                self.env['rag.rabbitmq.sender'].send_message(payload)
        return result

    def unlink(self):
        """Se ejecuta al ELIMINAR (botón suprimir) un producto de Odoo"""
        Config = self.env['ir.config_parameter'].sudo()
        api_key = Config.get_param('rag_rabbitmq_sync.api_key')
        
        for record in self:
            # Como el producto se va a borrar, enviamos un payload resumido solo para eliminar
            payload = {
                'api_key': api_key,
                'action': 'delete',
                'variant_id': record.id
            }
            self.env['rag.rabbitmq.sender'].send_message(payload)
            
        return super().unlink()

    # ==========================================
    # BOTÓN MANUAL
    # ==========================================

    def action_massive_sync_rag(self):
        """Acción del botón manual en la vista."""
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
                'title': 'RAG Sync Queued',
                'message': f'{count} product(s) sent to the AI queue. Check the product Chatter (Log Notes) for any authentication errors.',
                'type': 'success',
                'sticky': False,
            }
        }