import json
import logging
import time

from odoo import api, fields, models

_logger = logging.getLogger(__name__)

BATCH_SIZE = 500
MAX_BATCHES_PER_RUN = 20


class RagOutbox(models.Model):
    _name = 'rag.outbox'
    _description = 'RAG Sync Outbox'
    _order = 'id'

    payload = fields.Text(required=True)
    action = fields.Char(index=True)
    variant_id = fields.Integer(index=True)
    attempts = fields.Integer(default=0)
    last_error = fields.Char()

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
    def _rag_publish_batch(self, limit=BATCH_SIZE):
        """Publica un lote. Devuelve (enviados, fallidos)."""
        self.env.cr.execute(
            "SELECT id FROM rag_outbox ORDER BY id LIMIT %s FOR UPDATE SKIP LOCKED", (int(limit),))
        ids = [row[0] for row in self.env.cr.fetchall()]
        if not ids:
            return 0, 0
        rows = self.browse(ids)
        sent_ids, error = self.env['rag.rabbitmq.sender'].publish_batch([(r.id, r.payload) for r in rows])
        sent = self.browse(sent_ids)
        failed = rows - sent
        sent.unlink()
        for row in failed:
            row.write({'attempts': row.attempts + 1, 'last_error': (error or 'unknown error')[:250]})
        return len(sent), len(failed)

    @api.model
    def _cron_flush(self):
        total = 0
        for _ in range(MAX_BATCHES_PER_RUN):
            sent, failed = self._rag_publish_batch()
            self.env.cr.commit()
            total += sent
            if failed or sent < BATCH_SIZE:
                break
        if total:
            _logger.info("RAG outbox: %d message(s) published to RabbitMQ.", total)