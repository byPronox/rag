from fastapi import Depends, HTTPException, status, Request
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from database.connection import get_db
from models.schema import User
from config.settings import settings

def get_token_from_request(request: Request) -> str:
    # 1. First attempt: Extract from Cookies (For Next.js frontend)
    token = request.cookies.get("rag_token")
    
    # 2. Second attempt: Extract from Authorization Header (For Postman/Swagger)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "")
            
    # 3. If not found in either place, deny access
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
        
    # Clean up "Bearer " prefix if it was somehow included in the cookie payload
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