-- Migration 044: Add pg_trgm indexes on entity names and aliases to support
-- fuzzy people-name lookup in the shared search endpoint.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entities_full_name_trgm
  ON entities USING GIN (LOWER(COALESCE(full_name, '')) gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entities_aliases_trgm
  ON entities USING GIN (LOWER(COALESCE(aliases, '')) gin_trgm_ops);
