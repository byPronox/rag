import logging

from odoo import api, fields, models
from odoo.tools import html2plaintext, float_compare

_logger = logging.getLogger(__name__)

RAG_TRIGGER_FIELDS = {
    'name', 'default_code', 'lst_price', 'list_price', 'description_ecommerce', 'description_sale',
    'is_published', 'website_published', 'active', 'categ_id', 'taxes_id', 'company_id',
    'image_1920', 'image_variant_1920', 'accessory_product_ids', 'alternative_product_ids',
    'sale_ok', 'type', 'detailed_type',
}
VISIBILITY_FIELDS = {'is_published', 'website_published', 'active', 'sale_ok', 'type', 'detailed_type'}

RAG_PRODUCT_TYPES = ('product', 'consu')


class ProductProduct(models.Model):
    _inherit = 'product.product'

    rag_synced_qty = fields.Float(string='RAG: last synced stock', copy=False, readonly=True)

    # ==========================================
    # CRITERIO ÚNICO: ¿ESTE PRODUCTO VA AL RAG?
    # ==========================================
    def _rag_is_syncable(self):
        """Producto real de la tienda: activo, publicado, vendible y físico/consumible."""
        self.ensure_one()
        return bool(self.active and self.is_published and self.sale_ok
                    and self.type in RAG_PRODUCT_TYPES)

    @api.model
    def _rag_syncable_domain(self):
        return [('is_published', '=', True), ('sale_ok', '=', True), ('type', 'in', RAG_PRODUCT_TYPES)]

    # ==========================================
    # ENTORNO Y CONSTRUCCIÓN SEGURA DE PAYLOADS
    # ==========================================
    def _rag_system_env(self):
        """Permisos de sistema + todas las compañías permitidas (la compañía actual primero).
        El payload NO debe depender de los permisos del usuario que guarda ni del usuario del cron."""
        current = self.env.company
        others = self.env['res.company'].sudo().search([('id', '!=', current.id)])
        return self.sudo().with_context(allowed_company_ids=[current.id] + others.ids)

    def _rag_safe_payloads(self, builder):
        """Arma payloads producto por producto. Si uno falla, se registra y se omite:
        la sincronización con el RAG nunca debe bloquear el guardado en Odoo."""
        payloads = []
        try:
            for product in self._rag_system_env():
                try:
                    payloads.append(builder(product))
                except Exception:  # pylint: disable=broad-except
                    _logger.exception("RAG: could not prepare payload for product id=%s (skipped).", product.id)
        finally:
            # El payload se arma con sudo + todas las compañías: eso deja en la caché del ORM registros
            # que el usuario actual no puede leer y la lectura posterior al guardado fallaría con
            # AccessError. Se limpia la caché para evitarlo.
            self.env.invalidate_all()
        return payloads

    def _rag_base_url(self):
        ICP = self.env['ir.config_parameter'].sudo()
        base_url = ICP.get_param('rag_rabbitmq_sync.public_base_url') or ICP.get_param('web.base.url') or ''
        return base_url.rstrip('/')

    def _rag_variant_name(self):
        """'Arnés para perro (Rojo, M)' armado sin leer product.attribute."""
        self.ensure_one()
        base = self.product_tmpl_id.name or self.name or ''
        values = self.product_template_attribute_value_ids.mapped('name')
        return f"{base} ({', '.join(values)})" if values else base

    def _rag_names(self, records):
        """Nombres legibles para accesorios (product.product) y alternativas (product.template)."""
        names = []
        for rec in records:
            if rec._name == 'product.product':
                names.append(rec._rag_variant_name())
            else:
                names.append(rec.name or '')
        return [n for n in names if n]

    # ==========================================
    # STOCK DISPONIBLE (lo que el comprador realmente puede comprar)
    # ==========================================
    def _rag_stock_by_product(self):
        """{product_id: stock disponible}.
        free_qty = físico - reservado (pedidos confirmados aún no entregados), contado solo en los
        almacenes de la compañía del producto. Los productos compartidos ('global') suman todas.
        Los consumibles no llevan inventario: se envía 0."""
        result = dict.fromkeys(self.ids, 0.0)
        by_company = {}
        for product in self.filtered(lambda p: p.type == 'product'):
            by_company.setdefault(product.company_id.id, []).append(product.id)
        for company_id, ids in by_company.items():
            products = self.browse(ids)
            if company_id:
                products = products.with_context(allowed_company_ids=[company_id])
            quantities = products._compute_quantities_dict(None, None, None)
            for product_id, values in quantities.items():
                result[product_id] = values['free_qty']
        return result

    # ==========================================
    # PAYLOADS (sin API key: se agrega al publicar)
    # ==========================================
    def _prepare_rag_delete_payload(self):
        self.ensure_one()
        return {
            'action': 'delete',
            'variant_id': self.id,
            'webhook_url': f"{self._rag_base_url()}/api/rag/feedback",
        }

    def _prepare_rag_payload(self, action):
        self.ensure_one()
        base_url = self._rag_base_url()
        company = self.company_id

        # Solo productos reales y publicados, nunca el propio producto
        accessories = self._rag_names(self.accessory_product_ids.filtered(
            lambda p: p != self and p._rag_is_syncable()))
        alternatives = self._rag_names(self.alternative_product_ids.filtered(
            lambda t: t != self.product_tmpl_id and t.active and t.is_published
            and t.sale_ok and t.type in RAG_PRODUCT_TYPES))

        if self.image_variant_1920:
            img_128 = f"{base_url}/web/image/product.product/{self.id}/image_variant_128"
            img_512 = f"{base_url}/web/image/product.product/{self.id}/image_variant_512"
            img_1920 = f"{base_url}/web/image/product.product/{self.id}/image_variant_1920"
        else:
            tmpl_id = self.product_tmpl_id.id
            img_128 = f"{base_url}/web/image/product.template/{tmpl_id}/image_128"
            img_512 = f"{base_url}/web/image/product.template/{tmpl_id}/image_512"
            img_1920 = f"{base_url}/web/image/product.template/{tmpl_id}/image_1920"

        # URL absoluta para que los enlaces del chatbot/buscador funcionen fuera de Odoo
        website_url = self.website_url or ''
        if website_url.startswith('/'):
            website_url = f"{base_url}{website_url}"

        clean_description = html2plaintext(
            self.description_ecommerce or self.description_sale or self.name or '').strip()
        category_name = self.categ_id.name if self.categ_id else "Uncategorized"

        # --- Precios e impuestos (solo impuestos de la compañía del producto) ---
        currency = self.currency_id
        base_price = round(self.lst_price, 2)  # lst_price ya incluye el precio extra de la variante
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
            'action': action,
            'variant_id': self.id,
            'template_id': self.product_tmpl_id.id,
            'sku': self.default_code or None,
            'display_name': self._rag_variant_name(),
            'company_id': str(company.id) if company else 'global',
            'company_name': company.name if company else 'All Companies',
            'description': clean_description,
            'accessories': ", ".join(accessories) if accessories else "",
            'alternatives': ", ".join(alternatives) if alternatives else "",
            'category': category_name,
            'website_url': website_url or None,
            'stock': self._rag_stock_by_product()[self.id],
            'image_128_url': img_128,
            'image_512_url': img_512,
            'image_1920_url': img_1920,
            'webhook_url': f"{base_url}/api/rag/feedback",
            'currency': currency.name or 'USD',
            'price_excluded': price_excluded,
            'price_included': price_included,
            'tax_percent': tax_percent,
        }

    # ==========================================
    # SINCRONIZACIÓN
    # ==========================================
    def _rag_sync_after_write(self, vals):
        """Usado por product.product, product.template y valores de atributo después de un write."""
        if self.env.context.get('rag_skip_sync'):
            return
        changed = set(vals)
        if not RAG_TRIGGER_FIELDS & changed:
            return
        products = self.sudo().exists()
        syncable = products.filtered(lambda p: p._rag_is_syncable())
        payloads = syncable._rag_safe_payloads(lambda p: p._prepare_rag_payload('update'))
        # Si dejó de cumplir el criterio (despublicado, archivado, pasó a servicio...), se borra del índice
        if VISIBILITY_FIELDS & changed:
            payloads += (products - syncable)._rag_safe_payloads(lambda p: p._prepare_rag_delete_payload())
        self.env['rag.outbox'].enqueue(payloads)

    @api.model_create_multi
    def create(self, vals_list):
        records = super().create(vals_list)
        if not self.env.context.get('rag_skip_sync'):
            syncable = records.sudo().filtered(lambda p: p._rag_is_syncable())
            self.env['rag.outbox'].enqueue(syncable._rag_safe_payloads(lambda p: p._prepare_rag_payload('create')))
        return records

    def write(self, vals):
        result = super().write(vals)
        self._rag_sync_after_write(vals)
        return result

    def unlink(self):
        payloads = self._rag_safe_payloads(lambda p: p._prepare_rag_delete_payload())
        result = super().unlink()
        self.env['rag.outbox'].enqueue(payloads)  # solo si el borrado no falló
        return result

    # ==========================================
    # STOCK, BOTÓN MANUAL Y CRON
    # ==========================================
    def _rag_enqueue_stock_update(self, update_synced=True):
        """Encola la actualización de las variantes sincronizables.
        update_synced=False desde entregas/reservas: no escribe en la fila del producto, así dos
        validaciones simultáneas del mismo producto no chocan. El cron hace esa contabilidad."""
        syncable = self.sudo().filtered(lambda p: p._rag_is_syncable())
        if not syncable:
            return 0
        payloads = syncable._rag_safe_payloads(lambda p: p._prepare_rag_payload('update'))
        self.env['rag.outbox'].enqueue(payloads)
        if update_synced and payloads:
            self.env.cr.execute("""
                UPDATE product_product AS p SET rag_synced_qty = v.qty
                FROM unnest(%s::int[], %s::float8[]) AS v(id, qty)
                WHERE p.id = v.id
            """, ([pl['variant_id'] for pl in payloads], [float(pl['stock'] or 0.0) for pl in payloads]))
            self.env['product.product'].invalidate_model(['rag_synced_qty'])
        return len(payloads)

    def action_massive_sync_rag(self):
        """Sincroniza los seleccionados que cumplen el criterio y BORRA del índice los que no
        (despublicados, descuentos, servicios...). Así el botón también sirve para limpiar."""
        syncable = self.sudo().filtered(lambda p: p._rag_is_syncable())
        not_syncable = self.sudo() - syncable
        payloads = syncable._rag_safe_payloads(lambda p: p._prepare_rag_payload('sync'))
        failed = len(syncable) - len(payloads)
        payloads += not_syncable._rag_safe_payloads(lambda p: p._prepare_rag_delete_payload())
        self.env['rag.outbox'].enqueue(payloads)

        message = (f'{len(syncable) - failed} product(s) queued for the AI. '
                   f'{len(not_syncable)} removed from the AI index if present '
                   '(not published, not for sale, discounts, services...).')
        if failed:
            message += f' {failed} failed (see server log).'
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': 'RAG Sync Queued',
                'message': message,
                'type': 'warning' if failed else 'success',
                'sticky': False,
            }
        }

    @api.model
    def _cron_rag_sync_stock(self):
        """Red de seguridad: detecta cambios de stock disponible que no se enviaron todavía."""
        products = self._rag_system_env().search(self._rag_syncable_domain())
        if not products:
            return
        stock = products._rag_stock_by_product()
        changed = products.filtered(
            lambda p: float_compare(stock[p.id], p.rag_synced_qty, precision_digits=2) != 0)
        if not changed:
            return
        queued = changed._rag_enqueue_stock_update(update_synced=True)
        _logger.info("RAG stock sync: %d product(s) queued, %d skipped.", queued, len(changed) - queued)

    # ==========================================
    # RECONCILIACIÓN
    # ==========================================
    @api.model
    def _rag_reconcile_payload(self, variant_ids):
        return {
            'action': 'reconcile',
            'variant_ids': list(variant_ids),
            'webhook_url': f"{self._rag_base_url()}/api/rag/feedback",
        }

    @api.model
    def _rag_reconcile(self):
        """Envía la lista de variantes que SÍ deben estar en el índice; el worker borra el resto."""
        products = self._rag_system_env().search(self._rag_syncable_domain())
        self.env['rag.outbox'].enqueue([self._rag_reconcile_payload(products.ids)])
        return len(products)

    @api.model
    def _rag_full_resync(self):
        """Reenvía todos los productos sincronizables y al final reconcilia.
        Si el payload de un producto falla, igual va en la lista (no se borra por un error nuestro)."""
        products = self._rag_system_env().search(self._rag_syncable_domain())
        payloads = products._rag_safe_payloads(lambda p: p._prepare_rag_payload('sync'))
        self.env['rag.outbox'].enqueue(payloads)
        self.env['rag.outbox'].enqueue([self._rag_reconcile_payload(products.ids)])
        return len(payloads), len(products) - len(payloads)

    @api.model
    def _cron_rag_reconcile(self):
        count = self._rag_reconcile()
        _logger.info("RAG reconcile queued: %d valid product(s) sent to the worker.", count)