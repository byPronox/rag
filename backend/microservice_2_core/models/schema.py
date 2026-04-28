from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Numeric, Text
from sqlalchemy.orm import declarative_base, relationship
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
    selected_model = Column(String(50), default="all-MiniLM-L6-v2")
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