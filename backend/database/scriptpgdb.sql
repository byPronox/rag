-- =============================================================================
-- SCRIPT DE INSTALACIÓN - SaaS RAG multi-tenant (Capstone UDLA)
-- Crea la base de datos completa desde cero: extensiones, tablas, índices y datos base.
--
-- ADVERTENCIA: borra todas las tablas antes de crearlas. Úsalo solo en una base NUEVA
-- (instalación local o al clonar el repo). Nunca sobre la base de Railway en producción.
--
-- Uso:
--   psql "$DATABASE_URL" -f backend/database/scriptpgdb.sql
--   o con Docker: docker-compose lo ejecuta solo al crear el volumen de Postgres.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Extensiones
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;   -- pgvector: embeddings y búsqueda por similitud
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- trigramas: búsqueda léxica tolerante a errores de tipeo

-- -----------------------------------------------------------------------------
-- 2. Limpieza (orden inverso a las dependencias)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS product_sync_versions CASCADE;
DROP TABLE IF EXISTS product_embeddings CASCADE;
DROP TABLE IF EXISTS chat_history CASCADE;
DROP TABLE IF EXISTS search_history CASCADE;
DROP TABLE IF EXISTS user_companies CASCADE;
DROP TABLE IF EXISTS user_configs CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS global_settings CASCADE;
DROP TABLE IF EXISTS ai_models CASCADE;

-- -----------------------------------------------------------------------------
-- 3. Catálogo de modelos de IA
-- -----------------------------------------------------------------------------
CREATE TABLE ai_models (
    id              VARCHAR(100) PRIMARY KEY,           -- id del proveedor (ej. 'openai/gpt-oss-20b')
    name            VARCHAR(100) NOT NULL,
    provider        VARCHAR(50)  DEFAULT 'Groq',
    type            VARCHAR(20)  DEFAULT 'llm',          -- 'llm' | 'embedding'
    is_active       BOOLEAN      DEFAULT FALSE,
    description     TEXT,
    context_window  INTEGER,
    dimensions      INTEGER,                             -- solo modelos de embeddings
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Modelos base. El de embeddings debe coincidir con la variable EMBEDDING_MODEL de MS1 y MS3.
INSERT INTO ai_models (id, name, provider, type, is_active, description, dimensions) VALUES
    ('paraphrase-multilingual-MiniLM-L12-v2', 'Multilingual MiniLM L12 v2', 'Sentence Transformers',
     'embedding', TRUE, 'Modelo local de embeddings multilingüe (ES/EN), 384 dimensiones', 384);

INSERT INTO ai_models (id, name, provider, type, is_active, description) VALUES
    ('openai/gpt-oss-20b',  'GPT-OSS 20B',  'Groq', 'llm', TRUE, 'Modelo por defecto del chat: rápido y multilingüe'),
    ('openai/gpt-oss-120b', 'GPT-OSS 120B', 'Groq', 'llm', TRUE, 'Respaldo del chat y generación de palabras clave (MS1)');

-- -----------------------------------------------------------------------------
-- 4. Configuración global del SaaS (una sola fila, id = 1)
-- -----------------------------------------------------------------------------
CREATE TABLE global_settings (
    id                       INTEGER PRIMARY KEY DEFAULT 1,
    default_llm_model        VARCHAR(100) REFERENCES ai_models(id),
    default_embedding_model  VARCHAR(100) REFERENCES ai_models(id),
    default_welcome_message  TEXT DEFAULT 'Hello! How can I help you today?',
    default_system_prompt    TEXT DEFAULT 'You are an expert sales assistant...',
    -- Reglas de negocio del asistente (editables en Admin -> Settings); MS3 las lee en cada mensaje.
    supreme_system_prompt    TEXT DEFAULT 'You are an expert sales assistant for an online store. CRITICAL RULES: 1. ONLY recommend products from the AVAILABLE CATALOG. 2. NEVER invent products, prices, stock or features. 3. If the product is not in the catalog, say so politely and suggest what the store does sell.',
    groq_api_key             VARCHAR(255),               -- la usan MS3 (chat) y MS1 (palabras clave)
    maintenance_mode         BOOLEAN DEFAULT FALSE,
    updated_at               TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO global_settings (id, default_llm_model, default_embedding_model)
VALUES (1, 'openai/gpt-oss-20b', 'paraphrase-multilingual-MiniLM-L12-v2');

-- -----------------------------------------------------------------------------
-- 5. Usuarios (administradores y tenants) y su API key
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id               SERIAL PRIMARY KEY,
    email            VARCHAR(100) UNIQUE NOT NULL,
    hashed_password  VARCHAR(255) NOT NULL,
    role             VARCHAR(20) DEFAULT 'user',         -- 'admin' | 'user'
    is_active        BOOLEAN DEFAULT TRUE,
    token_version    INTEGER DEFAULT 1                   -- se incrementa para cerrar sesión en todos los dispositivos
);

CREATE TABLE user_configs (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    system_api_key  VARCHAR(255) UNIQUE,                 -- la usa Odoo (vía MS1) y los widgets (MS3)
    is_active       BOOLEAN DEFAULT TRUE
);

-- -----------------------------------------------------------------------------
-- 6. Compañías de cada tenant (registradas por el handshake de Odoo en MS1)
-- -----------------------------------------------------------------------------
CREATE TABLE user_companies (
    id                        SERIAL PRIMARY KEY,
    user_id                   INTEGER REFERENCES users(id) ON DELETE CASCADE,
    platform                  VARCHAR(50) DEFAULT 'odoo',
    platform_company_id       VARCHAR(100) NOT NULL,     -- id de la compañía en Odoo
    company_name              VARCHAR(255) NOT NULL,
    selected_embedding_model  VARCHAR(100) DEFAULT 'paraphrase-multilingual-MiniLM-L12-v2'
                              REFERENCES ai_models(id) ON DELETE SET DEFAULT,
    selected_llm_model        VARCHAR(100) DEFAULT 'openai/gpt-oss-20b'
                              REFERENCES ai_models(id) ON DELETE SET DEFAULT,
    welcome_message           TEXT DEFAULT 'Hello! How can I help you today?',
    system_prompt             TEXT DEFAULT 'You are an expert sales assistant...',
    theme_color               VARCHAR(50) DEFAULT '#8b5cf6',
    chat_icon                 VARCHAR(50) DEFAULT 'Bot',
    is_active                 BOOLEAN DEFAULT TRUE,
    UNIQUE (user_id, platform, platform_company_id)
);

-- -----------------------------------------------------------------------------
-- 7. Catálogo vectorizado (lo escribe MS1, lo lee MS3)
-- -----------------------------------------------------------------------------
CREATE TABLE product_embeddings (
    variant_id            INTEGER NOT NULL,              -- product.product de Odoo
    user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id           INTEGER,                       -- product.template de Odoo (agrupa variantes)
    sku                   VARCHAR(100),
    display_name          TEXT,
    description           TEXT,                          -- texto ORIGINAL (con viñetas); el texto limpio no se guarda
    price_excluded        NUMERIC(10, 2),
    price_included        NUMERIC(10, 2),
    tax_percent           NUMERIC(5, 2),
    currency              VARCHAR(10),
    stock                 NUMERIC,                       -- free_qty (físico - reservado)
    category              VARCHAR(100),
    website_url           TEXT,
    image_128_url         TEXT,
    image_512_url         TEXT,
    image_1920_url        TEXT,
    company_id            VARCHAR(100),                  -- 'global' = producto compartido entre compañías
    company_name          VARCHAR(255),
    accessories           TEXT,
    alternatives          TEXT,
    -- Vector y control de recálculo
    embedding             vector(384),
    content_hash          VARCHAR(64),                   -- sha256(modelo | versión del texto | texto)
    embedding_model       VARCHAR(100),                  -- MS3 solo compara vectores del modelo actual
    -- Palabras clave (document expansion): sinónimos y traducciones generados por el LLM en MS1
    search_keywords       TEXT[],                        -- NULL = pendiente de generar
    keywords_source_hash  VARCHAR(64),                   -- nombre base + categoría + descripción con que se generaron
    keywords_attempts     INTEGER NOT NULL DEFAULT 0,
    keywords_updated_at   TIMESTAMP WITH TIME ZONE,
    search_text           TEXT,                          -- nombre + categoría + keywords normalizados (búsqueda léxica)
    PRIMARY KEY (variant_id, user_id)
);

-- Última versión aplicada de cada variante (y "lápida" al borrar): un evento más viejo
-- que el aplicado (ej. un reintento atrasado) se descarta en vez de sobrescribir datos nuevos.
CREATE TABLE product_sync_versions (
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    variant_id  INTEGER NOT NULL,
    source_ts   BIGINT  NOT NULL,                        -- event_ts de Odoo (microsegundos)
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, variant_id)
);

