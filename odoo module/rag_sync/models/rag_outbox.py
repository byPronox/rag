import json
import logging
import time

from odoo import api, fields, models

_logger = logging.getLogger(__name__)

BATCH_SIZE = 500
MAX_BATCHES_PER_RUN = 20
ALERT_EVERY_SECONDS = 3600


class RagOutbox(models.Model):
    _name = 'rag.outbox'
    _description = 'RAG Sync Outbox'
    _order = 'id'

    payload = fields.Text(required=True)
    action = fields.Char(index=True)
    variant_id = fields.Integer(index=True)
    attempts = fields.Integer(default=0)
    last_error = fields.Char()

    # ==========================================
    # ENCOLAR (dentro de la transacción del guardado en Odoo)
    # ==========================================
    @api.model
    def _rag_dedupe_key(self, payload):
        action = payload.get('action')
        if action == 'sync_companies':
            return 'companies'
        if action == 'reconcile':
            return 'reconcile'
        if payload.get('variant_id'):
            return f"variant:{payload['variant_id']}"
        return None

    @api.model
    def enqueue(self, payloads):
        """Encola payloads. Dentro de una transacción, el último estado de cada variante gana."""
        payloads = [p for p in (payloads or []) if p]
        if not payloads:
            return
        ICP = self.env['ir.config_parameter'].sudo()
        if (ICP.get_param('rag_rabbitmq_sync.sync_active', 'True') or '').lower() != 'true':
            _logger.info("RAG Sync disabled in Settings. %d message(s) dropped.", len(payloads))
            return
        if not ICP.get_param('rag_rabbitmq_sync.api_key'):
            _logger.warning("RAG API Key missing in Settings. %d message(s) dropped.", len(payloads))
            return

        outbox = self.sudo()
        tx_rows = self.env.cr.precommit.data.setdefault('rag_outbox_rows', {})
        for payload in payloads:
            payload = dict(payload)
            # La API key no se guarda aquí: se agrega al publicar (si se corrige, los pendientes usan la nueva)
            payload.pop('api_key', None)
            # Versión del evento: el worker descarta eventos más viejos que el último aplicado
            payload.setdefault('event_ts', time.time_ns() // 1000)
            key = self._rag_dedupe_key(payload)
            values = {
                'payload': json.dumps(payload, default=str),
                'action': payload.get('action'),
                'variant_id': payload.get('variant_id') or 0,
            }
            row = outbox.browse(tx_rows[key]).exists() if key in tx_rows else outbox.browse()
            if row:
                row.write(values)
            else:
                row = outbox.create(values)
                if key:
                    tx_rows[key] = row.id
        self._rag_trigger_publish()

    @api.model
    def _rag_trigger_publish(self):
        data = self.env.cr.precommit.data
        if data.get('rag_publish_triggered'):
            return
        cron = self.env.ref('rag_sync.ir_cron_rag_outbox_flush', raise_if_not_found=False)
        if cron:
            cron.sudo()._trigger()
            data['rag_publish_triggered'] = True

    @api.model
    def _rag_publish_now(self):
        """Acción manual desde la lista del outbox: dispara el cron de publicación ya."""
        cron = self.env.ref('rag_sync.ir_cron_rag_outbox_flush', raise_if_not_found=False)
        if cron:
            cron.sudo()._trigger()
        pending = self.sudo().search_count([])
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': 'RAG Outbox',
                'message': f'{pending} pending message(s) will be published in a few seconds.',
                'type': 'info',
                'sticky': False,
            },
        }

    # ==========================================
    # PUBLICAR (cron)
    # ==========================================
    @api.model
    def _rag_mark_failed(self, error, ids=None):
        """Suma un intento y guarda el error. ids=None marca todos los pendientes."""
        error = (error or 'unknown error')[:250]
        if ids is None:
            self.env.cr.execute("UPDATE rag_outbox SET attempts = attempts + 1, last_error = %s", (error,))
        elif ids:
            self.env.cr.execute(
                "UPDATE rag_outbox SET attempts = attempts + 1, last_error = %s WHERE id IN %s",
                (error, tuple(ids)))
        self.invalidate_model(['attempts', 'last_error'])

    @api.model
    def _rag_publish_batch(self, api_key, limit=BATCH_SIZE):
        """Publica un lote con la API key actual. Devuelve (enviados, fallidos, error)."""
        self.env.cr.execute(
            "SELECT id, payload FROM rag_outbox ORDER BY id LIMIT %s FOR UPDATE SKIP LOCKED", (int(limit),))
        rows = self.env.cr.fetchall()
        if not rows:
            return 0, 0, None
        items = [(row_id, json.dumps({**json.loads(payload), 'api_key': api_key}))
                 for row_id, payload in rows]
        sent_ids, error = self.env['rag.rabbitmq.sender'].publish_batch(items)
        sent = set(sent_ids)
        failed_ids = [row_id for row_id, _payload in rows if row_id not in sent]
        if sent_ids:
            self.sudo().browse(sent_ids).unlink()
        self._rag_mark_failed(error, failed_ids)
        return len(sent_ids), len(failed_ids), error

    @api.model
    def _cron_flush(self):
        if not self.sudo().search([], limit=1):
            return
        api_key = self.env['ir.config_parameter'].sudo().get_param('rag_rabbitmq_sync.api_key')
        if not api_key:
            self._rag_mark_failed("RAG API Key missing in Settings")
            return

        total = 0
        for _ in range(MAX_BATCHES_PER_RUN):
            sent, failed, error = self._rag_publish_batch(api_key)
            self.env.cr.commit()
            total += sent
            if failed:
                self.env['rag.rabbitmq.sender']._rag_notify_admins(
                    'RAG AI: RabbitMQ unavailable',
                    f'Product changes are waiting in the outbox and will be retried every 5 minutes. {error}',
                    throttle_key='rabbitmq', every_seconds=ALERT_EVERY_SECONDS)
                break
            if sent < BATCH_SIZE:
                break
        if total:
            _logger.info("RAG outbox: %d message(s) published to RabbitMQ.", total)