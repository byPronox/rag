from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.connection import get_db
from models.schema import User, UserConfig
from schemas.pydantic_models import ApiKeyResponse
from security.jwt_handler import generate_api_key
from api.deps import get_current_user

router = APIRouter()

@router.post("/generate", response_model=ApiKeyResponse, summary="Generar API Key para Odoo/Worker")
def create_new_api_key(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    config = db.query(UserConfig).filter(UserConfig.user_id == current_user.id).first()
    
    new_key = generate_api_key()
    config.system_api_key = new_key
    
    db.commit()
    db.refresh(config)
    
    return {"message": "Guarda esta clave, no se volverá a mostrar", "api_key": config.system_api_key}