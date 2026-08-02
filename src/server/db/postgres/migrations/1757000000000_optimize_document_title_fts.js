/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
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

export async function down(pgm) {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_document_fts() RETURNS TRIGGER AS $$
    BEGIN
      NEW.fts_vector :=
        setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.file_name, '')), 'B') ||
        setweight(to_tsvector('english', left(coalesce(NEW.content, ''), 100000)), 'C');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
}
