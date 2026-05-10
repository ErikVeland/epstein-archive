/* eslint-disable no-undef */

export const shorthands = undefined;

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

export async function up(pgm) {
  pgm.sql(`CREATE SCHEMA IF NOT EXISTS archive_v21;`);

  // These were initially classified as dead, but code usage proves they are still wired.
  // Keep them public until the evidence/media write paths are migrated to canonical tables.
  restoreIfArchivedTableExists(pgm, 'evidence_entity');
  restoreIfArchivedTableExists(pgm, 'media_assets');
}

export async function down(pgm) {
  archiveIfPublicTableExists(pgm, 'media_assets');
  archiveIfPublicTableExists(pgm, 'evidence_entity');
}
