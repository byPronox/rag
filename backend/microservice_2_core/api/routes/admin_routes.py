from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database.connection import get_db
from models.schema import User, UserConfig, GlobalSetting, AIModel
from security.jwt_handler import get_current_admin, get_password_hash
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
    settings.maintenance_mode = data.maintenance_mode
    
    if data.groq_api_key:
        settings.groq_api_key = data.groq_api_key
        
    db.commit()
    return {"message": "Configuración global actualizada"}

# --- USERS ---

@router.get("/users")
def get_all_users(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Fetches all users and their basic config stats."""
    
    # We join users with user_configs to get the LLM model they are using.
    # We also do basic counting for the mock stats (you can replace the zeroes with real queries later).
    users = db.query(User, UserConfig).outerjoin(UserConfig, User.id == UserConfig.user_id).all()
    
    result = []
    for user, config in users:
        result.append({
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "created_at": user.id, # Mocking date using ID for simplicity if you don't have created_at
            "llm_model": config.selected_llm_model if config else "N/A",
            "total_queries": 0, # You can update this later by joining the search_history table
            "total_tokens": 0
        })
    
    return result

@router.post("/users")
def create_user_by_admin(user_data: UserCreate, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Allows the admin to create a new user (User or Admin) directly."""
    
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
    db.flush()

    # 3. Get Global Settings to populate defaults
    global_config = db.query(GlobalSetting).filter(GlobalSetting.id == 1).first()
    default_llm = global_config.default_llm_model if global_config else "llama3-8b-8192"
    default_emb = global_config.default_embedding_model if global_config else "all-MiniLM-L6-v2"
    default_welcome = global_config.default_welcome_message if global_config else "Welcome!"
    default_prompt = global_config.default_system_prompt if global_config else "You are an assistant."

    new_api_key = f"rag_{secrets.token_urlsafe(32)}"

    # 4. Create User Config
    new_config = UserConfig(
        user_id=new_user.id,
        system_api_key=new_api_key,
        selected_llm_model=default_llm,
        selected_embedding_model=default_emb,
        welcome_message=default_welcome,
        system_prompt=default_prompt
    )
    db.add(new_config)
    db.commit()

    return {"message": "User created successfully"}

@router.delete("/users/{user_id}")
def delete_user(user_id: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    if admin.id == user_id:
         raise HTTPException(status_code=400, detail="No puedes desactivar tu propia cuenta de administrador.")
         
    user = db.query(User).filter(User.id == user_id).first()
    config = db.query(UserConfig).filter(UserConfig.user_id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    user.is_active = False
    if config:
        config.is_active = False

    db.commit()
    
    return {"message": f"El usuario {user.email} ha sido desactivado y ya no tiene acceso al sistema."}

@router.post("/users/{user_id}/api-key", response_model=ApiKeyResponse)
def regenerate_user_api_key(user_id: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Regenera la llave de integración (Odoo) para un usuario específico"""
    config = db.query(UserConfig).filter(UserConfig.user_id == user_id).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="Configuración de usuario no encontrada")
    
    # Generamos la nueva llave (usando el mismo formato que ya tenías)
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

@router.put("/models/{model_id}", response_model=AIModelResponse)
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
    
    # 1. Obtenemos la llave maestra de la base de datos
    settings = db.query(GlobalSetting).filter(GlobalSetting.id == 1).first()
    if not settings or not settings.groq_api_key:
        raise HTTPException(status_code=400, detail="Groq API Key no configurada. Ve a Global Settings primero.")

    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json"
    }

    try:
        # 2. Llamamos a la API real de Groq
        response = requests.get("https://api.groq.com/openai/v1/models", headers=headers)
        response.raise_for_status()
        groq_data = response.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error conectando con Groq: {str(e)}")

    models_added = 0
    
    # 3. Procesamos y guardamos los modelos
    for item in groq_data.get("data", []):
        model_id = item.get("id")
        
        # Ignoramos modelos de sistema internos de Groq (suele haber basura ahí)
        if "whisper" in model_id.lower() or "tool" in model_id.lower():
            continue
            
        existing = db.query(AIModel).filter(AIModel.id == model_id).first()
        
        if not existing:
            # Si es nuevo, lo creamos y lo guardamos apagado por seguridad
            new_model = AIModel(
                id=model_id,
                name=model_id.upper(), # Formato básico de nombre
                provider="Groq",
                type="llm",
                is_active=False, 
                description=f"Official model {model_id} hosted on Groq.",
                context_window=item.get("context_window", 8192) # Default fallback
            )
            db.add(new_model)
            models_added += 1

    db.commit()
    return {"message": f"Sincronización exitosa. Se detectaron y guardaron {models_added} modelos nuevos."}