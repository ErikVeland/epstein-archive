export async function up(pgm) {
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
        EXECUTE 'CREATE EXTENSION IF NOT EXISTS vector';
        EXECUTE 'ALTER TABLE documents ADD COLUMN IF NOT EXISTS content_embedding vector(384)';
        EXECUTE 'ALTER TABLE entities ADD COLUMN IF NOT EXISTS description_embedding vector(384)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS documents_semantic_idx ON documents USING hnsw (content_embedding vector_cosine_ops)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS entities_semantic_idx ON entities USING hnsw (description_embedding vector_cosine_ops)';
      ELSE
        RAISE NOTICE 'pgvector extension not available; skipping semantic columns/indexes';
      END IF;
    END $$;
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DO $$
    BEGIN
      EXECUTE 'DROP INDEX IF EXISTS entities_semantic_idx';
      EXECUTE 'DROP INDEX IF EXISTS documents_semantic_idx';
      EXECUTE 'ALTER TABLE entities DROP COLUMN IF EXISTS description_embedding';
      EXECUTE 'ALTER TABLE documents DROP COLUMN IF EXISTS content_embedding';
      EXECUTE 'DROP EXTENSION IF EXISTS vector';
    END $$;
  `);
}