-- -----------------------------------------------------------------------------
-- 8. Historiales (métricas del panel y contexto del chat)
-- -----------------------------------------------------------------------------
CREATE TABLE search_history (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company_id     VARCHAR(100),
    session_id     VARCHAR(100),
    query_text     TEXT,
    results_count  INTEGER,                              -- 0 = búsqueda sin resultados
    top_score      NUMERIC(6, 4),                        -- similitud del mejor resultado
    latency_ms     INTEGER,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_history (
    id           SERIAL PRIMARY KEY,
    session_id   VARCHAR(100),
    user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company_id   VARCHAR(100),
    role         VARCHAR(20),                            -- 'user' | 'assistant'
    message      TEXT,
    tokens_used  INTEGER DEFAULT 0,
    latency_ms   INTEGER DEFAULT 0,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 9. Índices
-- -----------------------------------------------------------------------------
-- Búsqueda de MS3 y listados del panel por tenant + compañía
CREATE INDEX idx_product_embeddings_tenant
    ON product_embeddings (user_id, company_id, embedding_model);
-- Rama léxica de MS3 (LIKE y word_similarity sobre search_text)
CREATE INDEX idx_product_embeddings_search_text_trgm
    ON product_embeddings USING gin (search_text gin_trgm_ops);
-- Cola de pendientes del enriquecimiento de palabras clave (MS1)
CREATE INDEX idx_product_embeddings_keywords_pending
    ON product_embeddings (user_id, template_id) WHERE search_keywords IS NULL;
-- Reutilización de palabras clave entre variantes/compañías con el mismo contenido (MS1)
CREATE INDEX idx_product_embeddings_keywords_source
    ON product_embeddings (user_id, keywords_source_hash) WHERE search_keywords IS NOT NULL;

-- Historial del chat: últimos N mensajes de una sesión del tenant y compañía
CREATE INDEX idx_chat_history_session
    ON chat_history (session_id, user_id, company_id, created_at);
-- Métricas e historial de búsquedas del panel
CREATE INDEX idx_search_history_tenant
    ON search_history (user_id, company_id, created_at);

COMMIT;
