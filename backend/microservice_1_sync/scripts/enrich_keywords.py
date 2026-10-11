"""Completa las palabras clave pendientes sin esperar al hilo de MS1 (útil tras aplicar la migración 004).

Uso (desde backend/microservice_1_sync, con DATABASE_URL y EMBED_TEXT_VERSION=v4 en el entorno):
    python -m scripts.enrich_keywords --dry-run      # muestra keywords del primer lote, no guarda nada
    python -m scripts.enrich_keywords                # procesa todo, esperando si Groq pide pausa
"""
import argparse
import time

from config.settings import Config
from database.connection import new_db_connection
from services.keyword_enrichment import enrich_pending, fetch_pending_groups, get_groq_api_key
from services.keyword_service import KeywordsRateLimited, generate_keywords_batch


def dry_run(conn):
    with conn.cursor() as cur:
        api_key = get_groq_api_key(cur)
        groups = fetch_pending_groups(cur, Config.KEYWORDS_BATCH_SIZE)
    conn.rollback()
    if not api_key or not groups:
        print("Nothing to do (no API key or no pending products).")
        return
    result = generate_keywords_batch([g["prompt"] for g in groups], api_key)
    for index, group in enumerate(groups):
        print(f"- {group['prompt']['name']} ({len(group['variants'])} variant/s): {result.get(index, '(none)')}")


def main(argv=None):
    parser = argparse.ArgumentParser(description="Generate search keywords for pending products.")
    parser.add_argument("--dry-run", action="store_true", help="Print keywords for one batch without saving.")
    parser.add_argument("--max-cycles", type=int, default=200, help="Safety limit of enrichment cycles.")
    args = parser.parse_args(argv)

    conn = new_db_connection()
    try:
        if args.dry_run:
            dry_run(conn)
            return
        total = 0
        for _ in range(args.max_cycles):
            try:
                done = enrich_pending(conn)
            except KeywordsRateLimited:
                print(f"Groq rate limit: waiting {Config.KEYWORDS_INTERVAL_SECONDS}s...")
                time.sleep(Config.KEYWORDS_INTERVAL_SECONDS)
                continue
            if done == 0:
                break
            total += done
            print(f"{total} product group(s) enriched so far...")
        print(f"Finished: {total} product group(s) enriched.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
