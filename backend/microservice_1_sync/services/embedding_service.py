import logging
import os
import torch
from sentence_transformers import SentenceTransformer
from config.settings import Config

log = logging.getLogger("sync.embeddings")

torch.set_num_threads(int(os.getenv("TORCH_NUM_THREADS", "1")))


class EmbeddingService:
    def __init__(self):
        log.info("Loading embedding model: %s (torch threads=%s)...",
                 Config.EMBEDDING_MODEL, torch.get_num_threads())
        self.model = SentenceTransformer(Config.EMBEDDING_MODEL)
        log.info("Model loaded successfully.")

    def generate_vector(self, text: str) -> list:
        """Converts text into a numeric vector list."""
        return self.model.encode(text, show_progress_bar=False).tolist()


embedding_service = EmbeddingService()