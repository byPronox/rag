from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from pydantic import BaseModel
from database.connection import get_db
from api.deps import validate_tenant_api_key
from services.embedding_service import embedding_service
from services.pgvector_service import search_similar_products

router = APIRouter()

class SearchRequest(BaseModel):
    query: str
    company_id: str
    session_id: Optional[str] = None

@router.post("/")
def semantic_search(request: SearchRequest, db: Session = Depends(get_db), auth: dict = Depends(validate_tenant_api_key)):
    
    vector = embedding_service.generate_vector(request.query)
    
    # Save search history
    sql_insert = text("""
        INSERT INTO search_history (user_id, company_id, session_id, query_text) 
        VALUES (:uid, :cid, :sid, :q)
    """)
    db.execute(sql_insert, {
        "uid": auth["user_id"],
        "cid": request.company_id,
        "sid": request.session_id,
        "q": request.query
    })
    db.commit()
    
    results = search_similar_products(
        db=db, 
        user_id=auth["user_id"], 
        query_vector=vector, 
        company_id=request.company_id, 
        limit=5
    )
    
    return {"results": results}