import crypto from 'crypto';
import { getApiPool } from '../db/connection.js';

type Queryable = {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: Record<string, unknown>[]; rowCount?: number | null }>;
};

export type ProvenanceStatus = 'missing' | 'shallow' | 'substantial' | 'verified';

export interface ProvenanceEventInput {
  documentId: number;
  runId?: number | null;
  eventType: string;
  eventOrder?: number;
  actorType?: string;
  actorId?: string | null;
  toolName?: string | null;
  toolVersion?: string | null;
  inputAssetId?: number | null;
  outputAssetId?: number | null;
  inputDocumentId?: number | null;
  parentDocumentId?: number | null;
  sourceCollection?: string | null;
  sourcePath?: string | null;
  sourceUrl?: string | null;
  fileSha256?: string | null;
  textSha256?: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt?: string | Date | null;
  eventKey?: string;
}

export interface ProvenanceSummaryPatch {
  normalizedTextSha256?: string | null;
  sourcePath?: string | null;
  sourceUrl?: string | null;
  sourceSystem?: string | null;
  sourceRelease?: string | null;
  sourceAcquisitionMethod?: string | null;
  sourceAcquiredAt?: string | Date | null;
}

type ProvenanceSignals = {
  hasFileHash: boolean;
  hasTextHash: boolean;
  hasSourceIdentity: boolean;
  hasSourceLocator: boolean;
  hasRun: boolean;
  hasEvents: boolean;
  hasTransformChain: boolean;
  hasParentLinkage: boolean;
};

function stableSortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableSortValue);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, stableSortValue(entry)]),
    );
  }
  if (value instanceof Date) return value.toISOString();
  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(stableSortValue(value));
}

export function computeSha256Hex(input: string | Buffer): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function inferSourceSystem(input: {
  sourceCollection?: string | null;
  sourcePath?: string | null;
  sourceUrl?: string | null;
}): string {
  const haystack = [input.sourceCollection, input.sourcePath, input.sourceUrl]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (haystack.includes('justice.gov') || haystack.includes('doj')) return 'doj_release';
  if (haystack.includes('court')) return 'court_record';
  if (haystack.includes('email')) return 'email_import';
  if (haystack.includes('archive')) return 'archive_import';
  if (haystack.includes('/data/') || haystack.includes('data/')) return 'filesystem_ingest';
  return 'unknown';
}

function computeProvenanceStatus(signals: ProvenanceSignals): {
  status: ProvenanceStatus;
  score: number;
} {
  let score = 0;
  if (signals.hasFileHash) score += 25;
  if (signals.hasTextHash) score += 20;
  if (signals.hasSourceIdentity) score += 20;
  if (signals.hasSourceLocator) score += 10;
  if (signals.hasRun) score += 10;
  if (signals.hasEvents) score += 5;
  if (signals.hasTransformChain) score += 5;
  if (signals.hasParentLinkage) score += 5;

  const status: ProvenanceStatus =
    score >= 85 ? 'verified' : score >= 60 ? 'substantial' : score > 0 ? 'shallow' : 'missing';
  return { status, score };
}

function buildEventKey(input: ProvenanceEventInput): string {
  return computeSha256Hex(
    stableStringify({
      documentId: input.documentId,
      runId: input.runId ?? null,
      eventType: input.eventType,
      eventOrder: input.eventOrder ?? 0,
      inputAssetId: input.inputAssetId ?? null,
      outputAssetId: input.outputAssetId ?? null,
      inputDocumentId: input.inputDocumentId ?? null,
      parentDocumentId: input.parentDocumentId ?? null,
      sourceCollection: input.sourceCollection ?? null,
      sourcePath: input.sourcePath ?? null,
      sourceUrl: input.sourceUrl ?? null,
      fileSha256: input.fileSha256 ?? null,
      textSha256: input.textSha256 ?? null,
      metadata: input.metadata ?? null,
    }),
  );
}

async function getDocumentSignals(
  executor: Queryable,
  documentId: number,
): Promise<ProvenanceSignals> {
  const { rows } = await executor.query(
    `
      SELECT
        d.content_sha256,
        d.content_hash,
        d.normalized_text_sha256,
        d.source_collection,
        d.source_system,
        d.source_release,
        d.source_path,
        d.source_url,
        d.source_original_url,
        d.ingestion_run_id,
        d.parent_document_id,
        COUNT(dpe.id)::int AS event_count,
        COUNT(*) FILTER (
          WHERE dpe.file_sha256 IS NOT NULL OR dpe.text_sha256 IS NOT NULL
        )::int AS hash_event_count,
        COUNT(*) FILTER (
          WHERE dpe.input_asset_id IS NOT NULL OR dpe.output_asset_id IS NOT NULL
        )::int AS transform_event_count,
        COUNT(*) FILTER (
          WHERE dpe.parent_document_id IS NOT NULL OR dpe.input_document_id IS NOT NULL
        )::int AS parent_event_count
      FROM documents d
      LEFT JOIN document_provenance_events dpe ON dpe.document_id = d.id
      WHERE d.id = $1
      GROUP BY d.id
    `,
    [documentId],
  );

  const row = rows[0] ?? {};
  const sourceIdentityPresent = !!(
    row.source_collection ||
    row.source_system ||
    row.source_release
  );
  const sourceLocatorPresent = !!(row.source_path || row.source_url || row.source_original_url);

  return {
    hasFileHash: !!(row.content_sha256 || row.content_hash),
    hasTextHash: !!row.normalized_text_sha256,
    hasSourceIdentity: sourceIdentityPresent,
    hasSourceLocator: sourceLocatorPresent,
    hasRun: !!row.ingestion_run_id,
    hasEvents: Number(row.event_count || 0) > 0,
    hasTransformChain:
      Number(row.transform_event_count || 0) > 0 || Number(row.hash_event_count || 0) > 1,
    hasParentLinkage: !!row.parent_document_id || Number(row.parent_event_count || 0) > 0,
  };
}

