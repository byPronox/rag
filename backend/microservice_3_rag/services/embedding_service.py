from sentence_transformers import SentenceTransformer
from config.settings import settings

class EmbeddingService:
    def __init__(self):
        print(f"Lloading embedding model: {settings.EMBEDDING_MODEL}...")
        self.model = SentenceTransformer(settings.EMBEDDING_MODEL)

    def generate_vector(self, text: str) -> list:
        return self.model.encode(text).tolist()

embedding_service = EmbeddingService()