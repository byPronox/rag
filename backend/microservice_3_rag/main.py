from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.settings import settings
from api.routes import search, chat
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="SaaS RAG - Inference & Search API", version="1.1.0")

# Los widgets se incrustan en tiendas de cualquier dominio y se autentican con X-API-Key
# (no con cookies), por eso se permite cualquier origen pero sin credenciales.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(search.router, prefix="/api/v1/search", tags=["Semantic Search"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["Conversational Chatbot"])


@app.get("/")
def read_root():
    return {"message": "Microservicio Inference API funcionando"}


@app.get("/health")
def health():
    return {"status": "ok", "embedding_model": settings.EMBEDDING_MODEL}
