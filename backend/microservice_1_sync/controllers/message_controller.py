import hashlib
import hmac
import ipaddress
import json
import logging
import re
import socket
import time
from urllib.parse import urlparse

import pika
import requests

from config.settings import Config
from database.connection import get_db_connection
from services.embedding_service import embedding_service

log = logging.getLogger("sync.worker")

VALID_PRODUCT_ACTIONS = ("create", "update", "sync")

GLOBAL_COMPANY_ID = "global"
_LEGACY_NO_COMPANY = {"", "False", "None", "false", "none"}


class PermanentError(Exception):
    """Error que no se soluciona reintentando el mensaje."""


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------
def normalize_company_id(raw):
    value = "" if raw is None else str(raw).strip()
    return GLOBAL_COMPANY_ID if value in _LEGACY_NO_COMPANY else value


def normalize_template_id(raw):
    if isinstance(raw, bool) or raw is None:
        return None
    value = str(raw).strip()
    return int(value) if value.isdigit() else None


def normalize_event_ts(raw):
    """Versión del evento en microsegundos. None si no viene (mensajes antiguos en la cola)."""
    if isinstance(raw, bool) or raw is None:
        return None
    if isinstance(raw, (int, float)):
        value = int(raw)
    else:
        text = str(raw).strip()
        if not text.isdigit():
            return None
        value = int(text)
    return value if value > 0 else None


def clean_display_name(raw_name):
    """'[SKU1] Producto' -> 'Producto'"""
    return re.sub(r'^\[.*?\]\s*', '', raw_name or '')


def strip_html(text):
    text = re.sub(r"<[^>]+>", " ", text or "")
    return re.sub(r"\s+", " ", text).strip()


def build_embedding_text(data, clean_name):
    """Texto que se convierte en vector. v1 = formato original (no cambiar: hay test de regresión)."""
    if Config.EMBED_TEXT_VERSION == "v2":
        parts = [
            f"Product: {clean_name}.",
            f"Category: {data.get('category') or ''}.",
            f"Description: {strip_html(data.get('description'))}.",
        ]
        if data.get('accessories'):
            parts.append(f"Accessories for this product: {data['accessories']}.")
        if data.get('alternatives'):
            parts.append(f"Alternative products: {data['alternatives']}.")
        return " ".join(parts)

    return (
        f"Company: {data.get('company_name', '')}. "
        f"Product: {clean_name}. Category: {data.get('category', '')}. "
        f"Price: {data.get('price_included', 0)} {data.get('currency', 'USD')} (Final price including {data.get('tax_percent', 0)}% tax). "
        f"Base price without tax is {data.get('price_excluded', 0)} {data.get('currency', 'USD')}. "
        f"Description: {data.get('description', '')}. "
        f"Accessories for this product: {data.get('accessories', 'None')}. "
        f"Alternative products: {data.get('alternatives', 'None')}."
    )


