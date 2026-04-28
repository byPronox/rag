from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.connection import init_db
from config.settings import settings
from api.routes import auth_routes, api_keys

app = FastAPI(title="SaaS RAG - Core API", version="1.0.0")

origins = [url.strip() for url in settings.FRONTEND_URLS.split(",") if url.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router, prefix="/api/v1/auth", tags=["Autenticación"])
app.include_router(api_keys.router, prefix="/api/v1/apikeys", tags=["API Keys"])

@app.on_event("startup")
def on_startup():
    print("Iniciando Core API...")
    init_db()

@app.get("/")
def read_root():
    return {"message": "Microservicio Core API funcionando y estructurado modularmente."}