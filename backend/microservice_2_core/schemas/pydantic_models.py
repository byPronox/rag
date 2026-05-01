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
    groq_api_key: str | None = None
    maintenance_mode: bool