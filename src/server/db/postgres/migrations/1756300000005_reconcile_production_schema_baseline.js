/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.noTransaction();

  pgm.sql(`
    ALTER TABLE documents
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
  `);

  pgm.sql(`
    ALTER TABLE entity_relationships
      ADD COLUMN IF NOT EXISTS signal_ids UUID[] DEFAULT '{}'::uuid[];
  `);

  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'documents'
          AND column_name = 'has_failed_redactions'
          AND data_type = 'boolean'
      ) THEN
        ALTER TABLE documents
          ALTER COLUMN has_failed_redactions DROP DEFAULT,
          ALTER COLUMN has_failed_redactions TYPE INTEGER
            USING CASE WHEN has_failed_redactions THEN 1 ELSE 0 END,
          ALTER COLUMN has_failed_redactions SET DEFAULT 0;
      ELSE
        ALTER TABLE documents
          ALTER COLUMN has_failed_redactions SET DEFAULT 0;
      END IF;
    END $$;
  `);

  pgm.sql(`
    ALTER TABLE forensic_signals
      ALTER COLUMN status SET DEFAULT 'pending_review';
    ALTER TABLE investigation_collaborators
      ALTER COLUMN permission_level SET DEFAULT 'editor';
    ALTER TABLE investigation_leads
      ALTER COLUMN priority SET DEFAULT 'medium',
      ALTER COLUMN status SET DEFAULT 'open';
  `);

  pgm.sql(`
    CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS entity_mentions_pkey
      ON entity_mentions (id);
  `);

  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investigation_leads_investigation_id
      ON investigation_leads (investigation_id);
  `);

  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investigations_owner_status
      ON investigations (owner_id, status);
  `);

  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investigations_updated_at
      ON investigations (updated_at DESC);
  `);
}

export async function down(pgm) {
  pgm.noTransaction();

  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_investigations_updated_at;`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_investigations_owner_status;`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_investigation_leads_investigation_id;`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS entity_mentions_pkey;`);
  pgm.sql(`ALTER TABLE entity_relationships DROP COLUMN IF EXISTS signal_ids;`);
  pgm.sql(`ALTER TABLE documents DROP COLUMN IF EXISTS created_at;`);
}
