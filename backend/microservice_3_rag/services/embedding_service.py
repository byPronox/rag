import os
import torch
from sentence_transformers import SentenceTransformer
from config.settings import settings

torch.set_num_threads(int(os.getenv("TORCH_NUM_THREADS", "1")))


class EmbeddingService:
    def __init__(self):
        print(f"Loading embedding model: {settings.EMBEDDING_MODEL}...")
        self.model = SentenceTransformer(settings.EMBEDDING_MODEL)
        self.model.encode("warmup", show_progress_bar=False)

    def generate_vector(self, text: str) -> list:
        return self.model.encode(text, show_progress_bar=False).tolist()


embedding_service = EmbeddingService()