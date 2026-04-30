from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    password: str

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