import logging
import time

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from api.deps import get_active_company, validate_tenant_api_key
from config.settings import settings
from database.connection import get_db
from services.embedding_service import embedding_service
from services.intent import is_follow_up, is_small_talk
from services.llm_service import LLMUnavailableError, compose_reply, generate_rag_response
from services.pgvector_service import chat_params, company_categories, public_product, search_products
from services.prompt_guard import is_prompt_injection

log = logging.getLogger("rag.chat")
router = APIRouter()


class ChatRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=100)
    message: str = Field(..., min_length=1)
    company_id: str = Field(..., min_length=1, max_length=100)


@router.get("/config")
def get_chat_config(company_id: str, auth: dict = Depends(validate_tenant_api_key), db: Session = Depends(get_db)):
    company = get_active_company(db, auth["user_id"], company_id)
    return {
        "welcome_message": company["welcome_message"],
        "theme_color": company["theme_color"],
        "chat_icon": company["chat_icon"],
    }


def load_history(db, user_id, company_id, session_id):
    """Últimos N mensajes de ESTA sesión, tenant y compañía, en orden cronológico."""
    rows = db.execute(text("""
        SELECT role, message FROM chat_history
        WHERE session_id = :sid AND user_id = :uid AND company_id = :cid
        ORDER BY created_at DESC, id DESC LIMIT :limit
    """), {"sid": session_id, "uid": user_id, "cid": company_id,
           "limit": settings.CHAT_HISTORY_MESSAGES}).fetchall()
    return [(row[0], row[1]) for row in reversed(rows)]


def save_chat_history(db, session_id, user_id, company_id, message, reply, tokens_used, latency_ms):
    """El historial es la memoria de la conversación, por eso se guarda antes de responder.
    Si falla, se registra y la respuesta igual llega al comprador (nunca un error 500)."""
    try:
        db.execute(text("""
            INSERT INTO chat_history (session_id, user_id, company_id, role, message, tokens_used, latency_ms)
            VALUES (:sid, :uid, :cid, 'user', :umsg, 0, 0),
                   (:sid, :uid, :cid, 'assistant', :bmsg, :tokens, :lat)
        """), {"sid": session_id, "uid": user_id, "cid": company_id,
               "umsg": message, "bmsg": reply, "tokens": tokens_used, "lat": latency_ms})
        db.commit()
    except Exception as exc:  # pylint: disable=broad-except
        db.rollback()
        log.warning("Could not save chat history: %s", type(exc).__name__)


def retrieve_for_chat(db, user_id, company_id, message, history):
    """Busca con el mensaje actual y, si es un seguimiento ("¿y en negro?"), también con el mensaje
    anterior del cliente; se queda con el mejor puntaje de cada producto."""
    params = chat_params()
    queries = [message]
    previous_user = next((content for role, content in reversed(history) if role == "user"), None)
    if previous_user and is_follow_up(message):
        queries.append(f"{previous_user} {message}")

    merged = {}
    for query in queries:
        vector = embedding_service.generate_vector(query)
        for product in search_products(db, user_id, company_id, query, vector, params):
            key = product.get("template_id") or f"variant-{product['variant_id']}"
            current = merged.get(key)
            if current is None or product["score"] > current["score"]:
                merged[key] = product
    return sorted(merged.values(), key=lambda p: p["score"], reverse=True)[:params.limit]


@router.post("/")
def chat_interaction(request: ChatRequest, db: Session = Depends(get_db),
                     auth: dict = Depends(validate_tenant_api_key)):
    message = request.message.strip()[:settings.CHAT_MAX_MESSAGE_CHARS]
    if not message:
        raise HTTPException(status_code=422, detail="Message is empty")
    base_response = {"session_id": request.session_id, "products_referenced": []}

    if is_prompt_injection(message):
        log.warning("Blocked possible prompt injection (company=%s)", request.company_id)
        return {**base_response, "reply": settings.CHAT_BLOCKED_MESSAGE, "blocked": True}

    start = time.perf_counter()
    user_id = auth["user_id"]
    company = get_active_company(db, user_id, request.company_id)
    history = load_history(db, user_id, request.company_id, request.session_id)

    products = [] if is_small_talk(message) else retrieve_for_chat(db, user_id, request.company_id, message, history)
    categories = company_categories(db, user_id, request.company_id)

    try:
        raw_reply, tokens_used = generate_rag_response(
            supreme_prompt=auth.get("supreme_prompt"),
            tenant_prompt=company["system_prompt"],
            llm_model=company["llm_model"],
            context_products=products,
            chat_history=history,
            user_message=message,
            groq_api_key=auth.get("groq_api_key"),
            categories=categories,
        )
    except LLMUnavailableError:
        # No se guarda nada: el historial solo debe contener conversaciones reales.
        return {**base_response, "reply": settings.CHAT_FALLBACK_MESSAGE, "error": "assistant_unavailable"}

    composed = compose_reply(raw_reply, products)
    reply, referenced = composed["plain"], composed["products"]
    latency_ms = int((time.perf_counter() - start) * 1000)

    save_chat_history(db, request.session_id, user_id, request.company_id,
                      message, reply, tokens_used, latency_ms)
    log.info("chat company=%s products=%d referenced=%d latency_ms=%d",
             request.company_id, len(products), len(referenced), latency_ms)

    return {
        **base_response,
        "reply": reply,
        "reply_before": composed["before"],
        "reply_after": composed["after"],
        "products_referenced": [public_product(p, with_description=True) for p in referenced],
    }