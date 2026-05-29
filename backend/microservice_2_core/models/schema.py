from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Numeric, Text, DateTime, UniqueConstraint
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="user") 
    is_active = Column(Boolean, default=True)
    token_version = Column(Integer, default=1)
    config = relationship("UserConfig", back_populates="user", uselist=False)
    companies = relationship("UserCompany", back_populates="user")

class UserConfig(Base):
    __tablename__ = "user_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    system_api_key = Column(String(255), unique=True)
    is_active = Column(Boolean, default=True)
    user = relationship("User", back_populates="config")

class UserCompany(Base):
    __tablename__ = "user_companies"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    platform = Column(String(50), default='odoo')
    platform_company_id = Column(String(100), nullable=False)
    company_name = Column(String(255), nullable=False)
    selected_embedding_model = Column(String(100), ForeignKey("ai_models.id", ondelete="SET DEFAULT"), default="all-MiniLM-L6-v2")
    selected_llm_model = Column(String(100), ForeignKey("ai_models.id", ondelete="SET DEFAULT"), default="llama3-8b-8192")
    welcome_message = Column(Text, default="Hello! How can I help you today?")
    system_prompt = Column(Text, default="You are an expert sales assistant...")
    theme_color = Column(String(50), default="#8b5cf6")
    chat_icon = Column(String(50), default="Bot")
    is_active = Column(Boolean, default=True)
    __table_args__ = (UniqueConstraint('user_id', 'platform', 'platform_company_id', name='_user_platform_company_uc'),)
    user = relationship("User", back_populates="companies")

class ProductEmbedding(Base):
    __tablename__ = "product_embeddings"
    
    variant_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    sku = Column(String(100))
    display_name = Column(Text)
    description = Column(Text)
    price_excluded = Column(Numeric)
    price_included = Column(Numeric)
    tax_percent = Column(Numeric)
    currency = Column(String(10))
    stock = Column(Numeric)
    category = Column(String(100))
    website_url = Column(Text)
    image_128_url = Column(Text)
    image_512_url = Column(Text)
    image_1920_url = Column(Text)
    company_id = Column(String(100))
    company_name = Column(String(255))
    accessories = Column(Text)
    alternatives = Column(Text)
    embedding = Column(Vector(384))

class SearchHistory(Base):
    __tablename__ = "search_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    company_id = Column(String(100))
    session_id = Column(String(100))
    query_text = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ChatHistory(Base):
    __tablename__ = "chat_history"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    company_id = Column(String(100))
    role = Column(String(20))
    message = Column(Text)
    tokens_used = Column(Integer, default=0)
    latency_ms = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class GlobalSetting(Base):
    __tablename__ = "global_settings"

    id = Column(Integer, primary_key=True, index=True, default=1)
    default_llm_model = Column(String(50), default="llama3-8b-8192")
    default_embedding_model = Column(String(50), default="all-MiniLM-L6-v2")
    default_welcome_message = Column(Text, default="Hello! How can I help you today?")
    default_system_prompt = Column(Text, default="You are an expert sales assistant...")
    supreme_system_prompt = Column(Text, default="You are an expert sales assistant. CRITICAL RULES: 1. ONLY use the AVAILABLE CATALOG. 2. NEVER guess prices or stock. 3. If the product is not in context, apologize and decline.")
    groq_api_key = Column(String(255), nullable=True)
    maintenance_mode = Column(Boolean, default=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class AIModel(Base):
    __tablename__ = "ai_models"

    id = Column(String(100), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    provider = Column(String(50), default="Groq")
    type = Column(String(20), default="llm")
    is_active = Column(Boolean, default=False)
    description = Column(Text, nullable=True)
    context_window = Column(Integer, nullable=True)
    dimensions = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())