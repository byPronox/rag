from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database.connection import get_db
from api.deps import validate_tenant_api_key
from services.embedding_service import embedding_service
from services.pgvector_service import search_similar_products

router = APIRouter()

class SearchRequest(BaseModel):
    query: str
    company_id: str

@router.post("/")
def semantic_search(request: SearchRequest, db: Session = Depends(get_db), auth: dict = Depends(validate_tenant_api_key)):
    
    vector = embedding_service.generate_vector(request.query)
    
    results = search_similar_products(
        db=db, 
        user_id=auth["user_id"], 
        query_vector=vector, 
        company_id=request.company_id, 
        limit=5
    )
    
    return {"results": results}