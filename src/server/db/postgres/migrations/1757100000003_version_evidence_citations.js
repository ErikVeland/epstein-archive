/* eslint-disable no-undef */

/** Record the citation algorithm so durable addresses can outlive later schemes. */
export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE public.evidence_passages
      ADD COLUMN citation_schema TEXT NOT NULL DEFAULT 'evidence-passage-v1',
      ADD CONSTRAINT evidence_passages_citation_schema_check CHECK (
        citation_schema ~ '^evidence-passage-v[0-9]+$'
      );

    CREATE INDEX idx_evidence_passages_citation_schema
      ON public.evidence_passages (citation_schema);

    COMMENT ON COLUMN public.evidence_passages.citation_schema IS
      'Version of the deterministic citation canonicalization algorithm.';
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DROP INDEX IF EXISTS public.idx_evidence_passages_citation_schema;
    ALTER TABLE public.evidence_passages
      DROP CONSTRAINT IF EXISTS evidence_passages_citation_schema_check,
      DROP COLUMN IF EXISTS citation_schema;
  `);
}
