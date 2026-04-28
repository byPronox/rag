from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from database.connection import get_db
from api.deps import get_tenant_from_api_key
from services.embedding_service import embedding_service
from services.pgvector_service import search_similar_products

router = APIRouter()

class SearchRequest(BaseModel):
    query: str

@router.post("/")
def semantic_search(request: SearchRequest, db: Session = Depends(get_db), tenant: dict = Depends(get_tenant_from_api_key)):
    sql_hist = text("INSERT INTO search_history (user_id, query_text) VALUES (:uid, :q)")
    db.execute(sql_hist, {"uid": tenant["user_id"], "q": request.query})
    db.commit()

    vector = embedding_service.generate_vector(request.query)
    products = search_similar_products(db, tenant["user_id"], vector, limit=10)
    
    return {"results": products}