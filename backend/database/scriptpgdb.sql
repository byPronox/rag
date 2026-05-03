-- ==========================================
-- INITIALIZATION SCRIPT - SAAS RAG
-- ==========================================

-- 1. Enable AI extension (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Drop existing tables in reverse order of dependencies (To allow clean DB reset)
DROP TABLE IF EXISTS product_embeddings CASCADE;
DROP TABLE IF EXISTS chat_history CASCADE;
DROP TABLE IF EXISTS search_history CASCADE;
DROP TABLE IF EXISTS user_configs CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS global_settings CASCADE;
DROP TABLE IF EXISTS ai_models CASCADE;

-- ==========================================
-- 3. MASTER TABLES CREATION (No dependencies)
-- ==========================================

-- AI Models Catalog
CREATE TABLE ai_models (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    provider VARCHAR(50) DEFAULT 'Groq',
    type VARCHAR(20) DEFAULT 'llm',
    is_active BOOLEAN DEFAULT false,
    description TEXT,
    context_window INTEGER,
    dimensions INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Mandatory default models so the system doesn't break on startup
INSERT INTO ai_models (id, name, provider, type, is_active, description, dimensions) 
VALUES ('all-MiniLM-L6-v2', 'all-MiniLM-L6-v2', 'Sentence Transformers', 'embedding', true, 'Local embedding model', 384)
ON CONFLICT (id) DO NOTHING;

INSERT INTO ai_models (id, name, provider, type, is_active, description) 
VALUES ('llama3-8b-8192', 'Llama 3 8B', 'Groq', 'llm', true, 'Fast inference LLM model')
ON CONFLICT (id) DO NOTHING;

-- Global SaaS Configuration
CREATE TABLE global_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    default_llm_model VARCHAR(100) REFERENCES ai_models(id),
    default_embedding_model VARCHAR(100) REFERENCES ai_models(id),
    default_welcome_message TEXT DEFAULT 'Hello! How can I help you today?',
    default_system_prompt TEXT DEFAULT 'You are an expert sales assistant...',
    supreme_system_prompt TEXT DEFAULT 'You are an expert sales assistant. CRITICAL RULES: 1. ONLY use the AVAILABLE CATALOG. 2. NEVER guess prices or stock. 3. If the product is not in context, apologize and decline.',
    groq_api_key VARCHAR(255),
    maintenance_mode BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT single_row CHECK (id = 1) 
);

-- Insert base global configuration
INSERT INTO global_settings (id, default_llm_model, default_embedding_model) 
VALUES (1, 'llama3-8b-8192', 'all-MiniLM-L6-v2') 
ON CONFLICT DO NOTHING;

-- Parent Table: Users (Tenants / Admins)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE
);

-- ==========================================
-- 4. CHILD TABLES CREATION (With dependencies)
-- ==========================================

-- Child Table: User configurations (1-to-1 with Users)
CREATE TABLE user_configs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    system_api_key VARCHAR(255) UNIQUE,
    selected_embedding_model VARCHAR(100) DEFAULT 'all-MiniLM-L6-v2' REFERENCES ai_models(id) ON DELETE SET DEFAULT,
    selected_llm_model VARCHAR(100) DEFAULT 'llama3-8b-8192' REFERENCES ai_models(id) ON DELETE SET DEFAULT,
    welcome_message TEXT DEFAULT 'Hello! How can I help you today?',
    system_prompt TEXT DEFAULT 'You are an expert sales assistant...',
    theme_color VARCHAR(50) DEFAULT '#8b5cf6',
    chat_icon VARCHAR(50) DEFAULT 'Bot',
    is_active BOOLEAN DEFAULT TRUE
);

-- Vector Table: Synchronized products catalog
CREATE TABLE product_embeddings (
    variant_id INTEGER,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- Corrected: References users(id) directly
    sku VARCHAR(100),
    display_name TEXT,
    description TEXT,
    price_excluded NUMERIC(10, 2),
    price_included NUMERIC(10, 2),
    tax_percent NUMERIC(5, 2),
    currency VARCHAR(10),
    stock NUMERIC,
    category VARCHAR(100),
    website_url TEXT,
    image_128_url TEXT,
    image_512_url TEXT,
    image_1920_url TEXT,
    company_id INTEGER,
    company_name VARCHAR(255),
    accessories TEXT,
    alternatives TEXT,
    embedding vector(384),
    PRIMARY KEY (variant_id, user_id)
);

-- Semantic Search History (For Metrics)
CREATE TABLE search_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    query_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chatbot Conversation History (Updated with tokens and latency for Metrics)
CREATE TABLE chat_history (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20),
    message TEXT,
    tokens_used INTEGER DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);