import 'dotenv/config';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { getMaintenancePool, drainPools } from '../src/server/db/connection.js';
import {
  buildEvidenceCitation,
  EVIDENCE_CITATION_SCHEMA,
} from '../src/shared/evidence/citation.js';

export interface SourceSentenceRow {
  sentence_id: string;
  document_id: string;
  original_file_id: string | null;
  page_id: string | null;
  page_number: number | string | null;
  page_text: string | null;
  identical_sentence_ordinal: number | string | null;
  identical_document_sentence_ordinal: number | string | null;
  sentence_index: number | string;
  sentence_text: string;
  ocr_confidence: number | string | null;
  normalized_text_sha256: string | null;
  content_sha256: string | null;
  asset_id: string | null;
  asset_sha256: string | null;
  source_collection: string | null;
  source_release: string | null;
  provenance_status: string | null;
}

export interface PassageInsert {
  citationId: string;
  citationSchema: typeof EVIDENCE_CITATION_SCHEMA;
  documentId: string;
  documentRevisionHash: string;
  documentSha256: string | null;
  assetId: string | null;
  assetSha256: string | null;
  pageId: string | null;
  pageNumber: number | null;
  sourceSentenceId: string;
  sentenceIndex: number;
  passageText: string;
  textSha256: string;
  textStart: number | null;
  textEnd: number | null;
  quoteOccurrence: number | null;
  ocrConfidence: number | null;
  sourceCollection: string | null;
  sourceRelease: string | null;
  sourceFamily: string;
  provenanceStatus: string;
}

export interface BackfillOptions {
  batchSize: number;
  limit: number | null;
  afterId: string;
  dryRun: boolean;
}

const DEFAULT_BATCH_SIZE = 250;
const DEFAULT_LIMIT = DEFAULT_BATCH_SIZE;
const MAX_BATCH_SIZE = 1_000;
export const EVIDENCE_PASSAGE_INSERT_CONFLICT_SQL = 'ON CONFLICT (citation_id) DO NOTHING';

function flagValue(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = args.indexOf(`--${name}`);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (value === undefined || value.startsWith('--')) {
    throw new TypeError(`--${name} requires a value`);
  }
  return value;
}

function nonNegativeInteger(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new TypeError(`--${name} must be a non-negative integer`);
  }
  return parsed;
}

export function parseBackfillOptions(args: string[] = process.argv.slice(2)): BackfillOptions {
  const requestedBatchSize = nonNegativeInteger(
    flagValue(args, 'batch-size'),
    DEFAULT_BATCH_SIZE,
    'batch-size',
  );
  if (requestedBatchSize < 1 || requestedBatchSize > MAX_BATCH_SIZE) {
    throw new TypeError(`--batch-size must be between 1 and ${MAX_BATCH_SIZE}`);
  }

  const afterId = flagValue(args, 'after-id') || '0';
  if (!/^\d+$/.test(afterId)) throw new TypeError('--after-id must be a non-negative integer');

  const runAll = args.includes('--all');
  const limitValue = flagValue(args, 'limit');
  if (runAll && limitValue !== undefined) {
    throw new TypeError('Use either --all or --limit, not both');
  }
  const limit = runAll ? null : nonNegativeInteger(limitValue, DEFAULT_LIMIT, 'limit');
  if (limit !== null && limit < 1) {
    throw new TypeError('--limit must be at least 1. Use --all for an unlimited run.');
  }

  return {
    batchSize: requestedBatchSize,
    limit,
    afterId,
    dryRun: args.includes('--dry-run'),
  };
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function normalizeSha256(value: string | null | undefined): string | null {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^sha256:/, '');
  return /^[a-f0-9]{64}$/.test(normalized) ? normalized : null;
}

