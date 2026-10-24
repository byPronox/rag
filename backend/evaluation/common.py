"""Utilidades compartidas de la evaluación offline de la búsqueda (solo lectura).

- Carga el catálogo desde Postgres con un usuario de SOLO LECTURA (DATABASE_URL en .env.eval).
- Reproduce exactamente el texto que MS1 vectoriza (v3 y v4).
- Calcula las métricas de recuperación: Hit@1, MRR, nDCG@5, Recall@5, P@k y vacío en negativos.
"""
import json
import os
import re
import sys

import numpy as np
import psycopg2
from dotenv import dotenv_values

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ENV_PATH = os.getenv("EVAL_ENV_FILE", os.path.join(REPO, ".env.eval"))
MS3_PATH = os.path.join(REPO, "backend", "microservice_3_rag")
sys.path.insert(0, MS3_PATH)  # para importar el ranking y el texto de MS3 tal como corren en producción

USER_ID = 3          # tenant evaluado (Unifcom)
K = 5                # profundidad de las métricas
EMBED_DESCRIPTION_CHARS = 350
MULTI = "paraphrase-multilingual-MiniLM-L12-v2"
MINI = "all-MiniLM-L6-v2"
E5 = "intfloat/multilingual-e5-small"


# --- Réplica exacta de MS1 (controllers/message_controller.py) ---
def clean_display_name(raw):
    return re.sub(r'^\[.*?\]\s*', '', raw or '')


def clean_description(raw, max_chars=EMBED_DESCRIPTION_CHARS):
    text = re.sub(r"<[^>]+>", " ", raw or "")
    text = re.split(r"(?i)\b(especificaciones|specifications)\b", text, maxsplit=1)[0]
    text = re.sub(r"[*•●▪◦_#`]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip(" .:-")
    if len(text) > max_chars:
        text = text[:max_chars].rsplit(" ", 1)[0]
    return text


def embedding_text(p, keywords=None):
    """v3 sin keywords; v4 = v3 con las keywords antes de la descripción (como MS1)."""
    name = clean_display_name(p["display_name"])
    parts = [f"{name}."]
    if p["category"]:
        parts.append(f"{p['category']}.")
    if keywords:
        parts.append(", ".join(keywords) + ".")
    desc = clean_description(p["description"])
    if desc and desc.lower() != name.lower():
        parts.append(f"{desc}.")
    return " ".join(parts)


# --- Datos ---
def load_products():
    """Todas las variantes del tenant, con su vector guardado y sus keywords (si existen)."""
    url = dotenv_values(ENV_PATH).get("DATABASE_URL")
    if not url:
        sys.exit(f"DATABASE_URL no encontrado en {ENV_PATH}")
    conn = psycopg2.connect(url.replace("postgres://", "postgresql://", 1))
    conn.set_session(readonly=True)
    with conn.cursor() as cur:
        cur.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'product_embeddings' AND column_name = 'search_keywords'
        """)
        has_keywords = cur.fetchone() is not None
        cur.execute(f"""
            SELECT variant_id, company_id, display_name, category, description, stock, template_id,
                   embedding_model, embedding::text, {'search_keywords' if has_keywords else 'NULL'}
            FROM product_embeddings WHERE user_id = %s ORDER BY variant_id
        """, (USER_ID,))
        rows = cur.fetchall()
    conn.close()
    return [{
        "variant_id": r[0], "company_id": r[1], "display_name": r[2], "name": r[2], "category": r[3],
        "description": r[4], "stock": float(r[5] or 0), "template_id": r[6], "embedding_model": r[7],
        "stored": np.array(json.loads(r[8]), dtype=np.float32) if r[8] else None,
        "keywords": list(r[9] or []),
    } for r in rows]


def normalize(m):
    m = np.asarray(m, dtype=np.float32)
    return m / np.linalg.norm(m, axis=-1, keepdims=True)


def resolve_relevant(spec, company_products):
    """Las etiquetas son una lista de variant_id o una función sobre el producto (ej. una categoría)."""
    if callable(spec):
        return {p["variant_id"] for p in company_products if spec(p)}
    return set(spec)


# --- Métricas ---
def variant_metrics(ranked_ids, relevant):
    """Fase 0: métricas por variante sobre el top 5 crudo (sin umbral)."""
    hits = [1 if v in relevant else 0 for v in ranked_ids[:K]]
    dcg = sum(h / np.log2(i + 2) for i, h in enumerate(hits))
    idcg = sum(1 / np.log2(i + 2) for i in range(min(len(relevant), K)))
    return {"P@5": sum(hits) / K, "MRR": next((1 / (i + 1) for i, h in enumerate(hits) if h), 0.0),
            "nDCG@5": dcg / idcg, "Hit@1": hits[0] if hits else 0}


def template_metrics(rows):
    """Lo que ve el usuario: cada plantilla (producto) cuenta una vez, y la lista puede venir corta o vacía.
    rows = [{"rel": set de template_id relevantes, "shown": [template_id mostrados en orden]}]."""
    pos = [r for r in rows if r["rel"]]
    neg = [r for r in rows if not r["rel"]]
    hit1 = mrr = recall = ndcg = shown_rel = shown = 0.0
    for r in pos:
        # Una plantilla repetida (otra variante del mismo producto) no es un acierto nuevo: ocupa un lugar.
        flags = [t in r["rel"] and t not in r["shown"][:i] for i, t in enumerate(r["shown"])]
        hit1 += bool(flags and flags[0])
        mrr += next((1 / (i + 1) for i, f in enumerate(flags) if f), 0)
        recall += sum(flags) / min(len(r["rel"]), K)
        dcg = sum(f / np.log2(i + 2) for i, f in enumerate(flags))
        ndcg += dcg / sum(1 / np.log2(i + 2) for i in range(min(len(r["rel"]), K)))
    for r in rows:
        flags = [t in r["rel"] for t in r["shown"]]
        shown_rel += sum(flags)
        shown += len(flags)
    n = len(pos)
    return {"Hit@1": hit1 / n, "MRR": mrr / n, "nDCG@5": ndcg / n, "Recall@5": recall / n,
            "P@k": shown_rel / shown if shown else 0.0,
            "vacio_neg": sum(1 for r in neg if not r["shown"]) / len(neg) if neg else 0.0}


def print_table(title, results):
    print(f"\n=== {title}")
    keys = list(next(iter(results.values())).keys())
    print(f"{'configuración':<30}" + "".join(f"{k:>11}" for k in keys))
    for name, m in results.items():
        print(f"{name:<30}" + "".join(f"{v:>11.3f}" for v in m.values()))
