from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserLoginResponse

class ApiKeyResponse(BaseModel):
    message: str
    api_key: str