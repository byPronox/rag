-- Migración 004: palabras clave por producto (document expansion) y búsqueda léxica con trigramas.
-- Incremental e idempotente: se puede correr más de una vez sobre la BD de Railway sin perder datos.
-- Después de aplicarla, MS1 completa search_keywords en segundo plano (no hace falta resync desde Odoo).

BEGIN;

-- Similitud por trigramas: tolera errores de tipeo ("audifnos" -> "audifonos").
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Sinónimos / traducciones / usos generados por el LLM una vez por plantilla.
ALTER TABLE product_embeddings ADD COLUMN IF NOT EXISTS search_keywords TEXT[];
-- Hash de nombre + categoría + descripción con el que se generaron: si el producto cambia, se regeneran.
ALTER TABLE product_embeddings ADD COLUMN IF NOT EXISTS keywords_source_hash VARCHAR(64);
ALTER TABLE product_embeddings ADD COLUMN IF NOT EXISTS keywords_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE product_embeddings ADD COLUMN IF NOT EXISTS keywords_updated_at TIMESTAMP WITH TIME ZONE;
-- Nombre + categoría + palabras clave en minúsculas y sin tildes: es lo que recorre la búsqueda léxica.
ALTER TABLE product_embeddings ADD COLUMN IF NOT EXISTS search_text TEXT;

-- Relleno inicial (sin palabras clave todavía; MS1 lo actualiza al generarlas).
UPDATE product_embeddings
SET search_text = trim(regexp_replace(
        translate(lower(coalesce(display_name, '') || ' ' || coalesce(category, '')),
                  'áàäâéèëêíìïîóòöôúùüûñ', 'aaaaeeeeiiiioooouuuun'),
        '[^a-z0-9]+', ' ', 'g'))
WHERE search_text IS NULL;

CREATE INDEX IF NOT EXISTS idx_product_embeddings_search_text_trgm
    ON product_embeddings USING gin (search_text gin_trgm_ops);
-- La cola de pendientes del enriquecimiento se consulta seguido: índice parcial.
CREATE INDEX IF NOT EXISTS idx_product_embeddings_keywords_pending
    ON product_embeddings (user_id, template_id) WHERE search_keywords IS NULL;

COMMIT;
