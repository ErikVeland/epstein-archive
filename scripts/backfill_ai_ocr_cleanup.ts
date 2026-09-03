import crypto from 'node:crypto';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import { getIngestPool } from '../src/server/db/connection.js';
import { AIEnrichmentService } from '../src/server/services/AIEnrichmentService.js';
import {
  OCR_CLEAN_ARTIFACT_VERSION,
  OCR_CLEAN_PROMPT_VERSION,
  ocrCleanupInputHash,
  preserveOcrSource,
  selectOcrCleanupModels,
  splitOcrText,
  validateOcrCleanup,
  type OcrCleanupValidation,
} from './pipeline/ocrCleanup.js';
import { writeLiveStatus } from './pipeline/status.js';

interface OcrDocumentRow {
  id: number;
  file_name: string | null;
  content: string;
  legacy_required: boolean;
}

interface CachedCleanup {
  output: string;
  validation: OcrCleanupValidation;
  modelIds: string[];
  sourceDocumentId: number;
  chunkCount: number;
  preservedChunkCount: number;
}

interface CleanupResolution {
  cleanup: CachedCleanup;
  reused: boolean;
}

const BATCH_SIZE = Math.max(
  1,
  Number.parseInt(process.env.AI_OCR_CLEAN_BATCH_SIZE || '50', 10) || 50,
);
const MAX_DOCUMENTS = Math.max(
  0,
  Number.parseInt(process.env.AI_OCR_CLEAN_MAX_DOCUMENTS || '0', 10) || 0,
);
const TARGET_DOCUMENT_ID = Math.max(
  0,
  Number.parseInt(process.env.AI_OCR_CLEAN_DOCUMENT_ID || '0', 10) || 0,
);
const MAX_CACHE_ENTRIES = 128;
const DRY_RUN = process.env.AI_OCR_CLEAN_DRY_RUN === 'true';
const WRITE_LIVE_STATUS = process.env.AI_OCR_CLEAN_WRITE_LIVE_STATUS !== 'false';
const OCR_STATUS_FILE = path.resolve('pipeline_checkpoints/ocr_cleanup_status.json');
const OCR_CANDIDATE_CTE = `
  ocr_candidate_document_ids AS (
    SELECT document.id AS document_id
    FROM documents document
    WHERE document.metadata_json->>'ocr_cleanup_v2_eligible' = 'true'
       OR document.metadata_json->>'ocr_cleanup_v2_required' = 'true'
    UNION
    SELECT page.document_id
    FROM document_pages page
    WHERE page.text_source = 'ocr'
  )
`;
const ELIGIBLE_SQL = `
  document.content IS NOT NULL
  AND length(document.content) >= 100
  AND COALESCE(document.file_type, '') NOT LIKE 'image/%'
  AND NOT EXISTS (
    SELECT 1
    FROM document_ai_artifacts artifact
    WHERE artifact.document_id = document.id
      AND artifact.artifact_type = 'ocr_clean_text'
      AND artifact.artifact_version = 'ocr-clean-v2'
      AND artifact.prompt_version = 'forensic-ocr-clean-v2'
  )
  AND COALESCE(
    (document.metadata_json->'ocr_cleanup_v2'->>'failedPermanently')::boolean,
    false
  ) = false
`;

function publishOcrStatus(fields: Record<string, unknown>): void {
  const payload = {
    running: true,
    pid: process.pid,
    phase: 'AI OCR Cleanup',
    heartbeatAt: new Date().toISOString(),
    ...fields,
  };
  try {
    mkdirSync(path.dirname(OCR_STATUS_FILE), { recursive: true });
    const temporaryFile = `${OCR_STATUS_FILE}.${process.pid}.tmp`;
    writeFileSync(temporaryFile, JSON.stringify(payload, null, 2));
    renameSync(temporaryFile, OCR_STATUS_FILE);
  } catch (error) {
    console.warn('[ocr-clean-v2] could not write status file', error);
  }
  if (WRITE_LIVE_STATUS) writeLiveStatus(payload);
}

function remember(cache: Map<string, CachedCleanup>, key: string, value: CachedCleanup): void {
  cache.set(key, value);
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value as string | undefined;
    if (!oldest) break;
    cache.delete(oldest);
  }
}

