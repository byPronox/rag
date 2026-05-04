from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database.connection import get_db

def validate_tenant_api_key(x_api_key: str = Header(...), db: Session = Depends(get_db)):
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API Key missing")

    sql_tenant = text("SELECT user_id FROM user_configs WHERE system_api_key = :api_key AND is_active = true")
    tenant_record = db.execute(sql_tenant, {"api_key": x_api_key}).fetchone()

    if not tenant_record:
        raise HTTPException(status_code=401, detail="Invalid or inactive API Key")

    sql_global = text("SELECT groq_api_key FROM global_settings WHERE id = 1")
    global_record = db.execute(sql_global).fetchone()
    master_groq_key = global_record[0] if global_record else None

    return {
        "user_id": tenant_record[0],
        "groq_api_key": master_groq_key
    }