from sentence_transformers import SentenceTransformer
from config.settings import Config

class EmbeddingService:
    def __init__(self):
        print(f"Loading embedding model: {Config.EMBEDDING_MODEL}...")
        self.model = SentenceTransformer(Config.EMBEDDING_MODEL)
        print("Model loaded successfully.")

    def generate_vector(self, text: str) -> list:
        """Converts text into a numeric vector list."""
        return self.model.encode(text).tolist()

# Singleton instance
embedding_service = EmbeddingService()