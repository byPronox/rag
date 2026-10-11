import logging
import os
import threading
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
        # El consumidor y el hilo de keywords comparten el modelo: un encode a la vez.
        self._lock = threading.Lock()
        log.info("Model loaded successfully.")

    def generate_vector(self, text: str) -> list:
        """Converts text into a numeric vector list."""
        with self._lock:
            return self.model.encode(text, show_progress_bar=False).tolist()


embedding_service = EmbeddingService()