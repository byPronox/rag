from typing import Optional 
from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: str
    password: str
    role: str

class UserLoginResponse(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserLoginResponse

class ApiKeyResponse(BaseModel):
    message: str
    api_key: str

class GlobalSettingsUpdate(BaseModel):
    default_llm_model: str
    default_embedding_model: str
    default_welcome_message: str
    default_system_prompt: str
    supreme_system_prompt: str
    groq_api_key: str | None = None
    maintenance_mode: bool

class AIModelBase(BaseModel):
    id: str
    name: str
    provider: str
    type: str
    is_active: bool
    description: str | None = None
    context_window: int | None = None
    dimensions: int | None = None

class AIModelResponse(AIModelBase):
    class Config:
        from_attributes = True

class AIModelUpdate(BaseModel):
    is_active: bool

# ==========================================
# NUEVOS SCHEMAS MULTI-COMPAÑÍA
# ==========================================

class CompanyResponse(BaseModel):
    """Schema para la lista de compañías en el Navbar"""
    platform: str
    company_id: str
    name: str

class CompanyConfigResponse(BaseModel):
    """Schema para mostrar la configuración actual de una compañía"""
    id: int
    company_id: str
    selected_embedding_model: str
    selected_llm_model: str
    welcome_message: str
    system_prompt: str
    theme_color: str
    chat_icon: str
    is_active: bool

class CompanyConfigUpdate(BaseModel):
    """Schema para actualizar la configuración de una compañía específica"""
    welcome_message: Optional[str] = None
    system_prompt: Optional[str] = None
    selected_llm_model: Optional[str] = None
    theme_color: Optional[str] = None
    chat_icon: Optional[str] = None