/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE SCHEMA IF NOT EXISTS archive_v21;

    CREATE TABLE IF NOT EXISTS archive_v21.documents_original_file_path_legacy AS
      SELECT id, original_file_path
      FROM public.documents
      WHERE original_file_path IS NOT NULL;

    ALTER TABLE public.documents
      DROP COLUMN IF EXISTS original_file_path;
  `);
}

export async function down(pgm) {
  pgm.sql(`
    ALTER TABLE public.documents
      ADD COLUMN IF NOT EXISTS original_file_path text;

    UPDATE public.documents d
    SET original_file_path = legacy.original_file_path
    FROM archive_v21.documents_original_file_path_legacy legacy
    WHERE legacy.id = d.id;
  `);
}
