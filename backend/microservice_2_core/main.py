from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.connection import init_db
from config.settings import settings
from api.routes import auth_routes, api_keys, admin_routes
import logging

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

@app.on_event("startup")
def on_startup():
    print("Iniciando Core API...")
    init_db()

@app.get("/")
def read_root():
    return {"message": "Microservicio Core API funcionando de forma segura."}