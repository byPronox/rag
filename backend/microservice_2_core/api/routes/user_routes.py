from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.connection import get_db
from models.schema import User, UserCompany, AIModel
from api.deps import get_current_user
from schemas.pydantic_models import CompanyConfigUpdate

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
def update_user_config(company_id: str, data: UserConfigUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
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