from services.rabbitmq_service import start_worker

if __name__ == '__main__':
    print("Starting RAG Synchronization Microservice...")
    # La base de datos ya no se inicializa aquí. El MS2 se encargará de crear las tablas.
    start_worker()