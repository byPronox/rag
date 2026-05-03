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

class UserConfigUpdate(BaseModel):
    welcome_message: Optional[str] = None
    system_prompt: Optional[str] = None
    selected_llm_model: Optional[str] = None
    theme_color: Optional[str] = None
    chat_icon: Optional[str] = None