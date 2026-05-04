from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from database.connection import get_db
from models.schema import User, UserConfig
from schemas.pydantic_models import UserCreate, UserLoginResponse
from security.jwt_handler import get_password_hash, verify_password, create_access_token
from api.deps import get_current_user
import secrets

router = APIRouter()

@router.post("/login")
def login(response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Esta cuenta ha sido desactivada. Por favor contacte al administrador.")
    
    access_token = create_access_token(data={"sub": user.email})
    
    response.set_cookie(
        key="rag_token", value=f"Bearer {access_token}", httponly=True, samesite="none", secure=True, path="/", max_age=86400 * 7
    )
    
    return {
        "message": "Login exitoso",
        "user": {
            "id": user.id, "email": user.email, "role": user.role, "is_active": user.is_active
        }
    }

@router.get("/me", response_model=UserLoginResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="rag_token", httponly=True, samesite="none", path="/", secure=True)
    return {"message": "Sesión cerrada"}

@router.post("/register", summary="Registrar nuevo Tenant")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    hashed_password = get_password_hash(user.password)
    new_user = User(email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.flush()
    
    new_api_key = f"rag_{secrets.token_urlsafe(32)}"
    new_config = UserConfig(user_id=new_user.id, system_api_key=new_api_key)
    db.add(new_config)
    db.commit()
    
    return {"message": "Usuario registrado exitosamente"}