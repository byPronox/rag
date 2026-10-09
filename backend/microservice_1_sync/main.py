import logging
import signal
import sys
from config.settings import Config
from services.rabbitmq_service import start_worker

def _handle_sigterm(signum, frame):
    raise SystemExit(0)


if __name__ == '__main__':
    logging.basicConfig(
        level=Config.LOG_LEVEL,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        stream=sys.stdout,
    )
    signal.signal(signal.SIGTERM, _handle_sigterm)
    logging.getLogger("sync").info("Starting RAG Synchronization Microservice...")
    start_worker()