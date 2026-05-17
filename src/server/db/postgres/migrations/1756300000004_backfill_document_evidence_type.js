/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    UPDATE public.documents
    SET evidence_type = CASE
      WHEN lower(file_type) IN ('jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'tiff', 'bmp') THEN 'media'
      WHEN lower(file_type) IN ('mp4', 'mov', 'avi', 'mkv', 'webm', 'mp3', 'wav', 'm4a', 'flac') THEN 'media'
      WHEN lower(file_type) IN ('eml', 'email', 'msg') THEN 'email'
      ELSE 'document'
    END
    WHERE id >= 1000000
      AND (evidence_type IS NULL OR btrim(evidence_type) = '')
      AND file_path IS NOT NULL
      AND btrim(file_path) <> '';
  `);
}

export async function down() {
  // Data backfill is intentionally forward-only.
}
