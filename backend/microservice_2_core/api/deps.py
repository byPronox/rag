from fastapi import Depends, HTTPException, status, Request
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from database.connection import get_db
from models.schema import User
from config.settings import settings

def get_token_from_request(request: Request) -> str:
    # --- INICIO MODO DEBUG ---
    print("\n" + "="*50)
    print(f"🚨 DEBUG AUTH - NUEVA PETICIÓN 🚨")
    print(f"Ruta: {request.method} {request.url.path}")
    print(f"Origen (Frontend): {request.headers.get('origin', 'No enviado')}")
    print(f"Cookies Crudas: {request.cookies}")
    print(f"Header Authorization: {request.headers.get('authorization', 'Vacio')}")
    # --- FIN MODO DEBUG ---

    # 1. Intentamos leer la cookie
    token = request.cookies.get("rag_token")
    print(f"🔍 Token extraído de Cookie: {'SÍ (Oculto por seguridad)' if token else 'NO ENCONTRADO'}")
    
    # 2. Intentamos leer el header si no hay cookie
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "")
            print("🔍 Token extraído de Header: SÍ")
            
    print("="*50 + "\n")

    # 3. Si no hay token en ningún lado, fallamos
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated (Mira los logs de Railway para ver por qué)"
        )
        
    return token.replace("Bearer ", "") if "Bearer" in token else token

def get_current_user(token: str = Depends(get_token_from_request), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Administrator permissions required."
        )
    return current_user