"""Fases 1-2 (umbral, ranking híbrido) y E6 (document expansion), sobre las 90 consultas.

Cada configuración agrega UNA capa a la anterior (ablación), para aislar su aporte:
  R0  top 5 crudo por vector, sin umbral (variantes repetidas incluidas)
  R1  + umbral absoluto 0.35 (sin bonos léxicos)
  R2  + margen relativo 0.10, bonos léxicos lineales y una variante por plantilla  (Fases 1-2)
  L2  + keywords del LLM en la rama léxica (vectores v3 todavía)
  L3  + keywords dentro del vector (texto v4)
  L4  + tolerancia a errores de tipeo
  L5  + bonos de nombre y keywords subidos a 0.30 (lineales)
  PROD ranking real de MS3 (bono cuadrático) + SQL real de MS3 contra la BD, con los vectores y las
       keywords que MS1 dejó en producción. Además, el umbral en 0.30 / 0.35 / 0.40.

R0-L5 simulan la recuperación de MS3 en memoria (top 50 por vector ∪ coincidencias léxicas).
PROD ejecuta services/pgvector_service.search_products tal como corre en Railway (solo SELECT).

Uso:  python backend/evaluation/eval_ranking.py [--detalle]
"""
import os
import sys
from dataclasses import dataclass, replace
from functools import lru_cache

import numpy as np
import torch
from dotenv import dotenv_values
from sentence_transformers import SentenceTransformer

from common import (ENV_PATH, K, MULTI, embedding_text, load_products, normalize, print_table,
                    resolve_relevant, template_metrics)
from queries import QUERIES, QUERIES_SYN

# El código de MS3 lee DATABASE_URL al importarse: se usa el mismo usuario de solo lectura.
os.environ["DATABASE_URL"] = dotenv_values(ENV_PATH)["DATABASE_URL"]
from sqlalchemy import text  # noqa: E402
from database.connection import SessionLocal  # noqa: E402  (MS3)
from services.ranking import RankingParams, rank_products  # noqa: E402  (MS3)
from services.pgvector_service import search_products  # noqa: E402  (MS3)
from services.text_utils import content_tokens, tokens_match  # noqa: E402  (MS3)

CANDIDATES = 50


# --- Ranking experimental (lineal) que se usó para medir capa por capa antes de fijar el de MS3 ---
@dataclass(frozen=True)
class Options:
    min_similarity: float = 0.35
    relative_margin: float = 0.10
    name_weight: float = 0.15
    category_weight: float = 0.10
    keyword_weight: float = 0.0
    fuzzy: bool = False
    out_of_stock_penalty: float = 0.05
    strong_ratio: float = 0.6
    dedupe: bool = True


def coverage(q_tokens, tokens, fuzzy):
    if not q_tokens or not tokens:
        return 0.0
    return sum(1 for q in q_tokens if any(tokens_match(q, t, fuzzy) for t in tokens)) / len(q_tokens)


def rank_linear(query, candidates, opt):
    if not candidates:
        return []
    q = content_tokens(query)
    floor = max(opt.min_similarity, max(p["similarity"] for p in candidates) - opt.relative_margin)
    scored = []
    for p in candidates:
        tok = p["_tok"]
        name_r, cat_r = coverage(q, tok["name"], opt.fuzzy), coverage(q, tok["cat"], opt.fuzzy)
        kw_r = coverage(q, tok["kw"], opt.fuzzy) if opt.keyword_weight else 0.0
        strong = max(name_r, cat_r, kw_r) >= opt.strong_ratio
        if (opt.name_weight or opt.category_weight) and not strong and p["similarity"] < floor:
            continue
        if not (opt.name_weight or opt.category_weight) and p["similarity"] < floor:
            continue
        score = (p["similarity"] + opt.name_weight * name_r + opt.category_weight * cat_r
                 + opt.keyword_weight * kw_r - (opt.out_of_stock_penalty if p["stock"] <= 0 else 0))
        scored.append({**p, "score": score})
    if opt.dedupe:
        best = {}
        for p in scored:
            k = p["template_id"] or f"v{p['variant_id']}"
            if k not in best or (p["score"], p["stock"]) > (best[k]["score"], best[k]["stock"]):
                best[k] = p
        scored = list(best.values())
    return sorted(scored, key=lambda p: -p["score"])[:K]


@lru_cache(maxsize=None)
def trigrams(word):
    w = f"  {word} "
    return frozenset(w[i:i + 3] for i in range(len(w) - 2))


def run_production(queries, qvecs, prod_params):
    """SQL + ranking reales de MS3. Una sesión corta por consulta: una sesión ociosa durante la simulación
    la cierra el proxy de Railway."""
    shown_by = {name: [] for name in prod_params}
    for q, qv in zip(queries, qvecs):
        with SessionLocal() as db:
            db.execute(text("SET TRANSACTION READ ONLY"))
            for name, params in prod_params.items():
                shown_by[name].append(search_products(db, 3, q["company_id"], q["query"], qv.tolist(), params))
            db.rollback()
    return shown_by


