from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, desc
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database.connection import get_db
# IMPORTANTE: Se añadió UserCompany a las importaciones
from models.schema import User, UserConfig, UserCompany, GlobalSetting, AIModel, SearchHistory, ChatHistory
from security.jwt_handler import get_password_hash
from api.deps import get_current_admin, get_current_user
from schemas.pydantic_models import GlobalSettingsUpdate, UserCreate, ApiKeyResponse, AIModelResponse, AIModelUpdate
import secrets, requests

router = APIRouter()

@router.get("/settings")
def get_global_settings(admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    # Siempre buscamos la fila 1
    settings = db.query(GlobalSetting).filter(GlobalSetting.id == 1).first()
    return settings

@router.put("/settings")
def update_global_settings(data: GlobalSettingsUpdate, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    settings = db.query(GlobalSetting).filter(GlobalSetting.id == 1).first()
    
    settings.default_llm_model = data.default_llm_model
    settings.default_embedding_model = data.default_embedding_model
    settings.default_welcome_message = data.default_welcome_message
    settings.default_system_prompt = data.default_system_prompt
    settings.supreme_system_prompt = data.supreme_system_prompt
    settings.maintenance_mode = data.maintenance_mode
    
    if data.groq_api_key:
        settings.groq_api_key = data.groq_api_key
        
    db.commit()
    return {"message": "Configuración global actualizada"}

# --- USERS ---

@router.get("/users")
def get_all_users(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Fetches all users and their basic stats (now tracking connected companies)."""
    
    users = db.query(User, UserConfig).outerjoin(UserConfig, User.id == UserConfig.user_id).all()
    
    result = []
    for user, config in users:
        # Contamos cuántas sucursales/compañías tiene este cliente
        companies_count = db.query(UserCompany).filter(UserCompany.user_id == user.id).count()
        
        result.append({
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "created_at": user.id, 
            "connected_companies": companies_count, # En lugar del LLM, mostramos sus compañías
            "total_queries": 0, 
            "total_tokens": 0
        })
    
    return result

@router.post("/users")
def create_user_by_admin(user_data: UserCreate, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Allows the admin to create a new user (Tenant or Admin) directly."""
    
    # 1. Check if email exists
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email is already in use.")

    # 2. Create User
    new_user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        role=user_data.role
    )
    db.add(new_user)
    db.flush() # Flush para obtener el ID de new_user sin hacer commit final

    # 3. Create Clean User Config (Solo el llavero de la API Key)
    new_api_key = f"rag_{secrets.token_urlsafe(32)}"
    
    new_config = UserConfig(
        user_id=new_user.id,
        system_api_key=new_api_key,
        is_active=True
    )
    db.add(new_config)
    db.commit()

    return {"message": "Usuario creado exitosamente. Las compañías se sincronizarán mediante el Handshake."}

@router.delete("/users/{user_id}")
def delete_user(user_id: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    if admin.id == user_id:
         raise HTTPException(status_code=400, detail="No puedes desactivar tu propia cuenta de administrador.")
         
    user = db.query(User).filter(User.id == user_id).first()
    config = db.query(UserConfig).filter(UserConfig.user_id == user_id).first()
    companies = db.query(UserCompany).filter(UserCompany.user_id == user_id).all()

    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    user.is_active = False
    if config:
        config.is_active = False
        
    for company in companies:
        company.is_active = False

    db.commit()
    
    return {"message": f"El usuario {user.email} y sus compañías han sido desactivados."}

@router.post("/users/{user_id}/api-key", response_model=ApiKeyResponse)
def regenerate_user_api_key(user_id: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    config = db.query(UserConfig).filter(UserConfig.user_id == user_id).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="Configuración de usuario no encontrada")
    
    new_key = f"rag_{secrets.token_urlsafe(32)}"
    config.system_api_key = new_key
    
    db.commit()
    
    return {"message": "Guarda esta clave, no se volverá a mostrar", "api_key": new_key}

# ==========================================
# 4. ENDPOINTS: GESTIÓN DE MODELOS AI (/models)
# ==========================================

@router.get("/models", response_model=list[AIModelResponse])
def get_all_models(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Obtiene todos los modelos guardados en la base de datos local."""
    return db.query(AIModel).all()

@router.put("/models/{model_id:path}", response_model=AIModelResponse)
def update_model_status(model_id: str, data: AIModelUpdate, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Activa o desactiva un modelo específico."""
    model = db.query(AIModel).filter(AIModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Modelo no encontrado")
        
    model.is_active = data.is_active
    db.commit()
    db.refresh(model)
    return model

@router.post("/models/sync")
def sync_models_with_groq(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Se conecta a Groq con la Master API Key, descarga los modelos disponibles y los guarda."""
    
    settings = db.query(GlobalSetting).filter(GlobalSetting.id == 1).first()
    if not settings or not settings.groq_api_key:
        raise HTTPException(status_code=400, detail="Groq API Key no configurada. Ve a Global Settings primero.")

    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.get("https://api.groq.com/openai/v1/models", headers=headers)
        response.raise_for_status()
        groq_data = response.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error conectando con Groq: {str(e)}")

    models_added = 0
    
    for item in groq_data.get("data", []):
        model_id = item.get("id")
        
        if "whisper" in model_id.lower() or "tool" in model_id.lower():
            continue
            
        existing = db.query(AIModel).filter(AIModel.id == model_id).first()
        
        if not existing:
            new_model = AIModel(
                id=model_id,
                name=model_id.upper(), 
                provider="Groq",
                type="llm",
                is_active=False, 
                description=f"Official model {model_id} hosted on Groq.",
                context_window=item.get("context_window", 8192) 
            )
            db.add(new_model)
            models_added += 1

    db.commit()
    return {"message": f"Sincronización exitosa. Se detectaron y guardaron {models_added} modelos nuevos."}

@router.get("/metrics")
def get_dashboard_metrics(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    total_rag_queries = db.query(ChatHistory).filter(ChatHistory.role == "user").count()
    total_searches = db.query(SearchHistory).count()
    total_tokens = db.query(func.sum(ChatHistory.tokens_used)).scalar() or 0
    avg_latency = db.query(func.avg(ChatHistory.latency_ms)).scalar() or 0

    top_searches_query = db.query(
        SearchHistory.query_text, 
        func.count(SearchHistory.id).label('hits')
    ).group_by(SearchHistory.query_text).order_by(desc('hits')).limit(5).all()
    
    top_queries = [
        {"query": q[0], "hits": q[1], "relevance": 95} for q in top_searches_query
    ]

    user_activity_query = db.query(
        User.email,
        func.count(ChatHistory.id).label('queries'),
        func.sum(ChatHistory.tokens_used).label('tokens')
    ).join(ChatHistory, User.id == ChatHistory.user_id)\
     .filter(ChatHistory.role == "user")\
     .group_by(User.email).order_by(desc('queries')).limit(5).all()

    user_activity = [
        {"email": u[0], "queries": u[1], "tokens": u[2] or 0} for u in user_activity_query
    ]

    return {
        "total_rag_queries": total_rag_queries,
        "total_search_queries": total_searches,
        "total_tokens": total_tokens,
        "avg_latency_sec": round(avg_latency / 1000, 2), 
        "top_queries": top_queries,
        "user_activity": user_activity
    }