from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import text
from database.connection import get_db

def get_tenant_from_api_key(x_api_key: str = Header(...), db: Session = Depends(get_db)):
    sql = text("""
        SELECT user_id, welcome_message, system_prompt, selected_llm_model 
        FROM user_configs 
        WHERE system_api_key = :api_key AND is_active = true
    """)
    result = db.execute(sql, {"api_key": x_api_key}).fetchone()
    
    if not result:
        raise HTTPException(status_code=401, detail="Invalid Store API Key")
    
    return {
        "user_id": result[0], 
        "welcome_message": result[1], 
        "system_prompt": result[2],
        "llm_model": result[3]
    }