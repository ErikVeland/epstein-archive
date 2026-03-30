import { Client } from 'pg';
import {
  computeSha256Hex,
  documentProvenanceService,
  inferSourceSystem,
} from '../src/server/services/documentProvenanceService.js';

type Row = {
  id: number;
  file_path: string | null;
  source_collection: string | null;
  source_original_url: string | null;
  source_url: string | null;
  content_sha256: string | null;
  content_hash: string | null;
  normalized_text_sha256: string | null;
  ingestion_run_id: number | string | null;
  pipeline_version: string | null;
  hash_algo: string | null;
  parent_document_id: number | null;
  metadata_json: Record<string, unknown> | null;
  content: string | null;
  content_refined: string | null;
  primary_asset_id: number | null;
  primary_asset_sha256: string | null;
};

const BATCH_SIZE = Number(process.env.PROVENANCE_BACKFILL_BATCH || 200);
const MAX_ROWS = Number(process.env.PROVENANCE_BACKFILL_MAX || 0);
const TOOL_VERSION = '1.0.0';

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

async function getTableColumns(client: Client, tableName: string): Promise<Set<string>> {
  const { rows } = await client.query<{ column_name: string }>(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
    `,
    [tableName],
  );

  return new Set(rows.map((row) => row.column_name));
}

async function tableExists(client: Client, tableName: string): Promise<boolean> {
  const { rows } = await client.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      ) AS exists
    `,
    [tableName],
  );

  return Boolean(rows[0]?.exists);
}

function hasColumn(columns: Set<string>, columnName: string): boolean {
  return columns.has(columnName);
}

