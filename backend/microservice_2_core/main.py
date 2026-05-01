from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.connection import init_db
from config.settings import settings
from api.routes import auth_routes, api_keys, admin_routes
import logging
from models.schema import User, GlobalSetting
from security.jwt_handler import get_password_hash

logger = logging.getLogger(__name__)

app = FastAPI(title="SaaS RAG - Core API", version="1.0.0")

urls_crudas = settings.FRONTEND_URLS

origins = []
if urls_crudas:
    origins = [url.strip() for url in urls_crudas.split(",") if url.strip()]
else:
    logger.warning("⚠️ ALERTA DE SEGURIDAD: FRONTEND_URLS no está configurado.")


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else [""],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router, prefix="/api/v1/auth", tags=["Autenticación"])
app.include_router(api_keys.router, prefix="/api/v1/apikeys", tags=["API Keys"])
app.include_router(admin_routes.router, prefix="/api/v1/admin", tags=["Admin"])

# ==============================================================================
# FUNCIÓN PARA CREAR EL ADMIN POR DEFECTO
# ==============================================================================
def create_initial_admin():
    db = SessionLocal()
    try:
        # 1. Verificar si ya existe un admin
        admin_exists = db.query(User).filter(User.role == "admin").first()
        
        if not admin_exists:
            print("⚠️ No se detectó ningún administrador. Creando admin por defecto...")
            new_admin = User(
                email="admin@admin.com",
                hashed_password=get_password_hash("admin1234"), # Cambia esta clave si deseas
                role="admin",
                is_active=True
            )
            db.add(new_admin)
            db.commit()
            print("✅ Admin creado -> Email: admin@admin.com | Password: admin1234")
            
        # 2. (Opcional) Asegurar que la configuración global exista
        global_settings = db.query(GlobalSetting).first()
        if not global_settings:
            new_settings = GlobalSetting(id=1)
            db.add(new_settings)
            db.commit()
            print("✅ Configuración global inicializada.")
            
    except Exception as e:
        print(f"❌ Error al crear datos iniciales: {e}")
    finally:
        db.close()
        


@app.on_event("startup")
def on_startup():
    print("Iniciando Core API...")
    init_db()
    create_initial_admin()

@app.get("/")
def read_root():
    return {"message": "Microservicio Core API funcionando de forma segura."}