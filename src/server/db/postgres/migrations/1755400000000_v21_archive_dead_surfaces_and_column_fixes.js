/* eslint-disable no-undef */

export const shorthands = undefined;

function archiveIfPublicTableExists(pgm, tableName) {
  pgm.sql(`
    DO $$
    BEGIN
      IF to_regclass('public.${tableName}') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.${tableName} SET SCHEMA archive_v21';
      END IF;
    END $$;
  `);
}

function restoreIfArchivedTableExists(pgm, tableName) {
  pgm.sql(`
    DO $$
    BEGIN
      IF to_regclass('archive_v21.${tableName}') IS NOT NULL
         AND to_regclass('public.${tableName}') IS NULL THEN
        EXECUTE 'ALTER TABLE archive_v21.${tableName} SET SCHEMA public';
      END IF;
    END $$;
  `);
}

export async function up(pgm) {
  pgm.sql(`CREATE SCHEMA IF NOT EXISTS archive_v21;`);

  // Preserve empty legacy tables while removing them from the public schema.
  archiveIfPublicTableExists(pgm, 'resolution_candidates');
  archiveIfPublicTableExists(pgm, 'mentions');
  archiveIfPublicTableExists(pgm, 'timeline_events');

  // Low-risk FK type widening on small tables.
  pgm.sql(`
    ALTER TABLE IF EXISTS public.document_annotations
      ALTER COLUMN document_id TYPE bigint USING document_id::bigint;
  `);
  pgm.sql(`
    ALTER TABLE IF EXISTS public.face_clusters
      ALTER COLUMN entity_id TYPE bigint USING entity_id::bigint;
  `);

  // Typo fix. The service code is updated in the same v21 change.
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'forensic_signals'
          AND column_name = 'source_source'
      ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'forensic_signals'
          AND column_name = 'source_type'
      ) THEN
        ALTER TABLE public.forensic_signals RENAME COLUMN source_source TO source_type;
      END IF;
    END $$;
  `);

  // Column drops only where live validation showed zero non-null values.
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS archive_v21.articles_legacy_columns AS
    SELECT id, url, published_date
    FROM public.articles
    WHERE url IS NOT NULL OR published_date IS NOT NULL;
  `);
  pgm.sql(`
    ALTER TABLE IF EXISTS public.articles
      DROP COLUMN IF EXISTS url,
      DROP COLUMN IF EXISTS published_date;
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS archive_v21.documents_legacy_source_columns AS
    SELECT id, source_original_url
    FROM public.documents
    WHERE source_original_url IS NOT NULL;
  `);
  pgm.sql(`
    ALTER TABLE IF EXISTS public.documents
      DROP COLUMN IF EXISTS source_original_url;
  `);
}

export async function down(pgm) {
  pgm.sql(`
    ALTER TABLE IF EXISTS public.documents
      ADD COLUMN IF NOT EXISTS source_original_url text;
  `);
  pgm.sql(`
    UPDATE public.documents d
    SET source_original_url = b.source_original_url
    FROM archive_v21.documents_legacy_source_columns b
    WHERE d.id = b.id;
  `);

  pgm.sql(`
    ALTER TABLE IF EXISTS public.articles
      ADD COLUMN IF NOT EXISTS url text,
      ADD COLUMN IF NOT EXISTS published_date timestamptz;
  `);
  pgm.sql(`
    UPDATE public.articles a
    SET url = b.url,
        published_date = b.published_date
    FROM archive_v21.articles_legacy_columns b
    WHERE a.id = b.id;
  `);

  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'forensic_signals'
          AND column_name = 'source_type'
      ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'forensic_signals'
          AND column_name = 'source_source'
      ) THEN
        ALTER TABLE public.forensic_signals RENAME COLUMN source_type TO source_source;
      END IF;
    END $$;
  `);

  pgm.sql(`
    ALTER TABLE IF EXISTS public.face_clusters
      ALTER COLUMN entity_id TYPE integer USING entity_id::integer;
  `);
  pgm.sql(`
    ALTER TABLE IF EXISTS public.document_annotations
      ALTER COLUMN document_id TYPE integer USING document_id::integer;
  `);

  restoreIfArchivedTableExists(pgm, 'timeline_events');
  restoreIfArchivedTableExists(pgm, 'mentions');
  restoreIfArchivedTableExists(pgm, 'resolution_candidates');
}
