-- ==========================================
-- INITIALIZATION SCRIPT - SAAS RAG ENTERPRISE
-- Multi-Tenant & Multi-Company Architecture
-- ==========================================

-- 1. Enable AI extension (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Drop existing tables in reverse order of dependencies (Clean DB reset)
DROP TABLE IF EXISTS product_embeddings CASCADE;
DROP TABLE IF EXISTS chat_history CASCADE;
DROP TABLE IF EXISTS search_history CASCADE;
DROP TABLE IF EXISTS user_companies CASCADE; -- NEW: Multi-company config
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

-- Mandatory default models to prevent system crashes on startup
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

-- Global Tenant Config (1-to-1 with Users)
-- NOTE: UI and Chat configurations have been moved to 'user_companies'
CREATE TABLE user_configs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    system_api_key VARCHAR(255) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Company-Specific Chat Configurations (1-to-Many with Users)
CREATE TABLE user_companies (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Agnostic Platform Integration (Ready for Odoo, Shopify, etc.)
    platform VARCHAR(50) DEFAULT 'odoo', 
    platform_company_id VARCHAR(100) NOT NULL, -- VARCHAR supports integers (Odoo) or UUIDs
    company_name VARCHAR(255) NOT NULL,
    
    -- Isolated Chatbot Configuration per Company
    selected_embedding_model VARCHAR(100) DEFAULT 'all-MiniLM-L6-v2' REFERENCES ai_models(id) ON DELETE SET DEFAULT,
    selected_llm_model VARCHAR(100) DEFAULT 'llama3-8b-8192' REFERENCES ai_models(id) ON DELETE SET DEFAULT,
    welcome_message TEXT DEFAULT 'Hello! How can I help you today?',
    system_prompt TEXT DEFAULT 'You are an expert sales assistant...',
    theme_color VARCHAR(50) DEFAULT '#8b5cf6',
    chat_icon VARCHAR(50) DEFAULT 'Bot',
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Prevent duplicate companies for the same tenant and platform
    UNIQUE(user_id, platform, platform_company_id) 
);

-- Vector Table: Synchronized products catalog
CREATE TABLE product_embeddings (
    variant_id INTEGER,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
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
    company_id VARCHAR(100),
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
    company_id VARCHAR(100), -- Added to track which company generated the search
    session_id VARCHAR(100), -- Track anonymous/guest or logged-in session
    query_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chatbot Conversation History (Updated with tokens, latency, and company context)
CREATE TABLE chat_history (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company_id VARCHAR(100), -- Added to track which company generated the chat
    role VARCHAR(20),
    message TEXT,
    tokens_used INTEGER DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);