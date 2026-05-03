import time
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from database.connection import get_db
from api.deps import get_tenant_from_api_key
from services.embedding_service import embedding_service
from services.pgvector_service import search_similar_products
from services.llm_service import generate_rag_response

router = APIRouter()

class ChatRequest(BaseModel):
    session_id: str
    message: str

@router.get("/config")
def get_chat_config(tenant: dict = Depends(get_tenant_from_api_key)):
    """El frontend llama a este endpoint al abrir el chat para saber cómo saludar"""
    return {"welcome_message": tenant["welcome_message"]}

@router.post("/")
def chat_interaction(request: ChatRequest, db: Session = Depends(get_db), tenant: dict = Depends(get_tenant_from_api_key)):
    
    start_time = time.time()
    
    sql_global = text("SELECT supreme_system_prompt FROM global_settings WHERE id = 1")
    global_config = db.execute(sql_global).fetchone()
    supreme_prompt = global_config[0] if global_config and global_config[0] else "You are an AI assistant."
    
    vector = embedding_service.generate_vector(request.message)
    context_products = search_similar_products(db, tenant["user_id"], vector, limit=4)
    
    sql_hist = text("SELECT role, message FROM chat_history WHERE session_id = :sid ORDER BY created_at ASC LIMIT 6")
    history = db.execute(sql_hist, {"sid": request.session_id}).fetchall()
    
    bot_response, tokens_used = generate_rag_response(
        supreme_prompt=supreme_prompt,
        tenant_prompt=tenant["system_prompt"],
        llm_model=tenant["llm_model"],
        context_products=context_products,
        chat_history=history,
        user_message=request.message,
        groq_api_key=tenant["groq_api_key"]
    )
    
    # 6. DETENEMOS EL CRONÓMETRO Y CALCULAMOS LATENCIA EN MILISEGUNDOS
    latency_ms = int((time.time() - start_time) * 1000)
    
    # 7. GUARDAMOS EN BASE DE DATOS CON MÉTRICAS REALES
    sql_insert = text("""
        INSERT INTO chat_history (session_id, user_id, role, message, tokens_used, latency_ms) 
        VALUES 
        (:sid, :uid, 'user', :umsg, 0, 0), 
        (:sid, :uid, 'assistant', :bmsg, :tokens, :lat)
    """)
    db.execute(sql_insert, {
        "sid": request.session_id, 
        "uid": tenant["user_id"], 
        "umsg": request.message, 
        "bmsg": bot_response,
        "tokens": tokens_used,
        "lat": latency_ms      
    })
    db.commit()
    
    return {
        "reply": bot_response,
        "products_referenced": context_products
    }