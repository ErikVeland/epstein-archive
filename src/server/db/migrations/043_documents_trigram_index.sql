-- Migration 043: Add pg_trgm GIN indexes on documents for fast LIKE/ILIKE lookups.
--
-- The /api/resolve/epstein-file endpoint uses unbounded LIKE '%...' predicates on
-- file_name, file_path, and original_file_path.  Without trigram indexes these
-- degrade to full sequential scans on the documents table.
--
-- pg_trgm must be enabled once per database; the IF NOT EXISTS guard makes this
-- idempotent so re-running migrations is safe.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- file_name
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_file_name_trgm
  ON documents USING GIN (LOWER(COALESCE(file_name, '')) gin_trgm_ops);

-- file_path
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_file_path_trgm
  ON documents USING GIN (LOWER(COALESCE(file_path, '')) gin_trgm_ops);

-- original_file_path
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_original_file_path_trgm
  ON documents USING GIN (LOWER(COALESCE(original_file_path, '')) gin_trgm_ops);
