import logging
import time
from dataclasses import replace
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from api.deps import get_active_company, validate_tenant_api_key
from config.settings import settings
from database.connection import SessionLocal, get_db
from services.embedding_service import embedding_service
from services.pgvector_service import public_product, search_params, search_products

log = logging.getLogger("rag.search")
router = APIRouter()

# Se detecta una vez si la migración 003 (métricas de búsqueda) ya está aplicada.
_history_has_metrics = None


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=300)
    company_id: str = Field(..., min_length=1, max_length=100)
    session_id: Optional[str] = Field(None, max_length=100)
    limit: Optional[int] = Field(None, ge=1)
    category: Optional[str] = Field(None, max_length=100)
    min_price: Optional[float] = Field(None, ge=0)
    max_price: Optional[float] = Field(None, ge=0)
    in_stock_only: bool = False


def _supports_metrics(db):
    global _history_has_metrics  # pylint: disable=global-statement
    if _history_has_metrics is None:
        count = db.execute(text("""
            SELECT count(*) FROM information_schema.columns
            WHERE table_name = 'search_history' AND column_name IN ('results_count', 'top_score', 'latency_ms')
        """)).scalar()
        _history_has_metrics = count == 3
    return _history_has_metrics


def save_search_history(db, user_id, request, results, latency_ms):
    """El historial nunca debe romper la búsqueda: si falla, se registra y se sigue."""
    values = {"uid": user_id, "cid": request.company_id, "sid": request.session_id, "q": request.query}
    try:
        if _supports_metrics(db):
            db.execute(text("""
                INSERT INTO search_history
                    (user_id, company_id, session_id, query_text, results_count, top_score, latency_ms)
                VALUES (:uid, :cid, :sid, :q, :count, :top, :lat)
            """), {**values, "count": len(results),
                   "top": results[0]["similarity"] if results else None, "lat": latency_ms})
        else:
            db.execute(text("""
                INSERT INTO search_history (user_id, company_id, session_id, query_text)
                VALUES (:uid, :cid, :sid, :q)
            """), values)
        db.commit()
    except Exception as exc:  # pylint: disable=broad-except
        db.rollback()
        log.warning("Could not save search history: %s", type(exc).__name__)


def save_search_history_background(user_id, request, results, latency_ms):
    """Se ejecuta después de enviar la respuesta, con su propia sesión: la del endpoint
    ya puede estar cerrada para entonces."""
    db = SessionLocal()
    try:
        save_search_history(db, user_id, request, results, latency_ms)
    finally:
        db.close()


@router.post("/")
def semantic_search(request: SearchRequest, background_tasks: BackgroundTasks,
                    db: Session = Depends(get_db),
                    auth: dict = Depends(validate_tenant_api_key)):
    start = time.perf_counter()
    query = request.query.strip()
    get_active_company(db, auth["user_id"], request.company_id)

    params = search_params()
    if request.limit:
        params = replace(params, limit=min(request.limit, settings.SEARCH_MAX_LIMIT))

    results = []
    if query:
        vector = embedding_service.generate_vector(query)
        results = search_products(db, auth["user_id"], request.company_id, query, vector, params, filters={
            "category": request.category,
            "min_price": request.min_price,
            "max_price": request.max_price,
            "in_stock_only": request.in_stock_only,
        })

    latency_ms = int((time.perf_counter() - start) * 1000)
    background_tasks.add_task(save_search_history_background, auth["user_id"], request, results, latency_ms)
    log.info("search company=%s results=%d latency_ms=%d", request.company_id, len(results), latency_ms)

    return {"query": query, "count": len(results), "results": [public_product(p) for p in results]}