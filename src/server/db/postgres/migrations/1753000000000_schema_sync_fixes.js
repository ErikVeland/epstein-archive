/* eslint-disable no-undef */

/**
 * Schema Sync Fixes
 *
 * Addresses mismatches between SQL queries and the actual schema:
 * 1. entities.needs_review / entities.manually_reviewed — referenced by black_book.sql
 * 2. evidence.original_file_path — referenced by evidence.sql
 * 3. articles.link unique index — required by insertArticle ON CONFLICT(link)
 * 4. investigation_evidence(investigation_id, evidence_id) unique — required by ON CONFLICT
 */
export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    DO $$
    BEGIN
      -- 1. Add missing entities columns for black book review
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'entities' AND column_name = 'needs_review'
      ) THEN
        ALTER TABLE entities ADD COLUMN needs_review INTEGER DEFAULT 0;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'entities' AND column_name = 'manually_reviewed'
      ) THEN
        ALTER TABLE entities ADD COLUMN manually_reviewed INTEGER DEFAULT 0;
      END IF;

      -- 2. Add missing evidence column
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'evidence' AND column_name = 'original_file_path'
      ) THEN
        ALTER TABLE evidence ADD COLUMN original_file_path TEXT;
      END IF;
    END;
    $$;
  `);

  // 3. Unique index on articles.link (deduplicate first)
  pgm.sql(`
    DELETE FROM articles a
    USING articles b
    WHERE a.id > b.id AND a.link = b.link AND a.link IS NOT NULL;
  `);
  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_link_unique
      ON articles (link);
  `);

  // 4. Unique index on investigation_evidence(investigation_id, evidence_id)
  pgm.sql(`
    DELETE FROM investigation_evidence a
    USING investigation_evidence b
    WHERE a.id > b.id
      AND a.investigation_id = b.investigation_id
      AND a.evidence_id = b.evidence_id
      AND a.evidence_id IS NOT NULL;
  `);
  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ie_investigation_evidence_unique
      ON investigation_evidence (investigation_id, evidence_id);
  `);
}

export async function down(pgm) {
  pgm.sql(`DROP INDEX IF EXISTS idx_ie_investigation_evidence_unique`);
  pgm.sql(`DROP INDEX IF EXISTS idx_articles_link_unique`);
  pgm.sql(`
    ALTER TABLE evidence DROP COLUMN IF EXISTS original_file_path;
    ALTER TABLE entities DROP COLUMN IF EXISTS manually_reviewed;
    ALTER TABLE entities DROP COLUMN IF EXISTS needs_review;
  `);
}
