import logging

from odoo import models

_logger = logging.getLogger(__name__)


class StockMove(models.Model):
    _inherit = 'stock.move'

    def _action_done(self, cancel_backorder=False):
        """Cuando se valida una entrega, recepción, ajuste de inventario o venta POS,
        el stock cambia: se envía al RAG en ese momento (el cron queda como red de seguridad)."""
        moves = super()._action_done(cancel_backorder=cancel_backorder)
        try:
            products = (self | moves).product_id.filtered(lambda p: p.type == 'product')
            if products:
                products.invalidate_recordset(['qty_available'])
                products._rag_enqueue_stock_update()
        except Exception:
            _logger.exception("RAG: could not queue stock update after stock move validation.")
        return moves