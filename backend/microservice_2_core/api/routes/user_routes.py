from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
import secrets
from database.connection import get_db
from models.schema import User, UserCompany, AIModel, ProductEmbedding, ChatHistory, SearchHistory, UserConfig
from api.deps import get_current_user
from schemas.pydantic_models import CompanyConfigUpdate, PasswordUpdate
from security.jwt_handler import verify_password, get_password_hash

router = APIRouter()

@router.get("/companies")
def get_user_companies(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    companies = db.query(UserCompany).filter(UserCompany.user_id == current_user.id, UserCompany.is_active == True).all()
    return [{"platform": c.platform, "company_id": c.platform_company_id, "name": c.company_name} for c in companies]

@router.get("/config/{company_id}")
def get_user_config(company_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    company = db.query(UserCompany).filter(UserCompany.user_id == current_user.id, UserCompany.platform_company_id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Configuración de compañía no encontrada")
    
    return {
        "id": company.id,
        "company_id": company.platform_company_id,
        "selected_embedding_model": company.selected_embedding_model,
        "selected_llm_model": company.selected_llm_model,
        "welcome_message": company.welcome_message,
        "system_prompt": company.system_prompt,
        "theme_color": company.theme_color,
        "chat_icon": company.chat_icon,
        "is_active": company.is_active
    }

@router.put("/config/{company_id}")
def update_user_config(company_id: str, data: CompanyConfigUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    company = db.query(UserCompany).filter(UserCompany.user_id == current_user.id, UserCompany.platform_company_id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Compañía no encontrada")
    
    if data.welcome_message is not None: company.welcome_message = data.welcome_message
    if data.system_prompt is not None: company.system_prompt = data.system_prompt
    if data.selected_llm_model is not None: company.selected_llm_model = data.selected_llm_model
    if data.theme_color is not None: company.theme_color = data.theme_color
    if data.chat_icon is not None: company.chat_icon = data.chat_icon
        
    db.commit()
    return {"message": "Configuración actualizada correctamente"}

@router.get("/models")
def get_user_active_models(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    models = db.query(AIModel).filter(AIModel.is_active == True).all()
    return models

@router.get("/products/{company_id}")
def get_user_products(company_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    products = db.query(ProductEmbedding).filter(
        ProductEmbedding.user_id == current_user.id,
        ProductEmbedding.company_id == company_id
    ).all()
    
    return [
        {
            "variant_id": p.variant_id,
            "sku": p.sku,
            "name": p.display_name,
            "description": p.description,
            "price_excluded": p.price_excluded,
            "price_included": p.price_included,
            "stock": p.stock,
            "category": p.category,
            "website_url": p.website_url,
            "image_128_url": p.image_128_url,
            "image_512_url": p.image_512_url,
            "company_id": p.company_id
        }
        for p in products
    ]

@router.get("/dashboard-metrics/{company_id}")
def get_dashboard_metrics(company_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Total Products
    total_products = db.query(func.count(ProductEmbedding.variant_id)).filter(
        ProductEmbedding.user_id == current_user.id,
        ProductEmbedding.company_id == company_id
    ).scalar() or 0

    # Total Chat Interactions
    total_chats = db.query(func.count(ChatHistory.id)).filter(
        ChatHistory.user_id == current_user.id,
        ChatHistory.company_id == company_id,
        ChatHistory.role == 'user'
    ).scalar() or 0

    # Total Searches
    total_searches = db.query(func.count(SearchHistory.id)).filter(
        SearchHistory.user_id == current_user.id,
        SearchHistory.company_id == company_id
    ).scalar() or 0

    # Tokens Used
    tokens_used = db.query(func.sum(ChatHistory.tokens_used)).filter(
        ChatHistory.user_id == current_user.id,
        ChatHistory.company_id == company_id
    ).scalar() or 0

    # Recent Activity (Merge recent chats and searches)
    recent_chats = db.query(ChatHistory).filter(
        ChatHistory.user_id == current_user.id,
        ChatHistory.company_id == company_id,
        ChatHistory.role == 'user'
    ).order_by(ChatHistory.created_at.desc()).limit(5).all()

    recent_searches = db.query(SearchHistory).filter(
        SearchHistory.user_id == current_user.id,
        SearchHistory.company_id == company_id
    ).order_by(SearchHistory.created_at.desc()).limit(5).all()

    # Format activities
    activities = []
    for c in recent_chats:
        activities.append({
            "type": "Chat",
            "detail": f"User asked: '{c.message[:40]}{'...' if len(c.message) > 40 else ''}'",
            "time": c.created_at.isoformat() if c.created_at else None,
            "status": "Resolved",
            "created_at": c.created_at
        })
    for s in recent_searches:
        activities.append({
            "type": "Search",
            "detail": f"Term: '{s.query_text[:40]}{'...' if len(s.query_text) > 40 else ''}'",
            "time": s.created_at.isoformat() if s.created_at else None,
            "status": "Completed",
            "created_at": s.created_at
        })

    # Sort combined activities by created_at desc and take top 5
    activities.sort(key=lambda x: x["created_at"] or datetime.min, reverse=True)
    recent_activity = activities[:5]

    # Clean up the datetime object before returning
    for a in recent_activity:
        del a["created_at"]

    return {
        "total_products": total_products,
        "total_chats": total_chats,
        "total_searches": total_searches,
        "tokens_used": tokens_used,
        "recent_activity": recent_activity
    }

@router.get("/history/chat/{company_id}")
def get_chat_history(company_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chats = db.query(ChatHistory).filter(
        ChatHistory.user_id == current_user.id,
        ChatHistory.company_id == company_id
    ).order_by(ChatHistory.created_at.asc()).all()
    
    return [
        {
            "id": c.id,
            "session_id": c.session_id,
            "role": c.role,
            "message": c.message,
            "tokens_used": c.tokens_used,
            "latency_ms": c.latency_ms,
            "created_at": c.created_at
        }
        for c in chats
    ]

@router.get("/history/search/{company_id}")
def get_search_history(company_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    searches = db.query(SearchHistory).filter(
        SearchHistory.user_id == current_user.id,
        SearchHistory.company_id == company_id
    ).order_by(SearchHistory.created_at.desc()).all()
    
    return [
        {
            "id": s.id,
            "session_id": s.session_id,
            "query_text": s.query_text,
            "created_at": s.created_at
        }
        for s in searches
    ]

# =========================================================
# SETTINGS
# =========================================================

@router.put("/settings/password")
def update_user_password(data: PasswordUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
        
    current_user.hashed_password = get_password_hash(data.new_password)
    db.commit()
    return {"message": "Contraseña actualizada exitosamente"}

@router.post("/settings/logout-all")
def logout_all_devices(response: Response, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Increment token_version to invalidate all existing tokens
    current_user.token_version += 1
    db.commit()
    
    # Clear local cookie just in case
    response.delete_cookie(key="rag_token", httponly=True, samesite="none", path="/", secure=True)
    return {"message": "Se cerró sesión en todos los dispositivos"}

@router.post("/settings/api-key/regenerate")
def regenerate_user_api_key(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    config = db.query(UserConfig).filter(UserConfig.user_id == current_user.id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuración de usuario no encontrada")
        
    new_api_key = f"rag_{secrets.token_urlsafe(32)}"
    config.system_api_key = new_api_key
    db.commit()
    
    return {"message": "API Key regenerada exitosamente", "api_key": new_api_key}
