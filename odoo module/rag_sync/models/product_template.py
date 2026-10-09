from odoo import models

from .product_product import RAG_TRIGGER_FIELDS


class ProductTemplate(models.Model):
    _inherit = 'product.template'

    def write(self, vals):
        result = super().write(vals)
        if not self.env.context.get('rag_skip_sync') and RAG_TRIGGER_FIELDS & set(vals):
            self.with_context(active_test=False).product_variant_ids._rag_sync_after_write(vals)
        return result

    def action_massive_sync_rag(self):
        return self.product_variant_ids.action_massive_sync_rag()