async function recordFailure(documentId: number, message: string): Promise<void> {
  const pool = getIngestPool();
  await pool.query(
    `UPDATE documents
     SET metadata_json = jsonb_set(
       COALESCE(metadata_json, '{}'::jsonb),
       '{ocr_cleanup_v2}',
       COALESCE(metadata_json->'ocr_cleanup_v2', '{}'::jsonb) || jsonb_build_object(
         'status', 'failed',
         'error', $1::text,
         'attempts', COALESCE((metadata_json->'ocr_cleanup_v2'->>'attempts')::integer, 0) + 1,
         'failedPermanently', COALESCE((metadata_json->'ocr_cleanup_v2'->>'attempts')::integer, 0) + 1 >= 3,
         'lastAttemptAt', NOW()::text
       ),
       true
     )
     WHERE id = $2`,
    [message.slice(0, 1000), documentId],
  );
}

async function findReusableCleanup(
  sourceText: string,
  inputHash: string,
): Promise<CachedCleanup | null> {
  const pool = getIngestPool();
  const result = await pool.query<{
    document_id: string;
    output_text: string;
    model_id: string | null;
    provenance_json: Record<string, unknown> | null;
  }>(
    `SELECT document_id, output_text, model_id, provenance_json
     FROM document_ai_artifacts
     WHERE artifact_type = 'ocr_clean_text'
       AND artifact_version = $1
       AND prompt_version = $2
       AND provenance_json->>'inputHash' = $3
       AND output_text IS NOT NULL
     ORDER BY updated_at DESC
     LIMIT 1`,
    [OCR_CLEAN_ARTIFACT_VERSION, OCR_CLEAN_PROMPT_VERSION, inputHash],
  );
  const match = result.rows[0];
  if (!match) return null;
  const validation = validateOcrCleanup(sourceText, match.output_text);
  if (!validation.accepted) return null;
  const provenanceModelIds = match.provenance_json?.modelIds;
  const modelIds = Array.isArray(provenanceModelIds)
    ? provenanceModelIds.filter((value): value is string => typeof value === 'string')
    : (match.model_id || '').split(',').filter(Boolean);
  if (modelIds.length === 0) return null;
  return {
    output: match.output_text,
    validation,
    modelIds,
    sourceDocumentId: Number(match.document_id),
    chunkCount: splitOcrText(sourceText).length,
    preservedChunkCount:
      typeof match.provenance_json?.preservedChunkCount === 'number'
        ? match.provenance_json.preservedChunkCount
        : 0,
  };
}

async function cleanDocument(
  document: OcrDocumentRow,
  textModels: string[],
  preferredModelIndex: number,
): Promise<CachedCleanup> {
  const chunks = splitOcrText(document.content);
  const outputs: string[] = [];
  const validations: OcrCleanupValidation[] = [];
  const modelIds: string[] = [];
  let preservedChunkCount = 0;

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
    const chunk = chunks[chunkIndex];
    let acceptedOutput = '';
    let acceptedValidation: OcrCleanupValidation | null = null;
    const attempts = textModels.map(
      (_, offset) => textModels[(preferredModelIndex + offset) % textModels.length],
    );

    for (const modelId of attempts) {
      modelIds.push(modelId);
      const output = await AIEnrichmentService.cleanOcrChunkForArtifact(chunk, {
        modelId,
        documentLabel: document.file_name || 'evidence document',
      });
      const validation = validateOcrCleanup(chunk, output);
      if (validation.accepted) {
        acceptedOutput = output.trim();
        acceptedValidation = validation;
        break;
      }
    }

    if (!acceptedValidation) {
      const preserved = preserveOcrSource(chunk);
      acceptedOutput = preserved.output;
      acceptedValidation = preserved.validation;
      preservedChunkCount += 1;
    }
    outputs.push(acceptedOutput);
    validations.push(acceptedValidation);
  }

  const output = outputs.join('\n\n');
  const validation = validateOcrCleanup(document.content, output);
  if (!validation.accepted) {
    throw new Error(`assembled output failed validation: ${validation.reasons.join(', ')}`);
  }
  return {
    output,
    validation,
    modelIds: Array.from(new Set(modelIds)),
    sourceDocumentId: Number(document.id),
    chunkCount: chunks.length,
    preservedChunkCount,
  };
}

