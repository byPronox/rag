import logging
from sentence_transformers import SentenceTransformer
from config.settings import Config

log = logging.getLogger("sync.embeddings")


class EmbeddingService:
    def __init__(self):
        log.info("Loading embedding model: %s ...", Config.EMBEDDING_MODEL)
        self.model = SentenceTransformer(Config.EMBEDDING_MODEL)
        log.info("Model loaded successfully.")

    def generate_vector(self, text: str) -> list:
        """Converts text into a numeric vector list."""
        return self.model.encode(text).tolist()


# Singleton instance
embedding_service = EmbeddingService()