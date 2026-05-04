import json
import requests
import re # IMPORTANTE AÑADIR ESTO PARA LIMPIAR EL NOMBRE
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
    
    try:
        data = json.loads(body)
        api_key = data.get('api_key')
        action = data.get('action')
        variant_id = data.get('variant_id')
        webhook_url = data.get('webhook_url')
        
        with conn.cursor() as cur:
            # --- CAPA DE AUTENTICACIÓN ---
            # La tabla user_configs ahora solo valida la API Key maestra del Inquilino
            cur.execute("SELECT user_id FROM user_configs WHERE system_api_key = %s AND is_active = TRUE", (api_key,))
            user = cur.fetchone()
            
            if not user:
                error_msg = f"Invalid or missing API Key for action {action}."
                print(f"[AUTH FAILED] {error_msg}")
                send_feedback_to_odoo(webhook_url, variant_id, error_msg)
                ch.basic_ack(delivery_tag=method.delivery_tag)
                return
            
            user_id = user[0]
            print(f"Processing '{action}' (Tenant ID: {user_id})...")

            if action == 'sync_companies':
                companies_data = data.get('companies', [])
                for comp in companies_data:
                    cur.execute("""
                        INSERT INTO user_companies (user_id, platform, platform_company_id, company_name)
                        VALUES (%s, 'odoo', %s, %s)
                        ON CONFLICT (user_id, platform, platform_company_id) 
                        DO UPDATE SET company_name = EXCLUDED.company_name;
                    """, (user_id, str(comp['id']), comp['name']))
                
                print(f"[SUCCESS] Handshake complete. Synced {len(companies_data)} companies.")
            
            elif action in ['create', 'update', 'sync']:
                raw_display_name = data.get('display_name', '')
                clean_name = re.sub(r'^\[.*?\]\s*', '', raw_display_name)

                text_to_embed = (
                    f"Company: {data.get('company_name', '')}. "
                    f"Product: {clean_name}. Category: {data.get('category', '')}. "
                    f"Price: {data.get('price_included', 0)} {data.get('currency', 'USD')} (Final price including {data.get('tax_percent', 0)}% tax). "
                    f"Base price without tax is {data.get('price_excluded', 0)} {data.get('currency', 'USD')}. "
                    f"Description: {data.get('description', '')}. "
                    f"Accessories for this product: {data.get('accessories', 'None')}. "
                    f"Alternative products: {data.get('alternatives', 'None')}."
                )
                
                vector = embedding_service.generate_vector(text_to_embed)
                
                cur.execute("""
                    INSERT INTO product_embeddings (
                        variant_id, user_id, sku, display_name, description, 
                        price_excluded, price_included, tax_percent, currency, 
                        stock, category, website_url, image_128_url, image_512_url, image_1920_url, 
                        company_id, company_name, accessories, alternatives, embedding
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (variant_id, user_id) DO UPDATE SET
                        sku = EXCLUDED.sku,
                        display_name = EXCLUDED.display_name,
                        description = EXCLUDED.description,
                        price_excluded = EXCLUDED.price_excluded,
                        price_included = EXCLUDED.price_included,
                        tax_percent = EXCLUDED.tax_percent,
                        currency = EXCLUDED.currency,
                        stock = EXCLUDED.stock,
                        category = EXCLUDED.category,
                        website_url = EXCLUDED.website_url,
                        image_128_url = EXCLUDED.image_128_url,
                        image_512_url = EXCLUDED.image_512_url,
                        image_1920_url = EXCLUDED.image_1920_url,
                        company_id = EXCLUDED.company_id,
                        company_name = EXCLUDED.company_name,
                        accessories = EXCLUDED.accessories,
                        alternatives = EXCLUDED.alternatives,
                        embedding = EXCLUDED.embedding;
                """, (
                    variant_id, user_id, data.get('sku'), clean_name, data.get('description'), 
                    data.get('price_excluded'), data.get('price_included'), data.get('tax_percent'), data.get('currency'),
                    data.get('stock'), data.get('category'), data.get('website_url'), 
                    data.get('image_128_url'), data.get('image_512_url'), data.get('image_1920_url'), 
                    str(data.get('company_id')), data.get('company_name'), # company_id como string
                    data.get('accessories', ''), data.get('alternatives', ''), vector
                ))
                print(f"[SUCCESS] Variant {variant_id} embedded and saved securely.")
            
            # --- LÓGICA 3: ELIMINACIÓN ---
            elif action == 'delete':
                cur.execute("DELETE FROM product_embeddings WHERE variant_id = %s AND user_id = %s", (variant_id, user_id))
                print(f"[SUCCESS] Variant {variant_id} deleted securely.")
        
        conn.commit()
        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        error_msg = f"Database or processing failure: {str(e)}"
        print(f"[ERROR] {error_msg}")
        conn.rollback()
        send_feedback_to_odoo(webhook_url, variant_id, error_msg)
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
    
    finally:
        if conn:
            conn.close()