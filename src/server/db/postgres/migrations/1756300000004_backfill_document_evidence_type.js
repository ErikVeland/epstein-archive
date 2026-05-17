/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    DO $$
    DECLARE
      rows_updated INTEGER;
    BEGIN
      LOOP
        WITH candidate AS (
          SELECT id
          FROM public.documents
          WHERE id >= 1000000
            AND (evidence_type IS NULL OR btrim(evidence_type) = '')
            AND file_path IS NOT NULL
            AND btrim(file_path) <> ''
          ORDER BY id
          LIMIT 5000
        )
        UPDATE public.documents d
        SET evidence_type = CASE
          WHEN lower(d.file_type) IN ('jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'tiff', 'bmp') THEN 'media'
          WHEN lower(d.file_type) IN ('mp4', 'mov', 'avi', 'mkv', 'webm', 'mp3', 'wav', 'm4a', 'flac') THEN 'media'
          WHEN lower(d.file_type) IN ('eml', 'email', 'msg') THEN 'email'
          ELSE 'document'
        END
        FROM candidate
        WHERE d.id = candidate.id;

        GET DIAGNOSTICS rows_updated = ROW_COUNT;
        EXIT WHEN rows_updated = 0;
      END LOOP;
    END $$;
  `);
}

export async function down() {
  // Data backfill is intentionally forward-only.
}