def compute_content_hash(text_to_embed):
    """El hash incluye modelo y versión del texto: si cambia cualquiera, el vector se recalcula."""
    key = f"{Config.EMBEDDING_MODEL}|{Config.EMBED_TEXT_VERSION}|{text_to_embed}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def is_safe_webhook_url(url):
    """Evita SSRF: solo http(s) y, en producción, nunca IPs privadas/loopback/link-local."""
    if not url:
        return False
    try:
        parsed = urlparse(url)
    except ValueError:
        return False
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return False
    if Config.ALLOW_PRIVATE_WEBHOOKS:
        return True
    try:
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        infos = socket.getaddrinfo(parsed.hostname, port)
    except (socket.gaierror, ValueError):
        return False
    for info in infos:
        ip = ipaddress.ip_address(info[4][0].split("%")[0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            return False
    return True


def send_feedback_to_odoo(webhook_url, variant_id, error_message, api_key=None):
    if not webhook_url:
        return
    if not is_safe_webhook_url(webhook_url):
        log.warning("Webhook URL rejected (unsafe): %s", webhook_url)
        return
    body = json.dumps({"variant_id": variant_id, "error": error_message}).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if api_key:
        # Odoo verifica esta firma con su API key: nadie más puede inyectar errores falsos.
        headers["X-RAG-Signature"] = hmac.new(api_key.encode("utf-8"), body, hashlib.sha256).hexdigest()
    try:
        response = requests.post(webhook_url, data=body, headers=headers, timeout=5)
        log.info("Sent error feedback to Odoo. Status: %s", response.status_code)
    except Exception as e:  # pylint: disable=broad-except
        log.warning("Could not reach Odoo webhook: %s", e)


def get_retry_count(properties):
    headers = (properties.headers or {}) if properties else {}
    return int(headers.get("x-retry-count", 0))


def republish(ch, queue, body, properties, extra_headers):
    headers = dict((properties.headers or {}) if properties else {})
    headers.update(extra_headers)
    ch.basic_publish(
        exchange="",
        routing_key=queue,
        body=body,
        properties=pika.BasicProperties(delivery_mode=2, content_type="application/json", headers=headers),
    )


# ---------------------------------------------------------------------------
# Lógica de negocio
# ---------------------------------------------------------------------------
def _authenticate_tenant(cur, api_key, action):
    if not api_key:
        raise PermanentError(f"Missing API Key for action {action}.")
    cur.execute("""
        SELECT uc.user_id
        FROM user_configs uc
        JOIN users u ON u.id = uc.user_id
        WHERE uc.system_api_key = %s AND uc.is_active = TRUE AND u.is_active = TRUE
    """, (api_key,))
    row = cur.fetchone()
    if not row:
        raise PermanentError(f"Invalid or missing API Key for action {action}.")
    return row[0]


def _sync_companies(cur, user_id, data):
    companies_data = data.get('companies')
    if not isinstance(companies_data, list):
        raise PermanentError("'companies' must be a list.")
    for comp in companies_data:
        if not isinstance(comp, dict) or comp.get('id') in (None, "") or not comp.get('name'):
            raise PermanentError(f"Invalid company in handshake: {comp}")
        cur.execute("""
            INSERT INTO user_companies (user_id, platform, platform_company_id, company_name)
            VALUES (%s, 'odoo', %s, %s)
            ON CONFLICT (user_id, platform, platform_company_id)
            DO UPDATE SET company_name = EXCLUDED.company_name;
        """, (user_id, str(comp['id']), comp['name']))
    log.info("Handshake complete. Tenant %s synced %d companies.", user_id, len(companies_data))


def _ensure_company(cur, user_id, company_id, company_name):
    """
    Integridad tenant -> compañía (no hay FK en la BD porque existe 'global').
    - 'global' (producto compartido en Odoo): no requiere registro.
    - Compañía nueva (creada en Odoo después del handshake): se registra automáticamente.
    - Compañía desactivada por el administrador: se rechaza el producto.
    """
    if company_id == GLOBAL_COMPANY_ID:
        return

    cur.execute("""
        INSERT INTO user_companies (user_id, platform, platform_company_id, company_name)
        VALUES (%s, 'odoo', %s, %s)
        ON CONFLICT (user_id, platform, platform_company_id) DO NOTHING
        RETURNING id
    """, (user_id, company_id, company_name or f"Company {company_id}"))
    if cur.fetchone():
        log.info("Company %s auto-registered for tenant %s", company_id, user_id)
        return

    cur.execute("""
        SELECT is_active FROM user_companies
        WHERE user_id = %s AND platform = 'odoo' AND platform_company_id = %s
    """, (user_id, company_id))
    row = cur.fetchone()
    if not row or not row[0]:
        raise PermanentError(f"Company {company_id} is deactivated for this tenant.")


def _claim_version(cur, user_id, variant_id, event_ts):
    if event_ts is None:
        return True
    cur.execute("""
        INSERT INTO product_sync_versions (user_id, variant_id, source_ts)
        VALUES (%s, %s, %s)
        ON CONFLICT (user_id, variant_id) DO UPDATE
            SET source_ts = EXCLUDED.source_ts, updated_at = CURRENT_TIMESTAMP
            WHERE product_sync_versions.source_ts <= EXCLUDED.source_ts
        RETURNING source_ts
    """, (user_id, variant_id, event_ts))
    return cur.fetchone() is not None


def _upsert_product(cur, user_id, data):
    variant_id = data.get('variant_id')
    company_id = normalize_company_id(data.get('company_id'))
    _ensure_company(cur, user_id, company_id, data.get('company_name'))

    clean_name = clean_display_name(data.get('display_name', ''))
    if not clean_name:
        raise PermanentError("display_name is empty")

    text_to_embed = build_embedding_text(data, clean_name)
    content_hash = compute_content_hash(text_to_embed)
    template_id = normalize_template_id(data.get('template_id'))

    structured = (
        data.get('sku'), clean_name, data.get('description'),
        data.get('price_excluded'), data.get('price_included'), data.get('tax_percent'), data.get('currency'),
        data.get('stock'), data.get('category'), data.get('website_url'),
        data.get('image_128_url'), data.get('image_512_url'), data.get('image_1920_url'),
        company_id, data.get('company_name'),
        data.get('accessories', ''), data.get('alternatives', ''),
    )

    cur.execute("SELECT content_hash FROM product_embeddings WHERE variant_id = %s AND user_id = %s",
                (variant_id, user_id))
    existing = cur.fetchone()

    if existing and existing[0] == content_hash:
        cur.execute("""
            UPDATE product_embeddings SET
                sku = %s, display_name = %s, description = %s,
                price_excluded = %s, price_included = %s, tax_percent = %s, currency = %s,
                stock = %s, category = %s, website_url = %s,
                image_128_url = %s, image_512_url = %s, image_1920_url = %s,
                company_id = %s, company_name = %s, accessories = %s, alternatives = %s,
                template_id = %s
            WHERE variant_id = %s AND user_id = %s
        """, (*structured, template_id, variant_id, user_id))
        log.info("Variant %s updated (embedding reused, text and model unchanged).", variant_id)
        return

    t0 = time.perf_counter()
    vector = embedding_service.generate_vector(text_to_embed)
    embed_ms = (time.perf_counter() - t0) * 1000
    cur.execute("""
        INSERT INTO product_embeddings (
            variant_id, user_id, sku, display_name, description,
            price_excluded, price_included, tax_percent, currency,
            stock, category, website_url, image_128_url, image_512_url, image_1920_url,
            company_id, company_name, accessories, alternatives,
            embedding, content_hash, template_id, embedding_model
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s)
        ON CONFLICT (variant_id, user_id) DO UPDATE SET
            sku = EXCLUDED.sku,
            display_name = EXCLUDED.display_name,
            description = EXCLUDED.description,
            price_excluded = EXCLUDED.price_excluded,
            price_included = EXCLUDED.price_included,
            tax_percent = EXCLUDED.tax_percent,
            currency = EXCLUDED.currency,
            stock = EXCLUDED.stock,
            category = EXCLUDED.category,
            website_url = EXCLUDED.website_url,
            image_128_url = EXCLUDED.image_128_url,
            image_512_url = EXCLUDED.image_512_url,
            image_1920_url = EXCLUDED.image_1920_url,
            company_id = EXCLUDED.company_id,
            company_name = EXCLUDED.company_name,
            accessories = EXCLUDED.accessories,
            alternatives = EXCLUDED.alternatives,
            embedding = EXCLUDED.embedding,
            content_hash = EXCLUDED.content_hash,
            template_id = EXCLUDED.template_id,
            embedding_model = EXCLUDED.embedding_model;
    """, (variant_id, user_id, *structured, vector, content_hash, template_id, Config.EMBEDDING_MODEL))
    log.info("Variant %s (template %s) embedded with %s in %.0f ms and saved securely.",
             variant_id, template_id, Config.EMBEDDING_MODEL, embed_ms)


def _reconcile(cur, user_id, data, event_ts):
    """
    Odoo manda la lista COMPLETA de variantes que deben estar en el índice.
    Se borra todo lo demás de este tenant (productos huérfanos), excepto lo sincronizado
    en los últimos RECONCILE_GRACE_MINUTES (evita borrar un producto creado en Odoo
    mientras se armaba la lista).
    """
    if event_ts is None:
        raise PermanentError("reconcile requires event_ts.")
    variant_ids = data.get('variant_ids')
    if not isinstance(variant_ids, list):
        raise PermanentError("'variant_ids' must be a list.")
    try:
        valid_ids = sorted({int(v) for v in variant_ids})
    except (TypeError, ValueError) as e:
        raise PermanentError(f"Invalid variant id in reconcile: {e}") from e

    keep_newer_than = event_ts - Config.RECONCILE_GRACE_MINUTES * 60 * 1_000_000

    cur.execute("""
        DELETE FROM product_embeddings pe
        WHERE pe.user_id = %s
          AND pe.variant_id NOT IN (SELECT unnest(%s::int[]))
          AND NOT EXISTS (
              SELECT 1 FROM product_sync_versions v
              WHERE v.user_id = pe.user_id
                AND v.variant_id = pe.variant_id
                AND v.source_ts > %s
          )
        RETURNING pe.variant_id
    """, (user_id, valid_ids, keep_newer_than))
    removed = [row[0] for row in cur.fetchall()]

    if removed:
        # Lápidas: un create/update viejo que llegue después no puede resucitarlos
        cur.execute("""
            INSERT INTO product_sync_versions (user_id, variant_id, source_ts)
            SELECT %s, unnest(%s::int[]), %s
            ON CONFLICT (user_id, variant_id) DO UPDATE
                SET source_ts = EXCLUDED.source_ts, updated_at = CURRENT_TIMESTAMP
                WHERE product_sync_versions.source_ts <= EXCLUDED.source_ts
        """, (user_id, removed, event_ts))

    log.info("Reconcile for tenant %s: %d valid variant(s) in Odoo, %d orphan(s) removed %s",
             user_id, len(valid_ids), len(removed), removed[:20])


def _handle(cur, data):
    action = data.get('action')
    user_id = _authenticate_tenant(cur, data.get('api_key'), action)
    event_ts = normalize_event_ts(data.get('event_ts'))
    log.info("Processing '%s' (Tenant ID: %s)...", action, user_id)

    if action == 'sync_companies':
        _sync_companies(cur, user_id, data)
        return

    if action == 'reconcile':
        _reconcile(cur, user_id, data, event_ts)
        return

    if action not in VALID_PRODUCT_ACTIONS and action != 'delete':
        raise PermanentError(f"Unknown action '{action}'.")

    variant_id = data.get('variant_id')
    if variant_id is None:
        raise PermanentError("variant_id is required.")

    if not _claim_version(cur, user_id, variant_id, event_ts):
        log.info("Variant %s: stale '%s' event skipped (event_ts=%s is older than the last applied).",
                 variant_id, action, event_ts)
        return

    if action == 'delete':
        cur.execute("DELETE FROM product_embeddings WHERE variant_id = %s AND user_id = %s", (variant_id, user_id))
        log.info("Variant %s deleted securely.", variant_id)
        return

    _upsert_product(cur, user_id, data)


def _log_sync_lag(data):
    """Latencia extremo a extremo: guardado en Odoo -> aplicado en el índice (métrica para RNF-03)."""
    event_ts = normalize_event_ts(data.get('event_ts'))
    if event_ts:
        lag_ms = (time.time_ns() // 1000 - event_ts) / 1000
        log.info("[LAG] action=%s variant=%s sync_lag_ms=%.0f",
                 data.get('action'), data.get('variant_id'), lag_ms)


def process_product_message(ch, method, properties, body):
    conn = None
    variant_id = None
    webhook_url = None
    api_key = None

    try:
        try:
            data = json.loads(body)
        except (TypeError, ValueError) as e:
            raise PermanentError(f"Malformed JSON: {e}") from e
        if not isinstance(data, dict):
            raise PermanentError("Payload must be a JSON object.")

        variant_id = data.get('variant_id')
        webhook_url = data.get('webhook_url')
        api_key = data.get('api_key')

        conn = get_db_connection()
        with conn.cursor() as cur:
            _handle(cur, data)
        conn.commit()
        ch.basic_ack(delivery_tag=method.delivery_tag)
        _log_sync_lag(data)

    except PermanentError as e:
        if conn:
            conn.rollback()
        log.error("[PARKING] variant=%s: %s", variant_id, e)
        republish(ch, Config.PARKING_QUEUE_NAME, body, properties, {"x-error": str(e)[:500]})
        send_feedback_to_odoo(webhook_url, variant_id, str(e), api_key)
        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        if conn:
            conn.rollback()
        attempts = get_retry_count(properties)
        error_msg = f"Database or processing failure: {e}"
        if attempts >= Config.MAX_RETRIES:
            log.error("[PARKING] variant=%s failed after %d retries: %s", variant_id, attempts, e)
            republish(ch, Config.PARKING_QUEUE_NAME, body, properties, {"x-error": error_msg[:500]})
            send_feedback_to_odoo(webhook_url, variant_id, error_msg, api_key)
        else:
            log.warning("[RETRY %d/%d] variant=%s: %s", attempts + 1, Config.MAX_RETRIES, variant_id, e)
            republish(ch, Config.RETRY_QUEUE_NAME, body, properties,
                      {"x-retry-count": attempts + 1, "x-error": error_msg[:500]})
        ch.basic_ack(delivery_tag=method.delivery_tag)

    finally:
        if conn:
            conn.close()