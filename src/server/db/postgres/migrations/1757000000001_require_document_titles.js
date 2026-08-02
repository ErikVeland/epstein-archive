/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_document_fts() RETURNS TRIGGER AS $$
    DECLARE
      document_number text;
    BEGIN
      IF NEW.title IS NULL
         OR BTRIM(NEW.title) = ''
         OR LOWER(BTRIM(NEW.title)) IN ('untitled', 'untitled source', 'untitled document') THEN
        document_number := (regexp_match(
          COALESCE(NEW.file_name, ''),
          '(EFTA[0-9]{5,}|HOUSE[_ -]?OVERSIGHT[_ -]?[0-9]+)',
          'i'
        ))[1];
        NEW.title := COALESCE(UPPER(regexp_replace(document_number, '[ _]+', '_', 'g')), 'Document ' || NEW.id::text);
      END IF;

      IF TG_OP = 'UPDATE'
         AND NEW.title IS DISTINCT FROM OLD.title
         AND NEW.file_name IS NOT DISTINCT FROM OLD.file_name
         AND NEW.content IS NOT DISTINCT FROM OLD.content THEN
        NEW.fts_vector :=
          setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
          ts_filter(OLD.fts_vector, ARRAY['B', 'C', 'D']::"char"[]);
      ELSE
        NEW.fts_vector :=
          setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW.file_name, '')), 'B') ||
          setweight(to_tsvector('english', left(coalesce(NEW.content, ''), 100000)), 'C');
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
}

export async function down(pgm) {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_document_fts() RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'UPDATE'
         AND NEW.title IS DISTINCT FROM OLD.title
         AND NEW.file_name IS NOT DISTINCT FROM OLD.file_name
         AND NEW.content IS NOT DISTINCT FROM OLD.content THEN
        NEW.fts_vector :=
          setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
          ts_filter(OLD.fts_vector, ARRAY['B', 'C', 'D']::"char"[]);
      ELSE
        NEW.fts_vector :=
          setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW.file_name, '')), 'B') ||
          setweight(to_tsvector('english', left(coalesce(NEW.content, ''), 100000)), 'C');
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
}
