from odoo import models


class ProductTemplateAttributeValue(models.Model):
    _inherit = 'product.template.attribute.value'

    def write(self, vals):
        """El precio extra de una variante (ej. 'Rojo +$2') se guarda aquí, no en la variante."""
        result = super().write(vals)
        if 'price_extra' in vals and not self.env.context.get('rag_skip_sync'):
            self.ptav_product_variant_ids._rag_sync_after_write({'lst_price': True})
        return result