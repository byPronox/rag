from odoo import _, fields, models
from odoo.exceptions import UserError


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    rag_rabbitmq_url = fields.Char(
        string='RabbitMQ AMQP URL',
        config_parameter='rag_rabbitmq_sync.rabbitmq_url',
        help="Example: amqps://user:pass@railway.app:5672"
    )

    rag_rabbitmq_queue = fields.Char(
        string='Queue Name',
        config_parameter='rag_rabbitmq_sync.rabbitmq_queue',
        default='rag_products_queue'
    )

    rag_api_key = fields.Char(
        string='System API Key (Tenant)',
        config_parameter='rag_rabbitmq_sync.api_key',
        help="The unique API Key provided by the RAG Admin Panel."
    )

    rag_public_base_url = fields.Char(
        string='Public Base URL (Ngrok/Prod)',
        config_parameter='rag_rabbitmq_sync.public_base_url',
        help="External URL to serve images (e.g., https://egomaniac-earshot-wound.ngrok-free.dev)"
    )

    rag_sync_active = fields.Boolean(
        string='Enable Automatic Sync',
        config_parameter='rag_rabbitmq_sync.sync_active'
    )

    # ==========================================
    # GUARDAR / LEER AJUSTES
    # ==========================================
    def set_values(self):
        super(ResConfigSettings, self).set_values()
        self.env['ir.config_parameter'].sudo().set_param('rag_rabbitmq_sync.sync_active', str(self.rag_sync_active))

        # Handshake: registra las compañías. Si la API key es inválida, el worker la rechaza
        # y avisa a Odoo por el webhook (requiere Public Base URL accesible).
        if self.rag_sync_active and self.rag_api_key:
            companies = self.env['res.company'].sudo().search([])
            self.env['rag.rabbitmq.sender'].send_message({
                'action': 'sync_companies',
                'companies': [{'id': str(c.id), 'name': c.name} for c in companies],
            })

    def get_values(self):
        res = super(ResConfigSettings, self).get_values()
        sync_active_str = self.env['ir.config_parameter'].sudo().get_param('rag_rabbitmq_sync.sync_active', 'True')
        res.update(rag_sync_active=sync_active_str.lower() == 'true')
        return res

    # ==========================================
    # BOTONES
    # ==========================================
    def _rag_notification(self, title, message, notif_type='success'):
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {'title': title, 'message': message, 'type': notif_type, 'sticky': False},
        }

    def action_rag_test_connection(self):
        """Comprueba la conexión con RabbitMQ y que la cola exista."""
        self.ensure_one()
        error, pending = self.env['rag.rabbitmq.sender'].check_connection(
            self.rag_rabbitmq_url, self.rag_rabbitmq_queue)
        if error:
            raise UserError(_("RabbitMQ connection failed:\n%s") % error)
        return self._rag_notification(
            _('RabbitMQ Connection OK'),
            _("Queue '%s' is reachable (%s message(s) waiting). "
              "The API Key is validated by the RAG worker when messages are processed.")
            % (self.rag_rabbitmq_queue or 'rag_products_queue', pending))

    def action_rag_full_resync(self):
        """Reenvía todo el catálogo publicable y borra del índice lo que ya no existe en Odoo."""
        ICP = self.env['ir.config_parameter'].sudo()
        if (ICP.get_param('rag_rabbitmq_sync.sync_active', 'True') or '').lower() != 'true':
            raise UserError(_("Enable synchronization and save the settings before running a full resync."))
        if not ICP.get_param('rag_rabbitmq_sync.api_key'):
            raise UserError(_("Set the System API Key and save the settings before running a full resync."))

        queued, failed = self.env['product.product']._rag_full_resync()
        message = _("%s product(s) queued for the AI. Products that no longer exist in Odoo "
                    "will be removed from the AI index.") % queued
        if failed:
            message += _(" %s product(s) failed (see server log).") % failed
        return self._rag_notification(_('RAG Full Resync Queued'), message,
                                      'warning' if failed else 'success')