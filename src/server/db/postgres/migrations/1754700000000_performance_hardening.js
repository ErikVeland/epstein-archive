export const shorthands = undefined;

export async function up(pgm) {
  pgm.noTransaction();
  pgm.sql('SET statement_timeout = 0;');

  // Enable trigrams if not already enabled (should be from previous migrations)
  pgm.sql('CREATE EXTENSION IF NOT EXISTS pg_trgm;');

  // 1. Documents Table Optimizations
  // Trigram indices for the multi-column text search in getDocuments
  pgm.sql(
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_file_name_trgm ON documents USING gin (file_name gin_trgm_ops);',
  );
  pgm.sql(
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_file_path_trgm ON documents USING gin (file_path gin_trgm_ops);',
  );
  pgm.sql(
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_source_coll_trgm ON documents USING gin (source_collection gin_trgm_ops);',
  );

  // Full-text search index (essential for the @@ operator)
  pgm.sql(
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_fts ON documents USING gin (fts_vector);',
  );

  // Red Flag index for sorting
  pgm.sql(
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_red_flag ON documents (red_flag_rating DESC NULLS LAST);',
  );

  // Date created index for sorting
  pgm.sql(
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_date_created ON documents (date_created DESC NULLS LAST);',
  );

  // 2. Entities Table Optimizations
  // primary_role and aliases are used in ILIKE queries in getSubjectCards
  pgm.sql(
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entities_primary_role_trgm ON entities USING gin (primary_role gin_trgm_ops);',
  );
  pgm.sql(
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entities_aliases_trgm ON entities USING gin (aliases gin_trgm_ops);',
  );

  // Persistence for calculated sorting scores to avoid expensive on-the-fly regex ranking
  if (!(await hasColumn(pgm, 'entities', 'calculated_rank_score'))) {
    pgm.sql('ALTER TABLE entities ADD COLUMN calculated_rank_score FLOAT DEFAULT 0;');
    pgm.sql(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entities_rank_score ON entities (calculated_rank_score DESC);',
    );
  }
}

export async function down(pgm) {
  pgm.noTransaction();
  pgm.sql('DROP INDEX CONCURRENTLY IF EXISTS idx_entities_rank_score;');
  pgm.sql('ALTER TABLE entities DROP COLUMN IF EXISTS calculated_rank_score;');
  pgm.sql('DROP INDEX CONCURRENTLY IF EXISTS idx_entities_aliases_trgm;');
  pgm.sql('DROP INDEX CONCURRENTLY IF EXISTS idx_entities_primary_role_trgm;');
  pgm.sql('DROP INDEX CONCURRENTLY IF EXISTS idx_documents_date_created;');
  pgm.sql('DROP INDEX CONCURRENTLY IF EXISTS idx_documents_red_flag;');
  pgm.sql('DROP INDEX CONCURRENTLY IF EXISTS idx_documents_fts;');
  pgm.sql('DROP INDEX CONCURRENTLY IF EXISTS idx_documents_source_coll_trgm;');
  pgm.sql('DROP INDEX CONCURRENTLY IF EXISTS idx_documents_file_path_trgm;');
  pgm.sql('DROP INDEX CONCURRENTLY IF EXISTS idx_documents_file_name_trgm;');
}

async function hasColumn(pgm, tableName, columnName) {
  const res = await pgm.db.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name='${tableName}' AND column_name='${columnName}'`,
  );
  return res.rowCount > 0;
}
