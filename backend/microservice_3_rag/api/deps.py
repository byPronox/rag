from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database.connection import get_db

def get_tenant_from_api_key(x_api_key: str = Header(...), db: Session = Depends(get_db)):
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API Key missing")

    # 1. ACTUALIZAMOS EL SELECT PARA INCLUIR theme_color Y chat_icon
    sql_tenant = text("""
        SELECT user_id, system_prompt, selected_llm_model, welcome_message, theme_color, chat_icon 
        FROM user_configs 
        WHERE system_api_key = :api_key AND is_active = true
    """)
    tenant_record = db.execute(sql_tenant, {"api_key": x_api_key}).fetchone()

    if not tenant_record:
        raise HTTPException(status_code=401, detail="Invalid or inactive API Key")

    # 2. Obtenemos la Master API Key de Groq (Global Settings)
    sql_global = text("SELECT groq_api_key FROM global_settings WHERE id = 1")
    global_record = db.execute(sql_global).fetchone()
    master_groq_key = global_record[0] if global_record else None

    # 3. ACTUALIZAMOS EL DICCIONARIO QUE RETORNA PARA INCLUIR LOS NUEVOS VALORES
    return {
        "user_id": tenant_record[0],
        "system_prompt": tenant_record[1],
        "llm_model": tenant_record[2],
        "welcome_message": tenant_record[3],
        "theme_color": tenant_record[4], # <--- ¡AQUÍ ESTÁ LA MAGIA DEL COLOR!
        "chat_icon": tenant_record[5],   # <--- ¡AQUÍ ESTÁ LA MAGIA DEL ICONO!
        "groq_api_key": master_groq_key
    }