function nullableNumber(value: number | string | null): number | null {
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export interface DocumentHashIdentity {
  documentRevisionHash: string;
  documentSha256: string | null;
  assetSha256: string | null;
  syntheticRevision: boolean;
}

/**
 * Keep a citation revision digest separate from source hashes. The synthetic
 * fallback identifies a database document lineage. It is not a source digest.
 */
export function resolveDocumentHashIdentity(
  row: Pick<
    SourceSentenceRow,
    'document_id' | 'normalized_text_sha256' | 'content_sha256' | 'asset_sha256'
  >,
): DocumentHashIdentity {
  const normalizedTextSha256 = normalizeSha256(row.normalized_text_sha256);
  const documentSha256 = normalizeSha256(row.content_sha256);
  const assetSha256 = normalizeSha256(row.asset_sha256);
  const realRevisionHash = normalizedTextSha256 || documentSha256 || assetSha256;

  return {
    documentRevisionHash:
      realRevisionHash || sha256(`evidence-document-lineage-v1\u001f${row.document_id}`),
    documentSha256,
    assetSha256,
    syntheticRevision: realRevisionHash === null,
  };
}

function sourceFamily(row: SourceSentenceRow, identity: DocumentHashIdentity): string {
  return (
    (identity.assetSha256 ? `asset-sha256:${identity.assetSha256}` : null) ||
    (identity.documentSha256 ? `document-sha256:${identity.documentSha256}` : null) ||
    `document-id:${row.original_file_id || row.document_id}`
  );
}

export function findExactTextOffsets(
  pageText: string | null,
  sentenceText: string,
  identicalSentenceOrdinal: number | string | null,
): { textStart: number; textEnd: number } | null {
  if (pageText === null || sentenceText.length === 0) return null;
  if (identicalSentenceOrdinal === null) return null;
  const ordinal = Number(identicalSentenceOrdinal);
  if (!Number.isSafeInteger(ordinal) || ordinal < 0) return null;

  let searchFrom = 0;
  for (let occurrence = 0; occurrence <= ordinal; occurrence += 1) {
    const textStart = pageText.indexOf(sentenceText, searchFrom);
    if (textStart < 0) return null;
    if (occurrence === ordinal) {
      return { textStart, textEnd: textStart + sentenceText.length };
    }
    searchFrom = textStart + sentenceText.length;
  }
  return null;
}

export function toPassage(row: SourceSentenceRow): PassageInsert {
  const parsedPageNumber = row.page_number === null ? Number.NaN : Number(row.page_number);
  const pageNumber =
    Number.isSafeInteger(parsedPageNumber) && parsedPageNumber >= 1 ? parsedPageNumber : null;
  const sentenceIndex = Math.max(0, Number(row.sentence_index) || 0);
  const identity = resolveDocumentHashIdentity(row);
  const textOffsets = findExactTextOffsets(
    row.page_text,
    row.sentence_text,
    row.identical_sentence_ordinal,
  );
  const citation = buildEvidenceCitation({
    documentId: row.document_id,
    documentVersionHash: identity.documentRevisionHash,
    pageNumber,
    sentenceIndex,
    text: row.sentence_text,
  });

  return {
    citationId: citation.citationId,
    citationSchema: citation.citationSchema,
    documentId: row.document_id,
    documentRevisionHash: identity.documentRevisionHash,
    documentSha256: identity.documentSha256,
    assetId: row.asset_id,
    assetSha256: identity.assetSha256,
    pageId: row.page_id,
    pageNumber,
    sourceSentenceId: row.sentence_id,
    sentenceIndex,
    passageText: row.sentence_text,
    textSha256: citation.textSha256,
    textStart: textOffsets?.textStart ?? null,
    textEnd: textOffsets?.textEnd ?? null,
    quoteOccurrence: nullableNumber(row.identical_document_sentence_ordinal),
    ocrConfidence: nullableNumber(row.ocr_confidence),
    sourceCollection: row.source_collection,
    sourceRelease: row.source_release,
    sourceFamily: sourceFamily(row, identity),
    provenanceStatus: row.provenance_status || 'missing',
  };
}

async function assertSchema(): Promise<void> {
  const pool = getMaintenancePool();
  const result = await pool.query<{
    evidence_passages: string | null;
    columns: string[] | null;
  }>(
    `
      SELECT
        to_regclass('public.evidence_passages')::text AS evidence_passages,
        ARRAY(
          SELECT column_name::text
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'evidence_passages'
          ORDER BY column_name
        ) AS columns
    `,
  );
  if (!result.rows[0]?.evidence_passages) {
    throw new Error('evidence_passages is missing. Run pnpm db:migrate:pg first.');
  }
  const columns = new Set(result.rows[0].columns || []);
  const requiredColumns = [
    'asset_id',
    'asset_sha256',
    'citation_schema',
    'document_revision_hash',
    'document_sha256',
    'quote_occurrence',
    'text_end',
    'text_start',
  ];
  const missingColumns = requiredColumns.filter((column) => !columns.has(column));
  if (missingColumns.length > 0) {
    throw new Error(
      `evidence_passages is missing required columns: ${missingColumns.join(', ')}. Run pnpm db:migrate:pg first.`,
    );
  }
}

async function loadBatch(afterId: string, limit: number): Promise<SourceSentenceRow[]> {
  const pool = getMaintenancePool();
  const result = await pool.query<SourceSentenceRow>(
    `
      SELECT
        s.id::text AS sentence_id,
        s.document_id::text AS document_id,
        d.original_file_id::text AS original_file_id,
        s.page_id::text AS page_id,
        p.page_number,
        p.extracted_text AS page_text,
        CASE WHEN s.page_id IS NULL THEN NULL ELSE occurrence.page_quote_occurrence END
          AS identical_sentence_ordinal,
        occurrence.quote_occurrence AS identical_document_sentence_ordinal,
        s.sentence_index,
        s.sentence_text,
        p.ocr_confidence_avg AS ocr_confidence,
        d.normalized_text_sha256,
        d.content_sha256,
        asset.id::text AS asset_id,
        asset.sha256 AS asset_sha256,
        COALESCE(d.source_collection, asset.source_collection) AS source_collection,
        d.source_release,
        d.provenance_status
      FROM public.document_sentences s
      JOIN public.documents d ON d.id = s.document_id
      LEFT JOIN public.document_pages p ON p.id = s.page_id
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(original.id, fa.id) AS id,
          COALESCE(original.sha256, fa.sha256) AS sha256,
          COALESCE(original.source_collection, fa.source_collection) AS source_collection
        FROM public.document_assets da
        JOIN public.file_assets fa ON fa.id = da.asset_id
        LEFT JOIN public.file_assets original ON original.id = fa.original_asset_id
        WHERE da.document_id = s.document_id
        ORDER BY
          CASE da.role WHEN 'original' THEN 0 WHEN 'primary' THEN 1 ELSE 2 END,
          fa.is_original DESC,
          fa.id ASC
        LIMIT 1
      ) asset ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) FILTER (WHERE prior.page_id = s.page_id)::integer
            AS page_quote_occurrence,
          COUNT(*)::integer AS quote_occurrence
        FROM public.document_sentences prior
        WHERE prior.document_id = s.document_id
          AND prior.sentence_text = s.sentence_text
          AND (
            prior.sentence_index < s.sentence_index
            OR (prior.sentence_index = s.sentence_index AND prior.id < s.id)
          )
      ) occurrence ON TRUE
      WHERE s.id > $1::bigint
        AND NULLIF(BTRIM(s.sentence_text), '') IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM public.evidence_passages ep
          WHERE ep.source_sentence_id = s.id
            AND ep.citation_schema = 'evidence-passage-v2'
            AND ep.page_number IS NOT DISTINCT FROM p.page_number
            AND ep.sentence_index = s.sentence_index
            AND ep.passage_text = s.sentence_text
            AND ep.document_sha256 IS NOT DISTINCT FROM CASE
              WHEN REGEXP_REPLACE(LOWER(COALESCE(d.content_sha256, '')), '^sha256:', '')
                ~ '^[a-f0-9]{64}$'
                THEN REGEXP_REPLACE(LOWER(d.content_sha256), '^sha256:', '')
              ELSE NULL
            END
            AND ep.asset_sha256 IS NOT DISTINCT FROM CASE
              WHEN REGEXP_REPLACE(LOWER(COALESCE(asset.sha256, '')), '^sha256:', '')
                ~ '^[a-f0-9]{64}$'
                THEN REGEXP_REPLACE(LOWER(asset.sha256), '^sha256:', '')
              ELSE NULL
            END
            AND (
              ep.document_revision_hash = CASE
                WHEN REGEXP_REPLACE(
                  LOWER(COALESCE(d.normalized_text_sha256, '')),
                  '^sha256:',
                  ''
                )
                  ~ '^[a-f0-9]{64}$'
                  THEN REGEXP_REPLACE(LOWER(d.normalized_text_sha256), '^sha256:', '')
                WHEN REGEXP_REPLACE(LOWER(COALESCE(d.content_sha256, '')), '^sha256:', '')
                  ~ '^[a-f0-9]{64}$'
                  THEN REGEXP_REPLACE(LOWER(d.content_sha256), '^sha256:', '')
                WHEN REGEXP_REPLACE(LOWER(COALESCE(asset.sha256, '')), '^sha256:', '')
                  ~ '^[a-f0-9]{64}$'
                  THEN REGEXP_REPLACE(LOWER(asset.sha256), '^sha256:', '')
                ELSE NULL
              END
              OR (
                ep.document_sha256 IS NULL
                AND ep.asset_sha256 IS NULL
                AND REGEXP_REPLACE(
                  LOWER(COALESCE(d.normalized_text_sha256, '')),
                  '^sha256:',
                  ''
                ) !~ '^[a-f0-9]{64}$'
              )
            )
        )
      ORDER BY s.id ASC
      LIMIT $2
    `,
    [afterId, limit],
  );
  return result.rows;
}

async function insertBatch(passages: PassageInsert[]): Promise<number> {
  if (passages.length === 0) return 0;

  const values: unknown[] = [];
  const rows = passages.map((passage, rowIndex) => {
    const offset = rowIndex * 21;
    values.push(
      passage.citationId,
      passage.citationSchema,
      passage.documentId,
      passage.documentRevisionHash,
      passage.documentSha256,
      passage.assetId,
      passage.assetSha256,
      passage.pageId,
      passage.pageNumber,
      passage.sourceSentenceId,
      passage.sentenceIndex,
      passage.passageText,
      passage.textSha256,
      passage.textStart,
      passage.textEnd,
      passage.quoteOccurrence,
      passage.ocrConfidence,
      passage.sourceCollection,
      passage.sourceRelease,
      passage.sourceFamily,
      passage.provenanceStatus,
    );
    return `(${Array.from({ length: 21 }, (_, index) => `$${offset + index + 1}`).join(', ')})`;
  });

  const result = await getMaintenancePool().query(
    `
      INSERT INTO public.evidence_passages (
        citation_id,
        citation_schema,
        document_id,
        document_revision_hash,
        document_sha256,
        asset_id,
        asset_sha256,
        page_id,
        page_number,
        source_sentence_id,
        sentence_index,
        passage_text,
        text_sha256,
        text_start,
        text_end,
        quote_occurrence,
        ocr_confidence,
        source_collection,
        source_release,
        source_family,
        provenance_status
      ) VALUES ${rows.join(', ')}
      ${EVIDENCE_PASSAGE_INSERT_CONFLICT_SQL}
      RETURNING id
    `,
    values,
  );
  return result.rowCount || 0;
}

export interface BackfillSummary {
  complete: boolean;
  dryRun: boolean;
  examined: number;
  inserted: number;
  resumeAfterId: string;
  stopReason: 'corpus-exhausted' | 'limit-reached';
}

export interface BackfillDependencies {
  assertSchema: () => Promise<void>;
  loadBatch: (afterId: string, limit: number) => Promise<SourceSentenceRow[]>;
  insertBatch: (passages: PassageInsert[]) => Promise<number>;
  log: (line: string) => void;
}

const defaultDependencies: BackfillDependencies = {
  assertSchema,
  loadBatch,
  insertBatch,
  log: console.log,
};

export async function runEvidencePassageBackfill(
  options: BackfillOptions,
  dependencies: BackfillDependencies = defaultDependencies,
): Promise<BackfillSummary> {
  await dependencies.assertSchema();

  let cursor = options.afterId;
  let examined = 0;
  let inserted = 0;
  let corpusExhausted = false;

  for (;;) {
    const remaining = options.limit === null ? options.batchSize : options.limit - examined;
    if (remaining <= 0) break;
    const batchLimit = Math.min(options.batchSize, remaining);
    const rows = await dependencies.loadBatch(cursor, batchLimit);
    if (rows.length === 0) {
      corpusExhausted = true;
      break;
    }

    const passages = rows.map(toPassage);
    const batchInserted = options.dryRun ? 0 : await dependencies.insertBatch(passages);
    examined += rows.length;
    inserted += batchInserted;
    cursor = rows[rows.length - 1].sentence_id;

    dependencies.log(
      JSON.stringify({
        dryRun: options.dryRun,
        examined,
        inserted,
        lastSentenceId: cursor,
        sampleCitationId: passages[0]?.citationId || null,
      }),
    );

    if (rows.length < batchLimit) {
      corpusExhausted = true;
      break;
    }
  }

  if (!corpusExhausted && options.limit !== null && examined >= options.limit) {
    corpusExhausted = (await dependencies.loadBatch(cursor, 1)).length === 0;
  }

  const summary: BackfillSummary = {
    complete: corpusExhausted,
    dryRun: options.dryRun,
    examined,
    inserted,
    resumeAfterId: cursor,
    stopReason: corpusExhausted ? 'corpus-exhausted' : 'limit-reached',
  };
  dependencies.log(JSON.stringify(summary));
  return summary;
}

async function main(): Promise<void> {
  await runEvidencePassageBackfill(parseBackfillOptions());
}

const isDirectExecution =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  main()
    .catch((error) => {
      console.error('[evidence-passages-backfill]', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await drainPools();
    });
}
