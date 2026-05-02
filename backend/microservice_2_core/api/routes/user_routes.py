from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.connection import get_db
from models.schema import User, UserConfig, AIModel
from api.deps import get_current_user
from schemas.pydantic_models import UserConfigUpdate

router = APIRouter()

@router.get("/config")
def get_user_config(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Obtiene la configuración del Chatbot del Inquilino actual"""
    config = db.query(UserConfig).filter(UserConfig.user_id == current_user.id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")
    
    return {
        "id": config.id,
        "user_id": config.user_id,
        "system_api_key": config.system_api_key,
        "selected_embedding_model": config.selected_embedding_model,
        "selected_llm_model": config.selected_llm_model,
        "welcome_message": config.welcome_message,
        "system_prompt": config.system_prompt,
        "theme_color": getattr(config, 'theme_color', '#8b5cf6'), # Fallback si falla la BD
        "chat_icon": getattr(config, 'chat_icon', 'Bot'),
        "is_active": config.is_active
    }

@router.put("/config")
def update_user_config(data: UserConfigUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Actualiza los colores, textos y modelo del Chatbot del Inquilino"""
    config = db.query(UserConfig).filter(UserConfig.user_id == current_user.id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")
    
    if data.welcome_message is not None:
        config.welcome_message = data.welcome_message
    if data.system_prompt is not None:
        config.system_prompt = data.system_prompt
    if data.selected_llm_model is not None:
        config.selected_llm_model = data.selected_llm_model
    if data.theme_color is not None:
        config.theme_color = data.theme_color
    if data.chat_icon is not None:
        config.chat_icon = data.chat_icon
        
    db.commit()
    return {"message": "Configuración actualizada correctamente"}

@router.get("/models")
def get_user_active_models(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Devuelve SOLO los modelos que el Admin ha marcado como activos"""
    models = db.query(AIModel).filter(AIModel.is_active == True).all()
    return models