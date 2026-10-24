"""Fase 0 — Línea base, defecto del modelo desalineado y comparación de modelos de embeddings (E2, E4).

Configuraciones sobre las 46 consultas originales (top 5 crudo por similitud coseno, sin umbral):
  A_antes   consulta con all-MiniLM-L6-v2 contra el catálogo multilingüe   -> el defecto que tuvo MS3
  B_ahora   paraphrase-multilingual-MiniLM-L12-v2 en ambos lados          -> el modelo en producción
  C_minilm  all-MiniLM-L6-v2 en ambos lados (solo inglés)
  D_e5small intfloat/multilingual-e5-small en ambos lados (prefijos query:/passage:)
El catálogo se vectoriza localmente con el texto v3 (sin keywords), igual que estaba en producción
antes de la expansión de documentos.

Uso:  python backend/evaluation/eval_models.py
"""
import time

import numpy as np
import torch
from sentence_transformers import SentenceTransformer

from common import (E5, K, MINI, MULTI, embedding_text, load_products, normalize, print_table,
                    resolve_relevant, variant_metrics)
from queries import QUERIES, USER_REPORTED


def main():
    torch.set_num_threads(1)
    products = load_products()
    print(f"{len(products)} variantes del tenant · modelo guardado en BD: {sorted({p['embedding_model'] for p in products})}")
    models = {name: SentenceTransformer(name) for name in (MULTI, MINI, E5)}
    texts = [embedding_text(p) for p in products]

    # Chequeo de cordura: el vector guardado corresponde al texto que MS1 dice vectorizar (hoy v4 con keywords).
    stored = normalize(np.stack([p["stored"] for p in products]))
    v4 = normalize(models[MULTI].encode([embedding_text(p, p["keywords"]) for p in products], batch_size=32,
                                        show_progress_bar=False))
    cos = (stored * v4).sum(axis=1)
    print(f"Cordura (guardado vs texto v4 recalculado): min={cos.min():.4f} mediana={np.median(cos):.4f}")

    docs = {
        "A_antes": normalize(models[MULTI].encode(texts, batch_size=32, show_progress_bar=False)),
        "C_minilm": normalize(models[MINI].encode(texts, batch_size=32, show_progress_bar=False)),
        "D_e5small": normalize(models[E5].encode([f"passage: {t}" for t in texts], batch_size=32,
                                                 show_progress_bar=False)),
    }
    docs["B_ahora"] = docs["A_antes"]
    query_model = {"A_antes": MINI, "B_ahora": MULTI, "C_minilm": MINI, "D_e5small": E5}

    def encode_query(cfg, q):
        return normalize(models[query_model[cfg]].encode([f"query: {q}" if cfg == "D_e5small" else q],
                                                         show_progress_bar=False))[0]

    results, ranked_by_cfg, scores_by_cfg = {}, {}, {}
    for cfg in ("A_antes", "B_ahora", "C_minilm", "D_e5small"):
        metrics, ranked_all, scored = [], [], []
        for q in QUERIES:
            idx = [i for i, p in enumerate(products) if p["company_id"] == q["company_id"]]
            company = [products[i] for i in idx]
            relevant = resolve_relevant(q["relevant"], company)
            sims = docs[cfg][idx] @ encode_query(cfg, q["query"])
            order = np.argsort(-sims)
            ranked = [company[j]["variant_id"] for j in order]
            ranked_all.append((q, ranked))
            scored.append((relevant, [(company[j]["variant_id"], float(sims[j])) for j in order[:K]]))
            if relevant:
                metrics.append(variant_metrics(ranked, relevant))
        results[cfg] = {k: float(np.mean([m[k] for m in metrics])) for k in metrics[0]}
        ranked_by_cfg[cfg], scores_by_cfg[cfg] = ranked_all, scored
    print_table("Fase 0 · 46 consultas, top 5 por variante (sin umbral)", results)

    print("\nReproducción del defecto (A_antes vs lo que devolvió producción):")
    for item in USER_REPORTED:
        got = next(rk for q, rk in ranked_by_cfg["A_antes"]
                   if q["query"] == item["query"] and q["company_id"] == item["company_id"])[:K]
        print(f"  {item['query']:<12} mismo conjunto={set(got) == set(item['top5'])} mismo orden={got == item['top5']}")

    print("\nCalibración del umbral absoluto (modelo en producción, similitud cruda):")
    for t in np.arange(0.20, 0.55, 0.05):
        kept_rel = kept = pos_ok = neg_empty = n_pos = n_neg = 0
        for relevant, top in scores_by_cfg["B_ahora"]:
            shown = [v for v, s in top if s >= t]
            kept += len(shown)
            kept_rel += sum(v in relevant for v in shown)
            if relevant:
                n_pos += 1
                pos_ok += any(v in relevant for v in shown)
            else:
                n_neg += 1
                neg_empty += not shown
        print(f"  t={t:.2f} precision={kept_rel / max(kept, 1):.3f} "
              f"consultas_con_relevante={pos_ok / n_pos:.3f} negativas_vacias={neg_empty / n_neg:.3f}")

    print("\nLatencia de un embedding de consulta (CPU, 1 hilo, promedio de 20):")
    for name, model in models.items():
        model.encode(["calentamiento"], show_progress_bar=False)
        t0 = time.perf_counter()
        for _ in range(20):
            model.encode(["audifonos inalambricos para correr"], show_progress_bar=False)
        print(f"  {name:<40} {(time.perf_counter() - t0) / 20 * 1000:6.1f} ms")


if __name__ == "__main__":
    main()
