"""Enriquecimiento en segundo plano: completa search_keywords de los productos pendientes y recalcula su
vector. Corre en un hilo aparte con su propia conexión, así el consumidor de RabbitMQ nunca espera al LLM."""
import logging
import threading

from config.settings import Config
from controllers.message_controller import (
    build_embedding_text, build_search_text, clean_description, compute_content_hash,
    compute_keywords_source_hash, keywords_base_name,
)
from database.connection import new_db_connection
from services.embedding_service import embedding_service
from services.keyword_service import KeywordsRateLimited, KeywordsUnavailable, generate_keywords_batch

log = logging.getLogger("sync.enrichment")


def get_groq_api_key(cur):
    """La misma key que configura el admin para el chat (global_settings); la variable es respaldo."""
    cur.execute("SELECT groq_api_key FROM global_settings WHERE id = 1")
    row = cur.fetchone()
    return (row[0] if row and row[0] else None) or Config.GROQ_API_KEY or None


def fetch_pending_groups(cur, max_groups):
    """Productos sin keywords agrupados por tenant + contenido: las variantes de una plantilla (y el mismo
    producto en varias compañías) comparten una sola llamada al LLM."""
    cur.execute("""
        SELECT variant_id, user_id, display_name, category, description, keywords_source_hash
        FROM product_embeddings
        WHERE search_keywords IS NULL AND keywords_attempts < %s
        ORDER BY user_id, template_id NULLS LAST, variant_id
        LIMIT %s
    """, (Config.KEYWORDS_MAX_ATTEMPTS, max_groups * 10))
    groups = {}
    for variant_id, user_id, name, category, description, stored_hash in cur.fetchall():
        source_hash = compute_keywords_source_hash(name, category, description)
        group = groups.get((user_id, source_hash))
        if group is None:
            if len(groups) >= max_groups:
                continue
            group = groups[(user_id, source_hash)] = {
                "user_id": user_id, "source_hash": source_hash, "variants": [],
                "prompt": {"name": keywords_base_name(name), "category": category,
                           "description": clean_description(description, 400)},
            }
        group["variants"].append({"variant_id": variant_id, "name": name, "category": category,
                                  "description": description, "stored_hash": stored_hash})
    return list(groups.values())


def apply_keywords(cur, group, keywords):
    """Guarda keywords, search_text y el vector nuevo (texto v4). El WHERE evita pisar un producto que el
    consumidor actualizó mientras el LLM respondía (su keywords_source_hash ya sería otro)."""
    for v in group["variants"]:
        text = build_embedding_text({"category": v["category"], "description": v["description"]}, v["name"], keywords)
        cur.execute("""
            UPDATE product_embeddings SET
                search_keywords = %s, keywords_source_hash = %s, search_text = %s,
                embedding = %s, content_hash = %s, embedding_model = %s, keywords_updated_at = CURRENT_TIMESTAMP
            WHERE variant_id = %s AND user_id = %s AND search_keywords IS NULL
              AND (keywords_source_hash IS NULL OR keywords_source_hash = %s)
        """, (keywords, group["source_hash"], build_search_text(v["name"], v["category"], keywords),
              embedding_service.generate_vector(text), compute_content_hash(text), Config.EMBEDDING_MODEL,
              v["variant_id"], group["user_id"], group["source_hash"]))


def mark_failed(cur, groups):
    for group in groups:
        cur.execute("""
            UPDATE product_embeddings SET keywords_attempts = keywords_attempts + 1
            WHERE user_id = %s AND variant_id = ANY(%s) AND search_keywords IS NULL
        """, (group["user_id"], [v["variant_id"] for v in group["variants"]]))


def enrich_pending(conn, max_batches=None):
    """Un ciclo: hasta max_batches llamadas al LLM. Devuelve cuántos grupos se completaron.
    Lanza KeywordsRateLimited si Groq pide esperar (los pendientes quedan para el próximo ciclo)."""
    max_batches = max_batches or Config.KEYWORDS_BATCHES_PER_CYCLE
    with conn.cursor() as cur:
        api_key = get_groq_api_key(cur)
        if not api_key:
            log.warning("Keywords skipped: no Groq API key in global_settings or GROQ_API_KEY.")
            return 0
        groups = fetch_pending_groups(cur, Config.KEYWORDS_BATCH_SIZE * max_batches)
    conn.commit()

    done = 0
    for start in range(0, len(groups), Config.KEYWORDS_BATCH_SIZE):
        batch = groups[start:start + Config.KEYWORDS_BATCH_SIZE]
        try:
            result = generate_keywords_batch([g["prompt"] for g in batch], api_key)
        except KeywordsUnavailable as exc:
            log.warning("Keywords batch failed (%s); %d product group(s) will be retried.", exc, len(batch))
            with conn.cursor() as cur:
                mark_failed(cur, batch)
            conn.commit()
            continue
        with conn.cursor() as cur:
            for index, group in enumerate(batch):
                if index in result:
                    apply_keywords(cur, group, result[index])
                    done += 1
            mark_failed(cur, [g for i, g in enumerate(batch) if i not in result])
        conn.commit()
        log.info("Keywords generated for %d/%d product group(s).", len(result), len(batch))
    return done


def run_forever(stop_event):
    """Bucle del hilo: un error nunca lo detiene; con 429 o sin pendientes espera el intervalo."""
    conn = None
    while not stop_event.is_set():
        try:
            if conn is None or conn.closed:
                conn = new_db_connection()
            enrich_pending(conn)
        except KeywordsRateLimited:
            log.info("Groq rate limit reached: keywords continue in %ss.", Config.KEYWORDS_INTERVAL_SECONDS)
        except Exception as exc:  # pylint: disable=broad-except
            log.warning("Keyword enrichment cycle failed: %s: %s", type(exc).__name__, exc)
            if conn is not None:
                try:
                    conn.close()
                except Exception:  # pylint: disable=broad-except
                    pass
            conn = None
        stop_event.wait(Config.KEYWORDS_INTERVAL_SECONDS)


def start_background_enrichment():
    """Arranca el hilo (daemon: no impide apagar el worker). Devuelve el evento para detenerlo."""
    stop_event = threading.Event()
    if not Config.KEYWORDS_ENABLED:
        log.info("Keyword enrichment disabled (KEYWORDS_ENABLED=false).")
        return stop_event
    threading.Thread(target=run_forever, args=(stop_event,), name="keyword-enrichment", daemon=True).start()
    log.info("Keyword enrichment running every %ss with %s.", Config.KEYWORDS_INTERVAL_SECONDS,
             Config.KEYWORDS_LLM_MODEL)
    return stop_event
