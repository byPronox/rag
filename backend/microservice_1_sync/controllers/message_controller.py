import json
import requests # IMPORTANTE AÑADIR ESTO
from database.connection import get_db_connection
from services.embedding_service import embedding_service

def send_feedback_to_odoo(webhook_url, variant_id, error_message):
    if not webhook_url:
        return
    try:
        payload = {"variant_id": variant_id, "error": error_message}
        response = requests.post(webhook_url, json=payload, timeout=5)
        print(f"Sent error feedback to Odoo. Status: {response.status_code}")
    except Exception as e:
        print(f"Could not reach Odoo Webhook: {e}")

def process_product_message(ch, method, properties, body):
    conn = get_db_connection()
    data = {}
    webhook_url = None
    variant_id = None
    
    try:
        data = json.loads(body)
        api_key = data.get('api_key')
        action = data.get('action')
        variant_id = data.get('variant_id')
        webhook_url = data.get('webhook_url')
        
        with conn.cursor() as cur:
            # --- SECURITY LAYER ---
            cur.execute("SELECT id FROM user_configs WHERE system_api_key = %s AND is_active = TRUE", (api_key,))
            user = cur.fetchone()
            
            if not user:
                error_msg = f"Invalid or missing API Key for variant {variant_id}."
                print(f"[AUTH FAILED] {error_msg}")
                send_feedback_to_odoo(webhook_url, variant_id, error_msg)
                ch.basic_ack(delivery_tag=method.delivery_tag)
                return
            
            user_id = user[0]
            print(f"Processing '{action}' for product {variant_id} (Tenant ID: {user_id})...")

            if action in ['create', 'update', 'sync']:
                # Añadimos la compañía al texto de la IA para que pueda buscar por empresa
                text_to_embed = f"Company: {data.get('company_name', '')}. Product: {data['display_name']}. Category: {data.get('category', '')}. Description: {data.get('description', '')}"
                vector = embedding_service.generate_vector(text_to_embed)
                
                cur.execute("""
                    INSERT INTO product_embeddings (
                        variant_id, user_id, sku, display_name, description, price, 
                        stock, category, website_url, image_128_url, image_512_url, image_1920_url, 
                        company_id, company_name, embedding
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (variant_id, user_id) DO UPDATE SET
                        sku = EXCLUDED.sku,
                        display_name = EXCLUDED.display_name,
                        description = EXCLUDED.description,
                        price = EXCLUDED.price,
                        stock = EXCLUDED.stock,
                        category = EXCLUDED.category,
                        website_url = EXCLUDED.website_url,
                        image_128_url = EXCLUDED.image_128_url,
                        image_512_url = EXCLUDED.image_512_url,
                        image_1920_url = EXCLUDED.image_1920_url,
                        company_id = EXCLUDED.company_id,
                        company_name = EXCLUDED.company_name,
                        embedding = EXCLUDED.embedding;
                """, (
                    variant_id, user_id, data['sku'], data['display_name'], data['description'], 
                    data['price'], data['stock'], data.get('category'), data.get('website_url'), 
                    data.get('image_128_url'), data.get('image_512_url'), data.get('image_1920_url'), 
                    data.get('company_id'), data.get('company_name'), vector
                ))
            
            elif action == 'delete':
                cur.execute("DELETE FROM product_embeddings WHERE variant_id = %s AND user_id = %s", (variant_id, user_id))
        
        conn.commit()
        ch.basic_ack(delivery_tag=method.delivery_tag)
        print(f"[SUCCESS] Variant {variant_id} saved securely.")

    except Exception as e:
        error_msg = f"Database or processing failure: {str(e)}"
        print(f"[ERROR] {error_msg}")
        conn.rollback()
        send_feedback_to_odoo(webhook_url, variant_id, error_msg)
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
    
    finally:
        conn.close()