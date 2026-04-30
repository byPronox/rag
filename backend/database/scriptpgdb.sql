-- 1. Habilitar la extensión de IA (Vectores)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Borrar tablas existentes (para limpiar el esquema y evitar errores)
-- El CASCADE borra automáticamente todo lo que dependa de ellas
DROP TABLE IF EXISTS product_embeddings CASCADE;
DROP TABLE IF EXISTS chat_history CASCADE;
DROP TABLE IF EXISTS search_history CASCADE;
DROP TABLE IF EXISTS user_configs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==========================================
-- 3. CREACIÓN DE TABLAS CON SUS RELACIONES
-- ==========================================

-- Tabla Padre: Usuarios
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE
);

-- Tabla Hija: Configuración (1 a 1 con Usuarios)
CREATE TABLE user_configs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    system_api_key VARCHAR(255) UNIQUE,
    selected_embedding_model VARCHAR(50) DEFAULT 'all-MiniLM-L6-v2',
    selected_llm_model VARCHAR(50) DEFAULT 'llama3-8b-8192',
    welcome_message TEXT DEFAULT 'Hello! How can I help you today?',
    system_prompt TEXT DEFAULT 'You are an expert sales assistant. Use only the provided context to recommend products. Always suggest the accessories listed in the context to increase cross-selling. If the product is not in the context, politely say you don''t have it.',
    is_active BOOLEAN DEFAULT TRUE
);

-- Tabla Hija: Vectores de Productos (Depende de user_configs)
CREATE TABLE product_embeddings (
    variant_id INTEGER,
    user_id INTEGER REFERENCES user_configs(id) ON DELETE CASCADE,
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
    -- Llave primaria compuesta: Un producto específico pertenece a un usuario específico
    PRIMARY KEY (variant_id, user_id)
);

-- Tabla Hija: Historial de Búsquedas (Depende de users)
CREATE TABLE search_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    query_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Hija: Historial de Chat (Depende de users)
CREATE TABLE chat_history (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);