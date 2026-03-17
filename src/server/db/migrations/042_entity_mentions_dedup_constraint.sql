-- Migration 042: Add unique constraint to entity_mentions to prevent duplicate extraction runs
-- This prevents the same (entity, document, surface_text) tuple from being inserted multiple times.
-- The ingest_intelligence.ts script uses ON CONFLICT DO NOTHING to skip duplicates silently.

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_entity_mentions_entity_doc_surface
  ON entity_mentions (entity_id, document_id, surface_text);
