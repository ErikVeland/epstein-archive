/* eslint-disable no-undef */

/**
 * Make durable evidence passages append-only.
 *
 * A correction must create a new citation row. Database clients cannot change
 * or remove evidence already published under an existing citation ID.
 */
export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION public.reject_evidence_passage_mutation()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $function$
    BEGIN
      RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = 'evidence_passages is append-only',
        DETAIL = FORMAT(
          'Cannot %s citation %s after publication.',
          LOWER(TG_OP),
          OLD.citation_id
        ),
        HINT = 'Insert a new row with a new citation_id for each correction.';
    END;
    $function$;

    DROP TRIGGER IF EXISTS evidence_passages_reject_mutation
      ON public.evidence_passages;

    CREATE TRIGGER evidence_passages_reject_mutation
      BEFORE UPDATE OR DELETE ON public.evidence_passages
      FOR EACH ROW
      EXECUTE FUNCTION public.reject_evidence_passage_mutation();

    COMMENT ON TRIGGER evidence_passages_reject_mutation ON public.evidence_passages IS
      'Rejects UPDATE and DELETE. Corrections require a new immutable citation row.';
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DROP TRIGGER IF EXISTS evidence_passages_reject_mutation
      ON public.evidence_passages;
    DROP FUNCTION IF EXISTS public.reject_evidence_passage_mutation();
  `);
}
