-- Migración 003: métricas de búsqueda e índices por tenant.
-- Incremental e idempotente: se puede correr más de una vez sobre la BD de Railway sin perder datos.

BEGIN;

-- Métricas por búsqueda (MS3 las llena automáticamente cuando detecta estas columnas).
ALTER TABLE search_history ADD COLUMN IF NOT EXISTS results_count INTEGER;
ALTER TABLE search_history ADD COLUMN IF NOT EXISTS top_score NUMERIC(6, 4);
ALTER TABLE search_history ADD COLUMN IF NOT EXISTS latency_ms INTEGER;

-- Índices por tenant/compañía para las consultas de MS3 y del panel.
CREATE INDEX IF NOT EXISTS idx_product_embeddings_tenant
    ON product_embeddings (user_id, company_id, embedding_model);
CREATE INDEX IF NOT EXISTS idx_chat_history_session
    ON chat_history (session_id, user_id, company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_search_history_tenant
    ON search_history (user_id, company_id, created_at);

-- Respuestas de error que la versión anterior de MS3 guardaba como si fueran del asistente.
DELETE FROM chat_history WHERE role = 'assistant' AND message LIKE 'Error communicating with LLM%';

-- Modelo LLM por defecto vigente en Groq (llama3-8b-8192 fue retirado).
INSERT INTO ai_models (id, name, provider, type, is_active, description)
VALUES ('openai/gpt-oss-20b', 'GPT-OSS 20B', 'Groq', 'llm', true, 'Default production chat model')
ON CONFLICT (id) DO NOTHING;
ALTER TABLE user_companies ALTER COLUMN selected_llm_model SET DEFAULT 'openai/gpt-oss-20b';
UPDATE global_settings SET default_llm_model = 'openai/gpt-oss-20b'
WHERE id = 1 AND (default_llm_model IS NULL OR default_llm_model = 'llama3-8b-8192');

COMMIT;
