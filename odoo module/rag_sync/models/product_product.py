import logging

from odoo import api, fields, models
from odoo.tools import html2plaintext, float_compare

_logger = logging.getLogger(__name__)

RAG_TRIGGER_FIELDS = {
    'name', 'default_code', 'lst_price', 'list_price', 'description_ecommerce', 'description_sale',
    'is_published', 'website_published', 'active', 'categ_id', 'taxes_id', 'company_id',
    'image_1920', 'image_variant_1920', 'accessory_product_ids', 'alternative_product_ids',
}
VISIBILITY_FIELDS = {'is_published', 'website_published', 'active'}


class ProductProduct(models.Model):
    _inherit = 'product.product'

    rag_synced_qty = fields.Float(string='RAG: last synced stock', copy=False, readonly=True)

    def _rag_base_url(self):
        ICP = self.env['ir.config_parameter'].sudo()
        base_url = ICP.get_param('rag_rabbitmq_sync.public_base_url') or ICP.get_param('web.base.url') or ''
        return base_url.rstrip('/')

    def _prepare_rag_delete_payload(self):
        self.ensure_one()
        return {
            'api_key': self.env['ir.config_parameter'].sudo().get_param('rag_rabbitmq_sync.api_key'),
            'action': 'delete',
            'variant_id': self.id,
            'webhook_url': f"{self._rag_base_url()}/api/rag/feedback",
        }

    def _prepare_rag_payload(self, action):
        self.ensure_one()
        api_key = self.env['ir.config_parameter'].sudo().get_param('rag_rabbitmq_sync.api_key')
        base_url = self._rag_base_url()
        company = self.company_id

        accessories = self.accessory_product_ids.mapped('display_name')
        alternatives = self.alternative_product_ids.mapped('display_name')

        if self.image_variant_1920:
            img_128 = f"{base_url}/web/image/product.product/{self.id}/image_variant_128"
            img_512 = f"{base_url}/web/image/product.product/{self.id}/image_variant_512"
            img_1920 = f"{base_url}/web/image/product.product/{self.id}/image_variant_1920"
        else:
            tmpl_id = self.product_tmpl_id.id
            img_128 = f"{base_url}/web/image/product.template/{tmpl_id}/image_128"
            img_512 = f"{base_url}/web/image/product.template/{tmpl_id}/image_512"
            img_1920 = f"{base_url}/web/image/product.template/{tmpl_id}/image_1920"

        clean_description = html2plaintext(
            self.description_ecommerce or self.description_sale or self.name or '').strip()
        category_name = self.categ_id.name if self.categ_id else "Uncategorized"

        currency = self.currency_id
        base_price = round(self.lst_price, 2)
        tax_company = company or self.env.company
        taxes = self.taxes_id.filtered(lambda t: t.company_id == tax_company)
        if taxes:
            tax_calc = taxes.compute_all(base_price, currency, 1.0, product=self)
            price_excluded = round(tax_calc['total_excluded'], 2)
            price_included = round(tax_calc['total_included'], 2)
            tax_percent = round(sum(taxes.filtered(lambda t: t.amount_type == 'percent').mapped('amount')), 2)
        else:
            price_excluded = price_included = base_price
            tax_percent = 0.0

        return {
            'api_key': api_key,
            'action': action,
            'variant_id': self.id,
            'template_id': self.product_tmpl_id.id,
            'sku': self.default_code,
            'display_name': self.display_name,
            'company_id': str(company.id) if company else 'global',
            'company_name': company.name if company else 'All Companies',
            'description': clean_description,
            'accessories': ", ".join(accessories) if accessories else "",
            'alternatives': ", ".join(alternatives) if alternatives else "",
            'category': category_name,
            'website_url': self.website_url,
            'stock': self.qty_available,
            'image_128_url': img_128,
            'image_512_url': img_512,
            'image_1920_url': img_1920,
            'webhook_url': f"{base_url}/api/rag/feedback",
            'currency': currency.name or 'USD',
            'price_excluded': price_excluded,
            'price_included': price_included,
            'tax_percent': tax_percent,
        }

    def _rag_sync_after_write(self, vals):
        if self.env.context.get('rag_skip_sync'):
            return
        changed = set(vals)
        if not RAG_TRIGGER_FIELDS & changed:
            return
        products = self.exists()
        visible = products.filtered(lambda p: p.active and p.is_published)
        payloads = [p._prepare_rag_payload('update') for p in visible]
        if VISIBILITY_FIELDS & changed:
            payloads += [p._prepare_rag_delete_payload() for p in (products - visible)]
        self.env['rag.outbox'].enqueue(payloads)

    @api.model_create_multi
    def create(self, vals_list):
        records = super().create(vals_list)
        if not self.env.context.get('rag_skip_sync'):
            published = records.filtered(lambda p: p.active and p.is_published)
            self.env['rag.outbox'].enqueue([p._prepare_rag_payload('create') for p in published])
        return records

    def write(self, vals):
        result = super().write(vals)
        self._rag_sync_after_write(vals)
        return result

    def unlink(self):
        payloads = [p._prepare_rag_delete_payload() for p in self]
        result = super().unlink()
        self.env['rag.outbox'].enqueue(payloads) 
        return result

    def action_massive_sync_rag(self):
        published = self.filtered(lambda p: p.active and p.is_published)
        self.env['rag.outbox'].enqueue([p._prepare_rag_payload('sync') for p in published])
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': 'RAG Sync Queued',
                'message': (f'{len(published)} product(s) queued for the AI. They will be sent in a few '
                            'seconds. Pending messages: Settings > Technical > RAG Outbox.'),
                'type': 'success',
                'sticky': False,
            }
        }

    @api.model
    def _cron_rag_sync_stock(self):
        products = self.sudo().search([('is_published', '=', True)])
        changed = products.filtered(
            lambda p: float_compare(p.qty_available, p.rag_synced_qty, precision_digits=2) != 0)
        if not changed:
            return
        self.env['rag.outbox'].enqueue([p._prepare_rag_payload('update') for p in changed])
        for product in changed:
            product.with_context(rag_skip_sync=True).write({'rag_synced_qty': product.qty_available})
        _logger.info("RAG stock sync: %d product(s) with stock changes queued.", len(changed))