from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Numeric, Text, DateTime
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="admin") 
    is_active = Column(Boolean, default=True)
    
    config = relationship("UserConfig", back_populates="user", uselist=False)

class UserConfig(Base):
    __tablename__ = "user_configs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    system_api_key = Column(String(255), unique=True, index=True)
    
    # --- CONFIGURACIÓN DEL CHATBOT Y RAG (Defaults en Inglés) ---
    selected_embedding_model = Column(String(50), default="all-MiniLM-L6-v2")
    selected_llm_model = Column(String(50), default="llama3-8b-8192")
    welcome_message = Column(Text, default="Hello! How can I help you today?")
    system_prompt = Column(Text, default="You are an expert sales assistant. Use only the provided context to recommend products. If the product is not in the context, politely say you don't have it.")
    
    is_active = Column(Boolean, default=True)
    user = relationship("User", back_populates="config")

class ProductEmbedding(Base):
    __tablename__ = "product_embeddings"
    variant_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user_configs.id"), primary_key=True)
    sku = Column(String(100))
    display_name = Column(Text)
    description = Column(Text)
    price = Column(Numeric)
    stock = Column(Numeric)
    category = Column(String(100))
    website_url = Column(Text)
    embedding = Column(Vector(384))

class SearchHistory(Base):
    __tablename__ = "search_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    query_text = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ChatHistory(Base):
    __tablename__ = "chat_history"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(String(20))
    message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())