function toNullableNumericId(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.trunc(value) : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || !/^-?\d+$/.test(trimmed)) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }
  return null;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');

  const client = new Client({
    connectionString,
    application_name: 'document-provenance-backfill',
  });
  await client.connect();

  let lastId = 0;
  let processed = 0;
  let updated = 0;

  try {
    const documentColumns = await getTableColumns(client, 'documents');
    const hasProvenanceEvents = await tableExists(client, 'document_provenance_events');
    const hasDocumentAssets = await tableExists(client, 'document_assets');
    const hasFileAssets = await tableExists(client, 'file_assets');

    const requiredColumns = [
      'provenance_status',
      'provenance_score',
      'source_system',
      'source_acquisition_method',
      'normalized_text_sha256',
      'parent_document_id',
    ];
    const missingRequiredColumns = requiredColumns.filter(
      (columnName) => !hasColumn(documentColumns, columnName),
    );

    if (missingRequiredColumns.length > 0 || !hasProvenanceEvents) {
      const missing = [
        ...missingRequiredColumns.map((columnName) => `documents.${columnName}`),
        ...(hasProvenanceEvents ? [] : ['document_provenance_events table']),
      ];
      throw new Error(
        `Provenance schema is incomplete (${missing.join(', ')}). Run "pnpm db:migrate:pg" first, then rerun this backfill.`,
      );
    }

    const selectSourceOriginalUrl = hasColumn(documentColumns, 'source_original_url')
      ? 'd.source_original_url'
      : 'NULL::text AS source_original_url';
    const selectSourceUrl = hasColumn(documentColumns, 'source_url')
      ? 'd.source_url'
      : 'NULL::text AS source_url';
    const selectContentSha256 = hasColumn(documentColumns, 'content_sha256')
      ? 'd.content_sha256'
      : 'NULL::text AS content_sha256';
    const selectPipelineVersion = hasColumn(documentColumns, 'pipeline_version')
      ? 'd.pipeline_version'
      : 'NULL::text AS pipeline_version';
    const selectHashAlgo = hasColumn(documentColumns, 'hash_algo')
      ? 'd.hash_algo'
      : 'NULL::text AS hash_algo';
    const selectContentRefined = hasColumn(documentColumns, 'content_refined')
      ? 'd.content_refined'
      : 'NULL::text AS content_refined';
    const joinDocumentAssets =
      hasDocumentAssets && hasFileAssets
        ? `
          LEFT JOIN LATERAL (
            SELECT asset_id
            FROM document_assets
            WHERE document_id = d.id
            ORDER BY CASE WHEN role = 'primary' THEN 0 ELSE 1 END, asset_id ASC
            LIMIT 1
          ) da ON TRUE
          LEFT JOIN file_assets fa ON fa.id = da.asset_id
        `
        : `
          LEFT JOIN LATERAL (
            SELECT NULL::bigint AS asset_id
          ) da ON TRUE
          LEFT JOIN LATERAL (
            SELECT NULL::text AS sha256
          ) fa ON TRUE
        `;

    while (MAX_ROWS <= 0 || processed < MAX_ROWS) {
      const remaining = MAX_ROWS > 0 ? MAX_ROWS - processed : BATCH_SIZE;
      const limit = Math.min(BATCH_SIZE, remaining);
      const { rows } = await client.query<Row>(
        `
          SELECT
            d.id,
            d.file_path,
            d.source_collection,
            ${selectSourceOriginalUrl},
            ${selectSourceUrl},
            ${selectContentSha256},
            d.content_hash,
            d.normalized_text_sha256,
            d.ingestion_run_id,
            ${selectPipelineVersion},
            ${selectHashAlgo},
            d.parent_document_id,
            d.metadata_json,
            d.content,
            ${selectContentRefined},
            da.asset_id AS primary_asset_id,
            fa.sha256 AS primary_asset_sha256
          FROM documents d
          ${joinDocumentAssets}
          WHERE d.id > $1
            AND (
              COALESCE(d.provenance_status, 'missing') = 'missing'
              OR COALESCE(d.provenance_score, 0) < 60
              OR d.normalized_text_sha256 IS NULL
              OR d.source_system IS NULL
              OR d.source_acquisition_method IS NULL
              OR NOT EXISTS (
                SELECT 1
                FROM document_provenance_events dpe
                WHERE dpe.document_id = d.id
              )
            )
          ORDER BY d.id ASC
          LIMIT $2
        `,
        [lastId, limit],
      );

      if (rows.length === 0) break;

      for (const row of rows) {
        processed += 1;
        lastId = row.id;
        const meta = asObject(row.metadata_json);
        const runId = toNullableNumericId(row.ingestion_run_id);

        const sourceUrl =
          row.source_url ||
          row.source_original_url ||
          (typeof meta.source_url === 'string' ? meta.source_url : null) ||
          (typeof meta.source_original_url === 'string' ? meta.source_original_url : null);
        const sourcePath =
          row.file_path || (typeof meta.file_path === 'string' ? meta.file_path : null) || null;
        const sourceRelease =
          row.source_collection ||
          (typeof meta.source_collection === 'string' ? meta.source_collection : null) ||
          null;
        const sourceAcquisitionMethod = row.parent_document_id
          ? 'derived_from_parent_document'
          : sourceUrl
            ? 'imported_source_url'
            : 'filesystem_ingest';
        const sourceSystem = inferSourceSystem({
          sourceCollection: sourceRelease,
          sourcePath,
          sourceUrl,
        });

        const textSource =
          (row.content_refined && row.content_refined.trim()) ||
          (row.content && row.content.trim()) ||
          '';
        const normalizedTextSha256 =
          row.normalized_text_sha256 || (textSource ? computeSha256Hex(textSource) : null);
        const fileSha256 =
          row.content_sha256 || row.primary_asset_sha256 || row.content_hash || null;

        await documentProvenanceService.upsertEvent(
          {
            documentId: row.id,
            runId,
            eventType: 'backfill_discovered',
            actorType: 'system',
            toolName: 'backfill_document_provenance',
            toolVersion: TOOL_VERSION,
            sourceCollection: sourceRelease,
            sourcePath,
            sourceUrl,
            fileSha256,
            metadata: {
              hashAlgo: row.hash_algo || 'sha256',
              pipelineVersion: row.pipeline_version,
              backfilled: true,
            },
          },
          client,
        );

        if (row.primary_asset_id) {
          await documentProvenanceService.upsertEvent(
            {
              documentId: row.id,
              runId,
              eventType: 'backfill_asset_linked',
              eventOrder: 1,
              actorType: 'system',
              toolName: 'backfill_document_provenance',
              toolVersion: TOOL_VERSION,
              outputAssetId: row.primary_asset_id,
              sourceCollection: sourceRelease,
              sourcePath,
              sourceUrl,
              fileSha256,
              metadata: {
                backfilled: true,
              },
            },
            client,
          );
        }

        if (normalizedTextSha256) {
          await documentProvenanceService.upsertEvent(
            {
              documentId: row.id,
              runId,
              eventType: 'backfill_content_fingerprinted',
              eventOrder: 2,
              actorType: 'system',
              toolName: 'backfill_document_provenance',
              toolVersion: TOOL_VERSION,
              outputAssetId: row.primary_asset_id,
              sourceCollection: sourceRelease,
              sourcePath,
              sourceUrl,
              fileSha256,
              textSha256: normalizedTextSha256,
              metadata: {
                textSource: row.content_refined
                  ? 'content_refined'
                  : row.content
                    ? 'content'
                    : 'none',
                backfilled: true,
              },
            },
            client,
          );
        }

        if (row.parent_document_id) {
          await documentProvenanceService.upsertEvent(
            {
              documentId: row.id,
              runId,
              eventType: 'backfill_parent_linked',
              eventOrder: 3,
              actorType: 'system',
              toolName: 'backfill_document_provenance',
              toolVersion: TOOL_VERSION,
              inputDocumentId: row.parent_document_id,
              parentDocumentId: row.parent_document_id,
              sourceCollection: sourceRelease,
              sourcePath,
              sourceUrl,
              fileSha256,
              textSha256: normalizedTextSha256,
              metadata: {
                backfilled: true,
              },
            },
            client,
          );
        }

        if (sourceUrl) {
          await documentProvenanceService.upsertEvent(
            {
              documentId: row.id,
              runId,
              eventType: 'backfill_source_linked',
              eventOrder: 4,
              actorType: 'system',
              toolName: 'backfill_document_provenance',
              toolVersion: TOOL_VERSION,
              sourceCollection: sourceRelease,
              sourcePath,
              sourceUrl,
              fileSha256,
              metadata: {
                backfilled: true,
              },
            },
            client,
          );
        }

        await documentProvenanceService.refreshDocumentSummary(
          row.id,
          {
            normalizedTextSha256,
            sourceCollection: sourceRelease,
            sourcePath,
            sourceUrl,
            sourceSystem,
            sourceRelease,
            sourceAcquisitionMethod,
          },
          client,
        );

        updated += 1;
      }

      console.log(
        `[document-provenance-backfill] progress processed=${processed} updated=${updated} lastId=${lastId}`,
      );

      if (rows.length < limit) break;
    }

    console.log(
      '[document-provenance-backfill] done',
      JSON.stringify({ processed, updated, lastId }),
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[document-provenance-backfill] fatal', error);
  process.exit(1);
});
