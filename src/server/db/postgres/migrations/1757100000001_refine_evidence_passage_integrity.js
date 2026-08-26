/* eslint-disable no-undef */

/**
 * Preserve honest coordinates and immutable passage revisions.
 *
 * An unknown page remains NULL. A changed document revision or transcription
 * may create a new citation for the same source sentence. Source rows cannot be
 * deleted while durable citations refer to them.
 */
export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE public.evidence_passages
      ALTER COLUMN page_number DROP NOT NULL,
      DROP CONSTRAINT IF EXISTS evidence_passages_source_sentence_id_key,
      DROP CONSTRAINT IF EXISTS evidence_passages_document_id_fkey,
      DROP CONSTRAINT IF EXISTS evidence_passages_source_sentence_id_fkey;

    ALTER TABLE public.evidence_passages
      ADD CONSTRAINT evidence_passages_document_id_fkey
        FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE RESTRICT,
      ADD CONSTRAINT evidence_passages_source_sentence_id_fkey
        FOREIGN KEY (source_sentence_id)
        REFERENCES public.document_sentences(id) ON DELETE RESTRICT,
      ADD CONSTRAINT evidence_passages_source_revision_key
        UNIQUE (source_sentence_id, document_sha256, text_sha256);

    UPDATE public.evidence_passages ep
    SET source_family = COALESCE(
      (
        SELECT 'asset-sha256:' || COALESCE(original.sha256, fa.sha256)
        FROM public.document_assets da
        JOIN public.file_assets fa ON fa.id = da.asset_id
        LEFT JOIN public.file_assets original ON original.id = fa.original_asset_id
        WHERE da.document_id = ep.document_id
        ORDER BY
          CASE da.role WHEN 'original' THEN 0 WHEN 'primary' THEN 1 ELSE 2 END,
          fa.is_original DESC,
          fa.id ASC
        LIMIT 1
      ),
      CASE
        WHEN NULLIF(d.content_sha256, '') IS NOT NULL
          THEN 'document-sha256:' || d.content_sha256
      END,
      'document-id:' || COALESCE(d.original_file_id, d.id)::text
    )
    FROM public.documents d
    WHERE d.id = ep.document_id;

    COMMENT ON COLUMN public.evidence_passages.page_number IS
      'One-indexed source page when known; NULL means the passage has no verified page mapping.';
    COMMENT ON COLUMN public.evidence_passages.source_family IS
      'Duplicate family keyed by the original asset, source content, or stable document lineage.';
  `);
}

export async function down(pgm) {
  pgm.sql(`
    ALTER TABLE public.evidence_passages
      DROP CONSTRAINT IF EXISTS evidence_passages_source_revision_key,
      DROP CONSTRAINT IF EXISTS evidence_passages_document_id_fkey,
      DROP CONSTRAINT IF EXISTS evidence_passages_source_sentence_id_fkey;

    ALTER TABLE public.evidence_passages
      ADD CONSTRAINT evidence_passages_document_id_fkey
        FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE,
      ADD CONSTRAINT evidence_passages_source_sentence_id_fkey
        FOREIGN KEY (source_sentence_id)
        REFERENCES public.document_sentences(id) ON DELETE CASCADE,
      ADD CONSTRAINT evidence_passages_source_sentence_id_key UNIQUE (source_sentence_id),
      ALTER COLUMN page_number SET NOT NULL;
  `);
}
