/* eslint-disable no-undef */

/**
 * Pin every durable passage to its document revision and immutable source asset.
 *
 * Real source hashes stay distinct from synthetic revision identifiers. The
 * citation ID is the only uniqueness boundary so corrected coordinates and
 * later transcription revisions can coexist with older citations.
 */
export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE public.evidence_passages
      ADD COLUMN document_revision_hash TEXT,
      ADD COLUMN asset_id BIGINT,
      ADD COLUMN asset_sha256 TEXT,
      ADD COLUMN quote_occurrence INTEGER,
      ALTER COLUMN document_sha256 DROP NOT NULL,
      DROP CONSTRAINT IF EXISTS evidence_passages_source_revision_key;

    WITH passage_updates AS (
      SELECT
        ep.id,
        ep.document_sha256 AS previous_document_revision_hash,
        d.content_sha256,
        d.original_file_id,
        d.id AS document_id,
        asset.id AS asset_id,
        asset.sha256 AS asset_sha256,
        occurrence.quote_occurrence
      FROM public.evidence_passages ep
      JOIN public.documents d ON d.id = ep.document_id
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(original.id, fa.id) AS id,
          CASE
            WHEN LOWER(
              REGEXP_REPLACE(COALESCE(original.sha256, fa.sha256, ''), '^sha256:', '')
            ) ~ '^[a-f0-9]{64}$'
              THEN LOWER(
                REGEXP_REPLACE(COALESCE(original.sha256, fa.sha256), '^sha256:', '')
              )
            ELSE NULL
          END AS sha256
        FROM public.document_assets da
        JOIN public.file_assets fa ON fa.id = da.asset_id
        LEFT JOIN public.file_assets original ON original.id = fa.original_asset_id
        WHERE da.document_id = ep.document_id
        ORDER BY
          CASE da.role WHEN 'original' THEN 0 WHEN 'primary' THEN 1 ELSE 2 END,
          fa.is_original DESC,
          fa.id ASC
        LIMIT 1
      ) asset ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::INTEGER AS quote_occurrence
        FROM public.document_sentences prior
        WHERE prior.document_id = ep.document_id
          AND prior.sentence_text = ep.passage_text
          AND (
            prior.sentence_index < ep.sentence_index
            OR (
              prior.sentence_index = ep.sentence_index
              AND prior.id < ep.source_sentence_id
            )
          )
      ) occurrence ON TRUE
    )
    UPDATE public.evidence_passages ep
    SET
      document_revision_hash = passage_updates.previous_document_revision_hash,
      document_sha256 = CASE
        WHEN LOWER(
          REGEXP_REPLACE(COALESCE(passage_updates.content_sha256, ''), '^sha256:', '')
        )
          ~ '^[a-f0-9]{64}$'
          THEN LOWER(REGEXP_REPLACE(passage_updates.content_sha256, '^sha256:', ''))
        ELSE NULL
      END,
      asset_id = passage_updates.asset_id,
      asset_sha256 = passage_updates.asset_sha256,
      source_family = COALESCE(
        CASE
          WHEN passage_updates.asset_sha256 IS NOT NULL
            THEN 'asset-sha256:' || passage_updates.asset_sha256
        END,
        CASE
          WHEN LOWER(
            REGEXP_REPLACE(COALESCE(passage_updates.content_sha256, ''), '^sha256:', '')
          )
            ~ '^[a-f0-9]{64}$'
            THEN 'document-sha256:'
              || LOWER(REGEXP_REPLACE(passage_updates.content_sha256, '^sha256:', ''))
        END,
        'document-id:'
          || COALESCE(passage_updates.original_file_id, passage_updates.document_id)::text
      ),
      quote_occurrence = passage_updates.quote_occurrence
    FROM passage_updates
    WHERE passage_updates.id = ep.id;

    ALTER TABLE public.evidence_passages
      ALTER COLUMN document_revision_hash SET NOT NULL,
      ADD CONSTRAINT evidence_passages_asset_id_fkey
        FOREIGN KEY (asset_id) REFERENCES public.file_assets(id) ON DELETE RESTRICT,
      ADD CONSTRAINT evidence_passages_asset_sha256_check CHECK (
        asset_sha256 IS NULL OR asset_sha256 ~ '^[a-f0-9]{64}$'
      ),
      ADD CONSTRAINT evidence_passages_document_sha256_check CHECK (
        document_sha256 IS NULL OR document_sha256 ~ '^[a-f0-9]{64}$'
      ),
      ADD CONSTRAINT evidence_passages_document_revision_hash_check CHECK (
        document_revision_hash ~ '^[a-f0-9]{64}$'
      ),
      ADD CONSTRAINT evidence_passages_quote_occurrence_check CHECK (
        quote_occurrence IS NULL OR quote_occurrence >= 0
      );

    CREATE INDEX idx_evidence_passages_asset_sha256
      ON public.evidence_passages (asset_sha256)
      WHERE asset_sha256 IS NOT NULL;

    COMMENT ON COLUMN public.evidence_passages.document_revision_hash IS
      'Stable hash used to version extracted text; it can be synthetic when no source hash exists.';
    COMMENT ON COLUMN public.evidence_passages.document_sha256 IS
      'Verified document content SHA-256 only; NULL when no real document hash is recorded.';
    COMMENT ON COLUMN public.evidence_passages.asset_sha256 IS
      'Pinned original source asset SHA-256; never resolved from a mutable current association.';
    COMMENT ON COLUMN public.evidence_passages.quote_occurrence IS
      'Zero-based occurrence of passage_text in document sentence order.';
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DROP INDEX IF EXISTS public.idx_evidence_passages_asset_sha256;

    ALTER TABLE public.evidence_passages
      DROP CONSTRAINT IF EXISTS evidence_passages_asset_id_fkey,
      DROP CONSTRAINT IF EXISTS evidence_passages_asset_sha256_check,
      DROP CONSTRAINT IF EXISTS evidence_passages_document_sha256_check,
      DROP CONSTRAINT IF EXISTS evidence_passages_document_revision_hash_check,
      DROP CONSTRAINT IF EXISTS evidence_passages_quote_occurrence_check,
      DROP COLUMN IF EXISTS quote_occurrence,
      DROP COLUMN IF EXISTS asset_sha256,
      DROP COLUMN IF EXISTS asset_id,
      DROP COLUMN IF EXISTS document_revision_hash,
      ALTER COLUMN document_sha256 SET NOT NULL;
  `);
}
