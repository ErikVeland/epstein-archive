/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.noTransaction();
  pgm.sql('SET statement_timeout = 0;');

  pgm.sql(`
    ALTER TABLE IF EXISTS public.document_sentences
      ADD COLUMN IF NOT EXISTS fts_vector tsvector;
  `);
  pgm.sql(`
    CREATE OR REPLACE FUNCTION public.update_document_sentences_fts_vector()
    RETURNS trigger AS $$
    BEGIN
      NEW.fts_vector := to_tsvector('english', LEFT(COALESCE(NEW.sentence_text, ''), 500000));
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_document_sentences_fts_vector ON public.document_sentences;
    CREATE TRIGGER trg_document_sentences_fts_vector
      BEFORE INSERT OR UPDATE OF sentence_text ON public.document_sentences
      FOR EACH ROW EXECUTE FUNCTION public.update_document_sentences_fts_vector();
  `);
  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_sentences_fts
      ON public.document_sentences USING GIN (fts_vector);
  `);

  pgm.sql(`
    ALTER TABLE IF EXISTS public.investigations
      ADD COLUMN IF NOT EXISTS fts_vector tsvector;
  `);
  pgm.sql(`
    CREATE OR REPLACE FUNCTION public.update_investigations_fts_vector()
    RETURNS trigger AS $$
    BEGIN
      NEW.fts_vector := to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, ''));
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_investigations_fts_vector ON public.investigations;
    CREATE TRIGGER trg_investigations_fts_vector
      BEFORE INSERT OR UPDATE OF title, description ON public.investigations
      FOR EACH ROW EXECUTE FUNCTION public.update_investigations_fts_vector();
  `);
  pgm.sql(`
    UPDATE public.investigations
    SET fts_vector = to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, ''))
    WHERE fts_vector IS NULL;
  `);
  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investigations_fts
      ON public.investigations USING GIN (fts_vector);
  `);

  pgm.sql(`
    ALTER TABLE IF EXISTS public.articles
      ADD COLUMN IF NOT EXISTS fts_vector tsvector;
  `);
  pgm.sql(`
    CREATE OR REPLACE FUNCTION public.update_articles_fts_vector()
    RETURNS trigger AS $$
    BEGIN
      NEW.fts_vector := to_tsvector(
        'english',
        LEFT(COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.content, ''), 500000)
      );
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_articles_fts_vector ON public.articles;
    CREATE TRIGGER trg_articles_fts_vector
      BEFORE INSERT OR UPDATE OF title, description, content ON public.articles
      FOR EACH ROW EXECUTE FUNCTION public.update_articles_fts_vector();
  `);
  pgm.sql(`
    UPDATE public.articles
    SET fts_vector = to_tsvector(
      'english',
      LEFT(COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(content, ''), 500000)
    )
    WHERE fts_vector IS NULL;
  `);
  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_fts
      ON public.articles USING GIN (fts_vector);
  `);

  pgm.sql(`
    ALTER TABLE IF EXISTS public.media_items
      ADD COLUMN IF NOT EXISTS fts_vector tsvector;
  `);
  pgm.sql(`
    CREATE OR REPLACE FUNCTION public.update_media_items_fts_vector()
    RETURNS trigger AS $$
    BEGIN
      NEW.fts_vector := to_tsvector(
        'english',
        COALESCE(NEW.file_path, '') || ' ' || COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, '')
      );
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_media_items_fts_vector ON public.media_items;
    CREATE TRIGGER trg_media_items_fts_vector
      BEFORE INSERT OR UPDATE OF file_path, title, description ON public.media_items
      FOR EACH ROW EXECUTE FUNCTION public.update_media_items_fts_vector();
  `);
  pgm.sql(`
    UPDATE public.media_items
    SET fts_vector = to_tsvector(
      'english',
      COALESCE(file_path, '') || ' ' || COALESCE(title, '') || ' ' || COALESCE(description, '')
    )
    WHERE fts_vector IS NULL;
  `);
  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_items_fts
      ON public.media_items USING GIN (fts_vector);
  `);
}

export async function down(pgm) {
  pgm.noTransaction();
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS public.idx_document_sentences_fts;`);
  pgm.sql(`DROP TRIGGER IF EXISTS trg_document_sentences_fts_vector ON public.document_sentences;`);
  pgm.sql(`DROP FUNCTION IF EXISTS public.update_document_sentences_fts_vector();`);
  pgm.sql(`ALTER TABLE IF EXISTS public.document_sentences DROP COLUMN IF EXISTS fts_vector;`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS public.idx_investigations_fts;`);
  pgm.sql(`DROP TRIGGER IF EXISTS trg_investigations_fts_vector ON public.investigations;`);
  pgm.sql(`DROP FUNCTION IF EXISTS public.update_investigations_fts_vector();`);
  pgm.sql(`ALTER TABLE IF EXISTS public.investigations DROP COLUMN IF EXISTS fts_vector;`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS public.idx_articles_fts;`);
  pgm.sql(`DROP TRIGGER IF EXISTS trg_articles_fts_vector ON public.articles;`);
  pgm.sql(`DROP FUNCTION IF EXISTS public.update_articles_fts_vector();`);
  pgm.sql(`ALTER TABLE IF EXISTS public.articles DROP COLUMN IF EXISTS fts_vector;`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS public.idx_media_items_fts;`);
  pgm.sql(`DROP TRIGGER IF EXISTS trg_media_items_fts_vector ON public.media_items;`);
  pgm.sql(`DROP FUNCTION IF EXISTS public.update_media_items_fts_vector();`);
  pgm.sql(`ALTER TABLE IF EXISTS public.media_items DROP COLUMN IF EXISTS fts_vector;`);
}
