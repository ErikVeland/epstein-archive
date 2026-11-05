/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.noTransaction();
  pgm.sql(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entities_revision_created_at ON entities (created_at)`,
  );
  pgm.sql(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_revision_created_at ON documents (created_at)`,
  );
  pgm.sql(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entity_mentions_revision_created_at ON entity_mentions (created_at)`,
  );
  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entity_mentions_revision_ingest
    ON entity_mentions (created_at DESC) INCLUDE (ingest_run_id)
    WHERE ingest_run_id IS NOT NULL
  `);
}

export async function down(pgm) {
  pgm.noTransaction();
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_entity_mentions_revision_ingest`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_entity_mentions_revision_created_at`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_documents_revision_created_at`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_entities_revision_created_at`);
}
