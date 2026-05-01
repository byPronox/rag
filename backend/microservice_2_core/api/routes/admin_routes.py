from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database.connection import get_db
from models.schema import GlobalSetting 
from security.jwt_handler import get_current_admin

router = APIRouter()

@router.get("/settings")
def get_global_settings(admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    # Siempre buscamos la fila 1
    settings = db.query(GlobalSetting).filter(GlobalSetting.id == 1).first()
    return settings

@router.put("/settings")
def update_global_settings(data: GlobalSettingsUpdate, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    settings = db.query(GlobalSetting).filter(GlobalSetting.id == 1).first()
    
    settings.default_llm_model = data.default_llm_model
    settings.default_embedding_model = data.default_embedding_model
    settings.default_welcome_message = data.default_welcome_message
    settings.default_system_prompt = data.default_system_prompt
    settings.maintenance_mode = data.maintenance_mode
    
    if data.groq_api_key:
        settings.groq_api_key = data.groq_api_key
        
    db.commit()
    return {"message": "Configuración global actualizada"}

# --- USERS ---

@router.get("/users")
def get_all_users(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Fetches all users and their basic config stats."""
    
    # We join users with user_configs to get the LLM model they are using.
    # We also do basic counting for the mock stats (you can replace the zeroes with real queries later).
    users = db.query(User, UserConfig).outerjoin(UserConfig, User.id == UserConfig.user_id).all()
    
    result = []
    for user, config in users:
        result.append({
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "created_at": user.id, # Mocking date using ID for simplicity if you don't have created_at
            "llm_model": config.selected_llm_model if config else "N/A",
            "total_queries": 0, # You can update this later by joining the search_history table
            "total_tokens": 0
        })
    
    return result

@router.post("/users")
def create_user_by_admin(user_data: UserCreate, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Allows the admin to create a new user (User or Admin) directly."""
    
    # 1. Check if email exists
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email is already in use.")

    # 2. Create User
    new_user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        role=user_data.role
    )
    db.add(new_user)
    db.flush()

    # 3. Get Global Settings to populate defaults
    global_config = db.query(GlobalSetting).filter(GlobalSetting.id == 1).first()
    default_llm = global_config.default_llm_model if global_config else "llama3-8b-8192"
    default_emb = global_config.default_embedding_model if global_config else "all-MiniLM-L6-v2"
    default_welcome = global_config.default_welcome_message if global_config else "Welcome!"
    default_prompt = global_config.default_system_prompt if global_config else "You are an assistant."

    new_api_key = f"rag_{secrets.token_urlsafe(32)}"

    # 4. Create User Config
    new_config = UserConfig(
        user_id=new_user.id,
        system_api_key=new_api_key,
        selected_llm_model=default_llm,
        selected_embedding_model=default_emb,
        welcome_message=default_welcome,
        system_prompt=default_prompt
    )
    db.add(new_config)
    db.commit()

    return {"message": "User created successfully"}

@router.delete("/users/{user_id}")
def delete_user(user_id: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Deletes a user."""
    if admin.id == user_id:
         raise HTTPException(status_code=400, detail="You cannot delete yourself.")
         
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}