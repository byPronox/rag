import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from database.connection import get_db
from api.deps import validate_tenant_api_key
from services.embedding_service import embedding_service
from services.pgvector_service import search_similar_products
from services.llm_service import generate_rag_response

router = APIRouter()

class ChatRequest(BaseModel):
    session_id: str
    message: str
    company_id: str

@router.get("/config")
def get_chat_config(company_id: str, auth: dict = Depends(validate_tenant_api_key), db: Session = Depends(get_db)):
    sql_company = text("""
        SELECT welcome_message, theme_color, chat_icon 
        FROM user_companies 
        WHERE user_id = :uid AND platform_company_id = :cid AND is_active = true
    """)
    company = db.execute(sql_company, {"uid": auth["user_id"], "cid": company_id}).fetchone()
    
    if not company:
        raise HTTPException(status_code=404, detail="Company configuration not found")

    return {
        "welcome_message": company[0],
        "theme_color": company[1],
        "chat_icon": company[2]
    }

@router.post("/")
def chat_interaction(request: ChatRequest, db: Session = Depends(get_db), auth: dict = Depends(validate_tenant_api_key)):
    start_time = time.time()
    
    sql_company = text("""
        SELECT system_prompt, selected_llm_model 
        FROM user_companies 
        WHERE user_id = :uid AND platform_company_id = :cid
    """)
    company = db.execute(sql_company, {"uid": auth["user_id"], "cid": request.company_id}).fetchone()
    
    if not company:
        raise HTTPException(status_code=404, detail="Invalid Company ID")
        
    sql_global = text("SELECT supreme_system_prompt FROM global_settings WHERE id = 1")
    global_config = db.execute(sql_global).fetchone()
    supreme_prompt = global_config[0] if global_config and global_config[0] else "You are an AI assistant."
    
    vector = embedding_service.generate_vector(request.message)
    context_products = search_similar_products(db, auth["user_id"], vector, company_id=request.company_id, limit=4)
    
    sql_hist = text("SELECT role, message FROM chat_history WHERE session_id = :sid ORDER BY created_at ASC LIMIT 6")
    history = db.execute(sql_hist, {"sid": request.session_id}).fetchall()
    
    bot_response, tokens_used = generate_rag_response(
        supreme_prompt=supreme_prompt,
        tenant_prompt=company[0],
        llm_model=company[1],
        context_products=context_products,
        chat_history=history,
        user_message=request.message,
        groq_api_key=auth["groq_api_key"]
    )
    
    latency_ms = int((time.time() - start_time) * 1000)
    
    sql_insert = text("""
        INSERT INTO chat_history (session_id, user_id, company_id, role, message, tokens_used, latency_ms) 
        VALUES 
        (:sid, :uid, :cid, 'user', :umsg, 0, 0), 
        (:sid, :uid, :cid, 'assistant', :bmsg, :tokens, :lat)
    """)
    db.execute(sql_insert, {
        "sid": request.session_id, 
        "uid": auth["user_id"], 
        "cid": request.company_id,
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