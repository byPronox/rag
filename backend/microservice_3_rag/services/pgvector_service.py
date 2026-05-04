from sqlalchemy.orm import Session
from sqlalchemy import text

def search_similar_products(db: Session, user_id: int, query_vector: list, company_id: str, limit: int = 4):
    sql = text("""
        SELECT variant_id, sku, display_name, price_included, stock, category 
        FROM product_embeddings 
        WHERE user_id = :user_id AND company_id = :company_id
        ORDER BY embedding <=> CAST(:vector AS vector) 
        LIMIT :limit
    """)
    
    result = db.execute(sql, {
        "user_id": user_id, 
        "company_id": company_id,
        "vector": str(query_vector), 
        "limit": limit
    }).fetchall()
    
    products = []
    for row in result:
        products.append({
            "variant_id": row[0], 
            "sku": row[1], 
            "name": row[2], # Gracias al Microservicio 1, esto ya viene limpio sin el [SKU]
            "price": float(row[3]) if row[3] else 0.0, # Nota: Cambié a price_included para darle el precio final al usuario
            "stock": float(row[4]) if row[4] else 0, 
            "category": row[5]
        })
    return products