async function resolveCleanup(
  document: OcrDocumentRow,
  textModels: string[],
  preferredModelIndex: number,
  inputHash: string,
  cache: Map<string, CachedCleanup>,
  inFlight: Map<string, Promise<CleanupResolution>>,
): Promise<CleanupResolution> {
  const cached = cache.get(inputHash);
  if (cached) return { cleanup: cached, reused: true };

  const active = inFlight.get(inputHash);
  if (active) {
    const resolution = await active;
    return { cleanup: resolution.cleanup, reused: true };
  }

  const pending = (async (): Promise<CleanupResolution> => {
    const persisted = await findReusableCleanup(document.content, inputHash);
    if (persisted) return { cleanup: persisted, reused: true };
    return {
      cleanup: await cleanDocument(document, textModels, preferredModelIndex),
      reused: false,
    };
  })();
  inFlight.set(inputHash, pending);
  try {
    const resolution = await pending;
    remember(cache, inputHash, resolution.cleanup);
    return resolution;
  } finally {
    inFlight.delete(inputHash);
  }
}

async function persistCleanup(
  document: OcrDocumentRow,
  cleanup: CachedCleanup,
  inputHash: string,
  reused: boolean,
): Promise<void> {
  const outputHash = crypto.createHash('sha256').update(cleanup.output).digest('hex');
  const pool = getIngestPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO document_ai_artifacts (
         document_id, artifact_type, artifact_version, model_id, prompt_version,
         source_excerpt, output_text, confidence, review_state, provenance_json,
         created_at, updated_at
       )
       VALUES ($1, 'ocr_clean_text', $2, $3, $4, $5, $6, $7, 'pending', $8::jsonb, NOW(), NOW())
       ON CONFLICT (
         document_id, artifact_type, artifact_version,
         COALESCE(model_id, ''), COALESCE(prompt_version, '')
       )
       DO UPDATE SET
         source_excerpt = EXCLUDED.source_excerpt,
         output_text = EXCLUDED.output_text,
         confidence = EXCLUDED.confidence,
         review_state = EXCLUDED.review_state,
         provenance_json = EXCLUDED.provenance_json,
         updated_at = NOW()`,
      [
        Number(document.id),
        OCR_CLEAN_ARTIFACT_VERSION,
        cleanup.modelIds.join(','),
        OCR_CLEAN_PROMPT_VERSION,
        document.content.slice(0, 2000),
        cleanup.output,
        cleanup.validation.score,
        JSON.stringify({
          provider: 'exo_cluster',
          sourceText: 'immutable_raw_ocr',
          inputHash,
          outputHash,
          chunkCount: cleanup.chunkCount,
          preservedChunkCount: cleanup.preservedChunkCount,
          modelIds: cleanup.modelIds,
          validation: cleanup.validation,
          canonicalTextUpdated: false,
          requiresHumanReview: true,
          legacyRequeue: document.legacy_required,
          reusedIdenticalInput: reused,
          reusedFromDocumentId: reused ? cleanup.sourceDocumentId : null,
        }),
      ],
    );
    await client.query(
      `UPDATE documents
       SET metadata_json = jsonb_set(
         COALESCE(metadata_json, '{}'::jsonb) - 'ocr_cleanup_v2_required',
         '{ocr_cleanup_v2}',
         jsonb_build_object(
           'status', 'completed_pending_review',
           'artifactVersion', $1::text,
           'promptVersion', $2::text,
           'completedAt', NOW()::text,
           'failedPermanently', false
         ),
         true
       )
       WHERE id = $3`,
      [OCR_CLEAN_ARTIFACT_VERSION, OCR_CLEAN_PROMPT_VERSION, Number(document.id)],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  process.env.ENABLE_AI_ENRICHMENT = 'true';
  process.env.AI_PROVIDER = 'exo_cluster';

  const callableModels = await AIEnrichmentService.discoverCallableExoModels();
  const textModels = selectOcrCleanupModels(callableModels);
  if (textModels.length === 0) throw new Error('No callable EXO text model is available');

  const pool = getIngestPool();
  const totalResult = await pool.query<{ total: string }>(
    `WITH ${OCR_CANDIDATE_CTE}
     SELECT COUNT(*)::text AS total
     FROM ocr_candidate_document_ids candidate
     JOIN documents document ON document.id = candidate.document_id
     WHERE ${ELIGIBLE_SQL}
       AND ($1::bigint IS NULL OR document.id = $1)`,
    [TARGET_DOCUMENT_ID || null],
  );
  const total = Number.parseInt(totalResult.rows[0]?.total || '0', 10);
  const runLimit = MAX_DOCUMENTS > 0 ? Math.min(total, MAX_DOCUMENTS) : total;
  console.log(`[ocr-clean-v2] ${total.toLocaleString()} documents queued`);
  console.log(`[ocr-clean-v2] text models: ${textModels.join(' | ')}`);
  if (MAX_DOCUMENTS > 0) console.log(`[ocr-clean-v2] run limit: ${runLimit}`);
  if (DRY_RUN) {
    console.log('[ocr-clean-v2] dry run only; no artifacts were generated');
    await pool.end();
    return;
  }

  publishOcrStatus({
    ocrCleanupProcessed: 0,
    ocrCleanupTotal: runLimit,
    ocrCleanupSucceeded: 0,
    ocrCleanupFailed: 0,
    ocrCleanupReused: 0,
  });

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let reused = 0;
  let lastId = 0;
  const cache = new Map<string, CachedCleanup>();
  const inFlight = new Map<string, Promise<CleanupResolution>>();
  const keepalive = setInterval(() => {
    publishOcrStatus({
      ocrCleanupProcessed: processed,
      ocrCleanupTotal: runLimit,
      ocrCleanupSucceeded: succeeded,
      ocrCleanupFailed: failed,
    });
  }, 30_000);

  try {
    while (processed < runLimit) {
      const limit = Math.min(BATCH_SIZE, runLimit - processed);
      const result = await pool.query<OcrDocumentRow>(
        `WITH ${OCR_CANDIDATE_CTE}
         SELECT
           document.id,
           document.file_name,
           document.content,
           COALESCE((document.metadata_json->>'ocr_cleanup_v2_required')::boolean, false) AS legacy_required
         FROM ocr_candidate_document_ids candidate
         JOIN documents document ON document.id = candidate.document_id
         WHERE ${ELIGIBLE_SQL}
           AND document.id > $1
           AND ($3::bigint IS NULL OR document.id = $3)
         ORDER BY document.id
         LIMIT $2`,
        [lastId, limit, TARGET_DOCUMENT_ID || null],
      );
      if (result.rows.length === 0) break;
      lastId = Number(result.rows[result.rows.length - 1].id);

      for (let offset = 0; offset < result.rows.length; offset += textModels.length) {
        const group = result.rows.slice(offset, offset + textModels.length);
        await Promise.all(
          group.map(async (document, groupIndex) => {
            const inputHash = ocrCleanupInputHash(document.content);
            try {
              const resolution = await resolveCleanup(
                document,
                textModels,
                groupIndex,
                inputHash,
                cache,
                inFlight,
              );
              if (resolution.reused) reused += 1;
              await persistCleanup(document, resolution.cleanup, inputHash, resolution.reused);
              succeeded += 1;
            } catch (error) {
              failed += 1;
              await recordFailure(
                Number(document.id),
                error instanceof Error ? error.message : String(error),
              );
            } finally {
              processed += 1;
              publishOcrStatus({
                currentFile: document.file_name,
                ocrCleanupProcessed: processed,
                ocrCleanupTotal: runLimit,
                ocrCleanupSucceeded: succeeded,
                ocrCleanupFailed: failed,
                ocrCleanupReused: reused,
              });
            }
          }),
        );
      }
    }
  } finally {
    clearInterval(keepalive);
    await pool.end();
  }

  publishOcrStatus({
    running: false,
    currentFile: null,
    ocrCleanupProcessed: processed,
    ocrCleanupTotal: runLimit,
    ocrCleanupSucceeded: succeeded,
    ocrCleanupFailed: failed,
    ocrCleanupReused: reused,
    completedAt: new Date().toISOString(),
  });
  console.log('[ocr-clean-v2] complete', { processed, succeeded, failed, reused });
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  publishOcrStatus({ running: false, fatal: true, error: message });
  console.error('[ocr-clean-v2] fatal', message);
  process.exit(1);
});
