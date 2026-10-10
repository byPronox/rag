import logging

from odoo import models

_logger = logging.getLogger(__name__)


class StockMove(models.Model):
    _inherit = 'stock.move'

    def _rag_notify_stock(self):
        """Encola el stock disponible actualizado. Nunca rompe la operación de inventario:
        se ejecuta en un savepoint y cualquier error solo se registra."""
        try:
            products = self.product_id.filtered(lambda p: p.type == 'product')
            if products:
                with self.env.cr.savepoint():
                    products._rag_enqueue_stock_update(update_synced=False)
        except Exception:  # pylint: disable=broad-except
            _logger.exception("RAG: could not queue stock update after a stock operation.")

    def _action_done(self, cancel_backorder=False):
        """Entrega, recepción, ajuste de inventario o venta POS validada."""
        moves = super()._action_done(cancel_backorder=cancel_backorder)
        (self | moves)._rag_notify_stock()
        return moves

    def _action_assign(self, force_qty=False):
        """Reserva: un pedido confirmado aparta mercadería y baja el stock disponible."""
        result = super()._action_assign(force_qty=force_qty)
        self._rag_notify_stock()
        return result

    def _do_unreserve(self):
        """Liberación de reserva: pedido cancelado o entrega desreservada."""
        result = super()._do_unreserve()
        self._rag_notify_stock()
        return result