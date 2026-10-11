from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database.connection import get_db


def validate_tenant_api_key(x_api_key: str = Header(...), db: Session = Depends(get_db)):
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API Key missing")

    # La key debe estar activa y el usuario dueño también (un tenant desactivado no puede usar la API).
    sql_tenant = text("""
        SELECT uc.user_id FROM user_configs uc
        JOIN users u ON u.id = uc.user_id
        WHERE uc.system_api_key = :api_key AND uc.is_active = true AND u.is_active = true
    """)
    tenant_record = db.execute(sql_tenant, {"api_key": x_api_key}).fetchone()

    if not tenant_record:
        raise HTTPException(status_code=401, detail="Invalid or inactive API Key")

    sql_global = text("SELECT groq_api_key, maintenance_mode, supreme_system_prompt FROM global_settings WHERE id = 1")
    global_record = db.execute(sql_global).fetchone()

    if global_record and global_record[1]:
        raise HTTPException(status_code=503, detail="Service under maintenance")

    return {
        "user_id": tenant_record[0],
        "groq_api_key": global_record[0] if global_record else None,
        "supreme_prompt": global_record[2] if global_record else None,
    }


def get_active_company(db, user_id, company_id):
    """Configuración de una compañía activa del tenant; 404 si no existe o está desactivada."""
    company = db.execute(text("""
        SELECT system_prompt, selected_llm_model, welcome_message, theme_color, chat_icon
        FROM user_companies
        WHERE user_id = :uid AND platform_company_id = :cid AND is_active = true
    """), {"uid": user_id, "cid": company_id}).fetchone()
    if not company:
        raise HTTPException(status_code=404, detail="Company configuration not found")
    return {
        "system_prompt": company[0],
        "llm_model": company[1],
        "welcome_message": company[2],
        "theme_color": company[3],
        "chat_icon": company[4],
    }
