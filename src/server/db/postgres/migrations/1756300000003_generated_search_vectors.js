/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE IF EXISTS public.document_sentences
      ADD COLUMN IF NOT EXISTS fts_vector tsvector
        GENERATED ALWAYS AS (to_tsvector('english', LEFT(COALESCE(sentence_text, ''), 500000))) STORED;
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_document_sentences_fts
      ON public.document_sentences USING GIN (fts_vector);
  `);

  pgm.sql(`
    ALTER TABLE IF EXISTS public.investigations
      ADD COLUMN IF NOT EXISTS fts_vector tsvector
        GENERATED ALWAYS AS (to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, ''))) STORED;
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_investigations_fts
      ON public.investigations USING GIN (fts_vector);
  `);

  pgm.sql(`
    ALTER TABLE IF EXISTS public.articles
      ADD COLUMN IF NOT EXISTS fts_vector tsvector
        GENERATED ALWAYS AS (to_tsvector('english', LEFT(COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(content, ''), 500000))) STORED;
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_articles_fts
      ON public.articles USING GIN (fts_vector);
  `);

  pgm.sql(`
    ALTER TABLE IF EXISTS public.media_items
      ADD COLUMN IF NOT EXISTS fts_vector tsvector
        GENERATED ALWAYS AS (to_tsvector('english', COALESCE(file_path, '') || ' ' || COALESCE(title, '') || ' ' || COALESCE(description, ''))) STORED;
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_media_items_fts
      ON public.media_items USING GIN (fts_vector);
  `);
}

export async function down(pgm) {
  pgm.sql(`DROP INDEX IF EXISTS public.idx_document_sentences_fts;`);
  pgm.sql(`ALTER TABLE IF EXISTS public.document_sentences DROP COLUMN IF EXISTS fts_vector;`);
  pgm.sql(`DROP INDEX IF EXISTS public.idx_investigations_fts;`);
  pgm.sql(`ALTER TABLE IF EXISTS public.investigations DROP COLUMN IF EXISTS fts_vector;`);
  pgm.sql(`DROP INDEX IF EXISTS public.idx_articles_fts;`);
  pgm.sql(`ALTER TABLE IF EXISTS public.articles DROP COLUMN IF EXISTS fts_vector;`);
  pgm.sql(`DROP INDEX IF EXISTS public.idx_media_items_fts;`);
  pgm.sql(`ALTER TABLE IF EXISTS public.media_items DROP COLUMN IF EXISTS fts_vector;`);
}
