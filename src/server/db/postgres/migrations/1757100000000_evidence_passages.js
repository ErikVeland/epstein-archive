/* eslint-disable no-undef */

/**
 * Store durable sentence-level evidence addresses.
 *
 * This migration creates the target table only. A separate bounded job can
 * materialize passages without blocking the migration on the full corpus.
 */
export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.evidence_passages (
      id                  BIGSERIAL PRIMARY KEY,
      citation_id         TEXT        NOT NULL UNIQUE,
      document_id        BIGINT      NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
      document_sha256    TEXT        NOT NULL,
      page_id             BIGINT      REFERENCES public.document_pages(id) ON DELETE SET NULL,
      page_number         INTEGER     NOT NULL,
      source_sentence_id  BIGINT      NOT NULL UNIQUE REFERENCES public.document_sentences(id) ON DELETE CASCADE,
      sentence_index      INTEGER     NOT NULL,
      passage_text        TEXT        NOT NULL,
      text_sha256         TEXT        NOT NULL,
      text_start          INTEGER,
      text_end            INTEGER,
      scan_bbox           JSONB,
      ocr_confidence      REAL,
      source_collection   TEXT,
      source_release      TEXT,
      source_family       TEXT        NOT NULL,
      provenance_status   TEXT        NOT NULL DEFAULT 'missing',
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT evidence_passages_page_number_check CHECK (page_number > 0),
      CONSTRAINT evidence_passages_sentence_index_check CHECK (sentence_index >= 0),
      CONSTRAINT evidence_passages_text_offsets_check CHECK (
        (text_start IS NULL AND text_end IS NULL)
        OR (text_start >= 0 AND text_end >= text_start)
      )
    );
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_evidence_passages_document_page
      ON public.evidence_passages (document_id, page_number, sentence_index);
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_evidence_passages_source_family
      ON public.evidence_passages (source_family);
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_evidence_passages_text_sha256
      ON public.evidence_passages (text_sha256);
  `);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS public.evidence_passages;`);
}
