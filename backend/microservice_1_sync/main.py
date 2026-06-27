from services.rabbitmq_service import start_worker

if __name__ == '__main__':
    print("Starting RAG Synchronization Microservice...")
    start_worker()