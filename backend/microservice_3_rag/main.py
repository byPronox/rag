from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.settings import settings
from api.routes import search, chat
import logging

logger = logging.getLogger(__name__)

app = FastAPI(title="SaaS RAG - Inference & Search API", version="1.0.0")

if settings.FRONTEND_URLS:
    origins = settings.FRONTEND_URLS
else:
    logger.warning("⚠️ FRONTEND_URLS no configurado.")
    origins = [""]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router, prefix="/api/v1/search", tags=["Semantic Search"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["Conversational Chatbot"])

@app.get("/")
def read_root():
    return {"message": "Microservicio Inference API funcionando"}