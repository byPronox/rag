import pika
import time
from config.settings import Config
from controllers.message_controller import process_product_message

def start_worker():
    time.sleep(5) 
    
    parameters = pika.URLParameters(Config.RABBITMQ_URL)
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()
    
    channel.queue_declare(queue=Config.QUEUE_NAME, durable=True)
    channel.basic_qos(prefetch_count=1)
    
    channel.basic_consume(
        queue=Config.QUEUE_NAME, 
        on_message_callback=process_product_message
    )
    
    print(f"🚀 RabbitMQ Worker running. Listening on '{Config.QUEUE_NAME}'...")
    channel.start_consuming()