def lexical_candidates(query, pool, use_kw, fuzzy):
    """Simula la rama léxica del SQL de MS3: LIKE por palabra y, con tipeo, similitud de trigramas."""
    tokens = [t for t in content_tokens(query) if len(t) >= 3]
    out = []
    for p in pool:
        words = p["_tok"]["name"] + p["_tok"]["cat"] + (p["_tok"]["kw"] if use_kw else [])
        hay = " ".join(words)
        hit = any(t in hay for t in tokens)
        if not hit and fuzzy:
            hit = any(len(trigrams(t) & trigrams(w)) / len(trigrams(t) | trigrams(w)) >= 0.3
                      for t in tokens if len(t) >= 4 for w in words)
        if hit:
            out.append(p)
    return out


def main():
    torch.set_num_threads(1)
    products = load_products()
    model = SentenceTransformer(MULTI)
    for p in products:
        p["_tok"] = {"name": content_tokens(p["name"]), "cat": content_tokens(p["category"]),
                     "kw": content_tokens(" ".join(p["keywords"]))}
    v3 = normalize(model.encode([embedding_text(p) for p in products], batch_size=32, show_progress_bar=False))
    v4 = normalize(model.encode([embedding_text(p, p["keywords"]) for p in products], batch_size=32,
                                show_progress_bar=False))
    with_kw = sum(1 for p in products if p["keywords"])
    print(f"{len(products)} variantes, {with_kw} con keywords generadas por MS1")

    base = Options()
    sim_configs = {
        "R0 top5 crudo": (v3, None, (False, False)),
        "R1 + umbral 0.35": (v3, replace(base, relative_margin=1.0, name_weight=0, category_weight=0,
                                         out_of_stock_penalty=0, dedupe=False), (False, False)),
        "R2 + híbrido (Fases 1-2)": (v3, base, (False, False)),
        "L2 + keywords léxico": (v3, replace(base, keyword_weight=0.10), (True, False)),
        "L3 + keywords en vector v4": (v4, replace(base, keyword_weight=0.10), (True, False)),
        "L4 + tipeo": (v4, replace(base, keyword_weight=0.10, fuzzy=True), (True, True)),
        "L5 + bonos 0.30 lineales": (v4, replace(base, keyword_weight=0.30, name_weight=0.30, fuzzy=True),
                                     (True, True)),
    }
    prod_params = {f"PROD MS3 umbral {t:.2f}": RankingParams(min_similarity=t, relative_margin=0.10, limit=K)
                   for t in (0.30, 0.35, 0.40)}

    report, detail = {}, {}
    for set_name, queries in (("Originales (46)", QUERIES), ("Difíciles (44)", QUERIES_SYN)):
        qvecs = normalize(model.encode([q["query"] for q in queries], show_progress_bar=False))
        prod_shown = run_production(queries, qvecs, prod_params)
        rows = {name: [] for name in [*sim_configs, *prod_params]}
        for qi, (q, qv) in enumerate(zip(queries, qvecs)):
            company = [p for p in products if p["company_id"] == q["company_id"]]
            rel_ids = resolve_relevant(q["relevant"], company)
            rel = {p["template_id"] for p in company if p["variant_id"] in rel_ids}
            idx = [i for i, p in enumerate(products) if p["company_id"] in (q["company_id"], "global")]
            for name, (docs, opt, (use_kw, fuzzy)) in sim_configs.items():
                sims = docs[idx] @ qv
                pool = [dict(products[i], similarity=float(s)) for i, s in zip(idx, sims)]
                by_vec = sorted(pool, key=lambda p: -p["similarity"])
                if opt is None:
                    shown = by_vec[:K]
                else:
                    cands = {p["variant_id"]: p for p in by_vec[:CANDIDATES]}
                    for p in lexical_candidates(q["query"], pool, use_kw, fuzzy):
                        cands.setdefault(p["variant_id"], p)
                    shown = rank_linear(q["query"], list(cands.values()), opt)
                rows[name].append({"rel": rel, "shown": [p["template_id"] for p in shown]})
            for name in prod_params:
                shown = prod_shown[name][qi]
                rows[name].append({"rel": rel, "shown": [p["template_id"] for p in shown]})
                if name.endswith("0.35"):
                    detail.setdefault(set_name, []).append(
                        f"[{q['company_id']}] {q['query'][:28]:<28} " + (" | ".join(
                            f"{p['score']:.2f}{'*' if p['template_id'] in rel else ''} {p['name'].strip()[:22]}"
                            for p in shown) or "(vacío)"))
        report[set_name] = {name: template_metrics(r) for name, r in rows.items()}

    for set_name, results in report.items():
        print_table(set_name, results)
    if "--detalle" in sys.argv:
        for set_name, lines in detail.items():
            print(f"\n### Producción (umbral 0.35) · {set_name}   (* = relevante)")
            print("\n".join(lines))


if __name__ == "__main__":
    main()