export const documentProvenanceService = {
  async upsertEvent(input: ProvenanceEventInput, executor: Queryable = getApiPool()) {
    const eventKey = input.eventKey || buildEventKey(input);
    const metadataJson = JSON.stringify(input.metadata || {});
    const occurredAt =
      input.occurredAt instanceof Date
        ? input.occurredAt.toISOString()
        : input.occurredAt || new Date().toISOString();

    await executor.query(
      `
        INSERT INTO document_provenance_events (
          event_key, document_id, run_id, event_type, event_order,
          actor_type, actor_id, tool_name, tool_version,
          input_asset_id, output_asset_id, input_document_id, parent_document_id,
          source_collection, source_path, source_url,
          file_sha256, text_sha256, metadata_json, occurred_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, $13,
          $14, $15, $16,
          $17, $18, $19::jsonb, $20
        )
        ON CONFLICT (event_key) DO UPDATE SET
          run_id = COALESCE(document_provenance_events.run_id, EXCLUDED.run_id),
          actor_type = COALESCE(document_provenance_events.actor_type, EXCLUDED.actor_type),
          actor_id = COALESCE(document_provenance_events.actor_id, EXCLUDED.actor_id),
          tool_name = COALESCE(document_provenance_events.tool_name, EXCLUDED.tool_name),
          tool_version = COALESCE(document_provenance_events.tool_version, EXCLUDED.tool_version),
          input_asset_id = COALESCE(document_provenance_events.input_asset_id, EXCLUDED.input_asset_id),
          output_asset_id = COALESCE(document_provenance_events.output_asset_id, EXCLUDED.output_asset_id),
          input_document_id = COALESCE(document_provenance_events.input_document_id, EXCLUDED.input_document_id),
          parent_document_id = COALESCE(document_provenance_events.parent_document_id, EXCLUDED.parent_document_id),
          source_collection = COALESCE(document_provenance_events.source_collection, EXCLUDED.source_collection),
          source_path = COALESCE(document_provenance_events.source_path, EXCLUDED.source_path),
          source_url = COALESCE(document_provenance_events.source_url, EXCLUDED.source_url),
          file_sha256 = COALESCE(document_provenance_events.file_sha256, EXCLUDED.file_sha256),
          text_sha256 = COALESCE(document_provenance_events.text_sha256, EXCLUDED.text_sha256),
          metadata_json = COALESCE(document_provenance_events.metadata_json, '{}'::jsonb) || EXCLUDED.metadata_json
      `,
      [
        eventKey,
        input.documentId,
        input.runId || null,
        input.eventType,
        input.eventOrder ?? 0,
        input.actorType || 'system',
        input.actorId || null,
        input.toolName || null,
        input.toolVersion || null,
        input.inputAssetId || null,
        input.outputAssetId || null,
        input.inputDocumentId || null,
        input.parentDocumentId || null,
        input.sourceCollection || null,
        input.sourcePath || null,
        input.sourceUrl || null,
        input.fileSha256 || null,
        input.textSha256 || null,
        metadataJson,
        occurredAt,
      ],
    );
  },

  async refreshDocumentSummary(
    documentId: number,
    patch: ProvenanceSummaryPatch = {},
    executor: Queryable = getApiPool(),
  ): Promise<{ status: ProvenanceStatus; score: number }> {
    const sourceSystem =
      patch.sourceSystem ||
      inferSourceSystem({
        sourceCollection: patch.sourceRelease || null,
        sourcePath: patch.sourcePath || null,
        sourceUrl: patch.sourceUrl || null,
      });

    await executor.query(
      `
        UPDATE documents
        SET
          normalized_text_sha256 = COALESCE(normalized_text_sha256, $2),
          source_path = COALESCE(source_path, $3),
          source_url = COALESCE(source_url, $4),
          source_system = COALESCE(source_system, $5),
          source_release = COALESCE(source_release, $6),
          source_acquisition_method = COALESCE(source_acquisition_method, $7),
          source_acquired_at = COALESCE(source_acquired_at, $8)
        WHERE id = $1
      `,
      [
        documentId,
        patch.normalizedTextSha256 || null,
        patch.sourcePath || null,
        patch.sourceUrl || null,
        sourceSystem || null,
        patch.sourceRelease || null,
        patch.sourceAcquisitionMethod || null,
        patch.sourceAcquiredAt instanceof Date
          ? patch.sourceAcquiredAt.toISOString()
          : patch.sourceAcquiredAt || null,
      ],
    );

    const signals = await getDocumentSignals(executor, documentId);
    const { status, score } = computeProvenanceStatus(signals);

    await executor.query(
      `UPDATE documents SET provenance_status = $2, provenance_score = $3 WHERE id = $1`,
      [documentId, status, score],
    );

    return { status, score };
  },
};
