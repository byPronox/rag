import json
from database.connection import get_db_connection
from services.embedding_service import embedding_service

def process_product_message(ch, method, properties, body):
    conn = get_db_connection()
    
    try:
        data = json.loads(body)
        api_key = data.get('api_key')
        action = data.get('action')
        variant_id = data.get('variant_id')
        
        with conn.cursor() as cur:
            # --- SECURITY LAYER: VALIDATE API KEY ---
            cur.execute("SELECT id FROM user_configs WHERE system_api_key = %s AND is_active = TRUE", (api_key,))
            user = cur.fetchone()
            
            if not user:
                print(f"[AUTH FAILED] Invalid or missing API Key for variant {variant_id}. Dropping message.")
                ch.basic_ack(delivery_tag=method.delivery_tag)
                return
            
            user_id = user[0]
            print(f"Processing '{action}' for product {variant_id} (Tenant ID: {user_id})...")

            # --- BUSINESS LOGIC ---
            if action in ['create', 'update', 'sync']:
                text_to_embed = f"Product: {data['display_name']}. Category: {data.get('category', '')}. Description: {data.get('description', '')}"
                vector = embedding_service.generate_vector(text_to_embed)
                
                cur.execute("""
                    INSERT INTO product_embeddings (variant_id, user_id, sku, display_name, description, price, stock, category, website_url, embedding)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (variant_id, user_id) DO UPDATE SET
                        sku = EXCLUDED.sku,
                        display_name = EXCLUDED.display_name,
                        description = EXCLUDED.description,
                        price = EXCLUDED.price,
                        stock = EXCLUDED.stock,
                        category = EXCLUDED.category,
                        website_url = EXCLUDED.website_url,
                        embedding = EXCLUDED.embedding;
                """, (
                    variant_id, user_id, data['sku'], data['display_name'], data['description'], 
                    data['price'], data['stock'], data.get('category'), data.get('website_url'), vector
                ))
            
            elif action == 'delete':
                cur.execute("DELETE FROM product_embeddings WHERE variant_id = %s AND user_id = %s", (variant_id, user_id))
        
        conn.commit()
        ch.basic_ack(delivery_tag=method.delivery_tag)
        print(f"[SUCCESS] Variant {variant_id} saved securely.")

    except Exception as e:
        print(f"[ERROR] Database or processing failure: {e}")
        conn.rollback()
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
    
    finally:
        conn.close()