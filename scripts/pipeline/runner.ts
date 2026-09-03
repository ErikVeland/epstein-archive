// ============================================================================
// RUNNER — subprocess execution and phase orchestration
// ============================================================================

import { existsSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import crypto from 'crypto';
import {
  AIEnrichmentService,
  ExoModelUnavailableError,
} from '../../src/server/services/AIEnrichmentService.js';
import { getIngestPool } from '../../src/server/db/connection.js';
import { withTimeoutReject } from '../../src/server/utils/asyncTimeout.js';
import { PipelineService, type PipelineRun } from '../../src/server/services/pipelineService.js';
import { BATCH_SIZE, DOC_PROCESSING_TIMEOUT_MS } from './config.js';
import {
  pipelineRuntime,
  isShuttingDown,
  setShuttingDown,
  PipelineBlockedError,
  writeLiveStatus,
  updateHeartbeat,
  markProgress,
  sleep,
} from './status.js';
import { stageByName, type UnifiedStage } from './stages.js';
import { ensureServiceHealthyOrRecover } from './recovery.js';
import { deriveDocumentTitle, isFallbackDocumentTitle } from '../../src/shared/documentTitle.js';
import {
  resolveSummaryConcurrency,
  resolveSummaryFetchBatchSize,
  selectSummaryModels,
} from './enrichmentScheduling.js';

/**
 * Run a subprocess and stream its output. A heartbeat keepalive timer fires
 * every 30s so the watchdog does not falsely detect a stall.
 */
export function runScript(scriptPath: string, args: string[] = []): Promise<number> {
  return new Promise((resolve, reject) => {
    const tsxBin = join(process.cwd(), 'node_modules', '.bin', 'tsx');
    console.log(`\n📜 Running: ${tsxBin} ${scriptPath} ${args.join(' ')}`);
    const child = spawn(tsxBin, [scriptPath, ...args], {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: process.env,
    });

    // Periodic heartbeat while subprocess is active to prevent watchdog timeouts
    const keepAliveTimer = setInterval(() => {
      updateHeartbeat();
    }, 30_000);

    const cleanup = () => {
      clearInterval(keepAliveTimer);
    };

    child.on('close', (code: number | null) => {
      cleanup();
      resolve(code ?? 1);
    });

    child.on('error', (err: Error) => {
      cleanup();
      reject(err);
    });
  });
}

async function withPipelineHeartbeat<T>(
  operation: Promise<T>,
  fields: Record<string, unknown>,
): Promise<T> {
  const timer = setInterval(() => updateHeartbeat(fields), 30_000);
  try {
    return await operation;
  } finally {
    clearInterval(timer);
  }
}

export async function checkPipelineControlSignal(
  currentPipelineRun: PipelineRun | null,
): Promise<void> {
  if (!currentPipelineRun) return;

  const state = await PipelineService.getRunStatus(currentPipelineRun.id);
  if (state.control_signal === 'stop') {
    setShuttingDown(true);
    await PipelineService.updateRunStatus(
      currentPipelineRun.id,
      'cancelled',
      'Stopped by control signal',
    );
    await PipelineService.setControlSignal(currentPipelineRun.id, null);
    return;
  }

  if (state.control_signal === 'pause') {
    updateHeartbeat({ phase: 'Paused', pausedAt: new Date().toISOString() });
    await PipelineService.updateRunStatus(currentPipelineRun.id, 'paused');
    while (!isShuttingDown()) {
      await sleep(2000);
      const next = await PipelineService.getRunStatus(currentPipelineRun.id);
      if (next.control_signal === 'stop') {
        setShuttingDown(true);
        await PipelineService.updateRunStatus(
          currentPipelineRun.id,
          'cancelled',
          'Stopped while paused',
        );
        await PipelineService.setControlSignal(currentPipelineRun.id, null);
        return;
      }
      if (next.control_signal === 'resume') {
        await PipelineService.updateRunStatus(currentPipelineRun.id, 'running');
        await PipelineService.setControlSignal(currentPipelineRun.id, null);
        updateHeartbeat({ phase: 'Resuming', resumedAt: new Date().toISOString() });
        return;
      }
    }
  }
}

export async function runRegisteredScriptStage(
  stage: UnifiedStage,
  currentPipelineRun: PipelineRun | null,
): Promise<number> {
  if (!stage.script) throw new Error(`Stage ${stage.name} has no script`);
  await checkPipelineControlSignal(currentPipelineRun);
  if (isShuttingDown()) return 0;

  if (!existsSync(stage.script)) {
    throw new Error(`Unified stage script is missing: ${stage.script}`);
  }

  const stageRun = await PipelineService.startStageRun({
    runId: currentPipelineRun?.id,
    stageName: stage.name,
    stageVersion: stage.version,
    modelId: stage.requiresAi ? process.env.EXO_MODEL || process.env.AI_PROVIDER || 'auto' : null,
    metrics: { script: stage.script, args: stage.args || [] },
  });

  updateHeartbeat({
    phase: stage.phase,
    activeStage: stage.name,
    activeStageVersion: stage.version,
    activeStageDescription: stage.description,
  });

  const startedAt = Date.now();
  const exitCode = await runScript(stage.script, stage.args || []);
  await PipelineService.finishStageRun(stageRun?.id, {
    status: exitCode === 0 ? 'succeeded' : 'failed',
    errorMessage: exitCode === 0 ? null : `${stage.script} exited with ${exitCode}`,
    metrics: { durationMs: Date.now() - startedAt, exitCode },
  });

  updateHeartbeat({
    phase: stage.phase,
    activeStage: stage.name,
    activeStageExitCode: exitCode,
  });

  return exitCode;
}

/**
 * Phase 1: INGEST — Process raw files from source directory
 */
export async function runIngestPhase(
  sourceDir: string,
  currentPipelineRun: PipelineRun | null,
): Promise<{ filesProcessed: number; errors: number }> {
  console.log('\n' + '='.repeat(70));
  console.log('📥 PHASE 1: INGEST (OCR, Extraction, Parsing)');
  console.log('='.repeat(70));
  console.log(`   Source: ${sourceDir}`);

  await checkPipelineControlSignal(currentPipelineRun);
  if (isShuttingDown()) return { filesProcessed: 0, errors: 0 };

  if (!existsSync(sourceDir)) {
    console.log(`   ⚠️  Source directory not found: ${sourceDir}`);
    return { filesProcessed: 0, errors: 0 };
  }

  const stage = stageByName('ingest');
  const stageRun = await PipelineService.startStageRun({
    runId: currentPipelineRun?.id,
    stageName: stage.name,
    stageVersion: stage.version,
    metrics: { sourceDir },
  });
  const startedAt = Date.now();
  const exitCode = await runScript('scripts/ingest_pipeline.ts');
  await PipelineService.finishStageRun(stageRun?.id, {
    status: exitCode === 0 ? 'succeeded' : 'failed',
    errorMessage: exitCode === 0 ? null : `ingest_pipeline exited with ${exitCode}`,
    metrics: { durationMs: Date.now() - startedAt, sourceDir },
  });

  return {
    filesProcessed: exitCode === 0 ? 1 : 0,
    errors: exitCode !== 0 ? 1 : 0,
  };
}

/**
 * Phase 2: INTEL — Entity extraction and relationship mapping
 */
export async function runIntelPhase(
  currentPipelineRun: PipelineRun | null,
): Promise<{ entitiesExtracted: number; relationsFound: number }> {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 PHASE 2: INTELLIGENCE (Entity Extraction, Relations)');
  console.log('='.repeat(70));

  await checkPipelineControlSignal(currentPipelineRun);
  if (isShuttingDown()) return { entitiesExtracted: 0, relationsFound: 0 };

  const stage = stageByName('entity-intelligence');
  const stageRun = await PipelineService.startStageRun({
    runId: currentPipelineRun?.id,
    stageName: stage.name,
    stageVersion: stage.version,
  });
  const startedAt = Date.now();
  const exitCode = await runScript('scripts/ingest_intelligence.ts');
  await PipelineService.finishStageRun(stageRun?.id, {
    status: exitCode === 0 ? 'succeeded' : 'failed',
    errorMessage: exitCode === 0 ? null : `ingest_intelligence exited with ${exitCode}`,
    metrics: { durationMs: Date.now() - startedAt },
  });

  return {
    entitiesExtracted: exitCode === 0 ? 1 : 0,
    relationsFound: 0,
  };
}

/**
 * Phase 3: ENRICH — AI-powered enrichment for all documents
 */
export async function runEnrichPhase(
  mode: 'new' | 'backfill' | 'all',
  currentPipelineRun: PipelineRun | null,
): Promise<{ documentsEnriched: number; summariesGenerated: number }> {
  console.log('\n' + '='.repeat(70));
  console.log('🤖 PHASE 3: AI ENRICHMENT (Summaries, Classification)');
  console.log('='.repeat(70));
  console.log(`   Provider: ${process.env.AI_PROVIDER}`);
  console.log(`   Mode: ${mode}`);

  let modelPool = (process.env.EXO_MODEL_POOL || process.env.EXO_MODEL || '')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);

  if ((process.env.AI_PROVIDER || 'local_ollama') === 'exo_cluster') {
    modelPool = await AIEnrichmentService.discoverCallableExoModels(modelPool);
    await ensureServiceHealthyOrRecover(
      'exo',
      'Exo health check failed before enrichment',
      'Exo stayed unhealthy after automatic recovery. Backfill cycle aborted.',
    );
  }
  const defaultModel = modelPool[0] || process.env.AI_PROVIDER || 'auto';
  const summaryModels = selectSummaryModels(modelPool);
  const qualityModel =
    summaryModels.find((model) => model.toLowerCase().includes('qwen3.5-9b')) ||
    summaryModels[0] ||
    defaultModel;
  const summaryConcurrency = resolveSummaryConcurrency(
    summaryModels,
    process.env.AI_SUMMARY_CONCURRENCY,
  );
  const fetchBatchSize = resolveSummaryFetchBatchSize(BATCH_SIZE, summaryConcurrency);
  let routingIndex = 0;
  const modelUsage: Record<string, number> = {};
  console.log(`   Callable model pool: ${modelPool.join(' | ') || defaultModel}`);
  console.log(`   Text summary models: ${summaryModels.join(' | ') || defaultModel}`);
  console.log(`   Summary concurrency: ${summaryConcurrency}`);

  const pool = getIngestPool();
  const stage = stageByName('ai-enrichment');
  const aggregateStageRun = await PipelineService.startStageRun({
    runId: currentPipelineRun?.id,
    stageName: stage.name,
    stageVersion: stage.version,
    modelId: summaryModels.join(',') || defaultModel,
    metrics: { mode, modelPool, summaryModels, summaryConcurrency, fetchBatchSize },
  });

  let whereClause =
    "content IS NOT NULL AND length(content) > 50 AND COALESCE(file_type, '') NOT LIKE 'image/%' AND (metadata_json IS NULL OR NOT metadata_json ? 'ai_enrichment_failed')";
  const summaryArtifactPredicate =
    "NOT COALESCE(metadata_json ? 'ai_summary', false) AND NOT EXISTS (SELECT 1 FROM document_ai_artifacts daa WHERE daa.document_id = documents.id AND daa.artifact_type = 'summary' AND daa.artifact_version = 'summary-v2' AND daa.prompt_version = 'forensic-summary-v1')";
  if (mode === 'backfill') {
    // Backfill summaries only. OCR cleanup has its own ingest/queue stage; mixing the two here
    // caused documents with an existing summary but no useful OCR-clean output to be selected
    // forever and their summary to be regenerated thousands of times.
    whereClause += ` AND ${summaryArtifactPredicate}`;
  } else if (mode === 'new') {
    whereClause += " AND created_at > now() - interval '1 day'";
  }
  // Get enrichable total once at start for progress tracking
  const enrichTotalRow = (
    await pool.query(`SELECT COUNT(*) AS total FROM documents WHERE ${whereClause}`)
  ).rows[0];
  const enrichTotal = Number(enrichTotalRow?.total || 0);

  let documentsEnriched = 0;
  let summariesGenerated = 0;
  const startTime = Date.now();

  // Record when this enrichment run began so the widget can compute throughput/ETA
  updateHeartbeat({
    phase: 'Enrichment',
    enrichStartedAt: new Date().toISOString(),
    enrichProcessed: 0,
    enrichTotal,
    currentFile: null,
    currentDocId: null,
    currentDocStartedAt: null,
    lastError: null,
    exitReason: null,
    exitCode: null,
  });

  if (enrichTotal === 0) {
    console.log('   ✅ All eligible text documents already have summary artifacts.');
    await PipelineService.finishStageRun(aggregateStageRun?.id, {
      status: 'succeeded',
      metrics: {
        documentsEnriched: 0,
        summariesGenerated: 0,
        mode,
        modelPool,
        summaryModels,
        summaryConcurrency,
        fetchBatchSize,
        modelUsage,
      },
    });
    return { documentsEnriched: 0, summariesGenerated: 0 };
  }

  let lastScannedId = 0;

  while (!isShuttingDown()) {
    // Scan by primary key. Re-sorting the full pending queue for each small batch
    // dominated total runtime once the archive passed one million documents.
    const docs = (
      await pool.query(
        `
      SELECT id, LEFT(content, 4000) AS content, metadata_json, file_name, title, red_flag_rating
      FROM documents
      WHERE ${whereClause}
        AND id > $2
      ORDER BY id ASC
      LIMIT $1
    `,
        [fetchBatchSize, lastScannedId],
      )
    ).rows as {
      id: number;
      content: string | null;
      metadata_json: Record<string, unknown> | null;
      file_name: string | null;
      title: string | null;
      red_flag_rating: number | null;
    }[];

    if (docs.length === 0) break;
    lastScannedId = Number(docs[docs.length - 1].id);

    // Write progress to live_status.json once per batch so the widget stays current
    updateHeartbeat({
      phase: 'Enrichment',
      enrichProcessed: documentsEnriched,
      enrichTotal,
      currentFile: docs[0]?.file_name ?? null,
      currentDocId: docs[0]?.id ?? null,
      exoModelPool: modelPool,
      modelUsage,
    });

    // Use each callable text-model instance concurrently. Vision instances stay
    // reserved for verified photographs and never receive summary work.
    for (let offset = 0; offset < docs.length; offset += summaryConcurrency) {
      const chunk = docs.slice(offset, offset + summaryConcurrency);
      const results = await Promise.allSettled(
        chunk.map(async (doc) => {
          if (isShuttingDown()) return;
          let documentStageRun: { id: number } | null = null;
          try {
            // High-risk evidence gets the strongest model. Routine documents are
            // deterministically balanced across the two faster text models.
            const primaryModel =
              Number(doc.red_flag_rating || 0) >= 4 || summaryModels.length === 0
                ? qualityModel
                : summaryModels[routingIndex++ % summaryModels.length];
            const fallbackModels = [primaryModel, qualityModel, ...summaryModels].filter(
              (model, index, all) => Boolean(model) && all.indexOf(model) === index,
            );
            let selectedModel = primaryModel;
            pipelineRuntime.currentDocId = Number(doc.id);
            pipelineRuntime.currentFile = doc.file_name || null;
            pipelineRuntime.currentDocStartedAt = Date.now();
            updateHeartbeat({
              phase: 'Enrichment',
              currentDocId: doc.id,
              currentFile: doc.file_name,
              currentDocStartedAt: new Date(pipelineRuntime.currentDocStartedAt).toISOString(),
            });

            // node-postgres auto-parses jsonb into objects; handle both cases
            let meta: Record<string, unknown> = {};
            if (doc.metadata_json) {
              if (typeof doc.metadata_json === 'object' && doc.metadata_json !== null) {
                meta = doc.metadata_json as Record<string, unknown>;
              } else if (typeof doc.metadata_json === 'string') {
                try {
                  meta = JSON.parse(doc.metadata_json);
                } catch {
                  meta = {};
                }
              }
            }
            // Release metadata_json from the row object immediately after parsing
            doc.metadata_json = null;

            const subject =
              (meta.subject as string) ||
              (meta.title as string) ||
              doc.file_name ||
              'Unknown Document';

            const refinedText = AIEnrichmentService.decodeHtmlAndUnicode(doc.content || '');
            const analysisText = refinedText;
            const inputHash = crypto
              .createHash('sha256')
              .update(refinedText)
              .digest('hex')
              .slice(0, 40);
            documentStageRun = await PipelineService.startStageRun({
              runId: currentPipelineRun?.id,
              documentId: Number(doc.id),
              stageName: stage.name,
              stageVersion: stage.version,
              inputHash,
              modelId: primaryModel,
              metrics: { mode, fileName: doc.file_name, fallbackModels },
            });

            // Release raw content from row object — refinedText is the only copy we need
            doc.content = null;

            let summary: string | null = null;
            let lastModelError: unknown = null;
            for (const candidateModel of fallbackModels) {
              selectedModel = candidateModel;
              try {
                summary = await withPipelineHeartbeat(
                  withTimeoutReject(
                    AIEnrichmentService.summarizeDocument(analysisText, {
                      fileName: doc.file_name || undefined,
                      subject,
                      modelId: candidateModel,
                    }),
                    {
                      timeoutMs: DOC_PROCESSING_TIMEOUT_MS,
                      timeoutMessage: `AI enrichment timed out for document ${doc.id} (${doc.file_name})`,
                    },
                  ),
                  {
                    phase: 'Enrichment',
                    enrichProcessed: documentsEnriched,
                    enrichTotal,
                    currentFile: doc.file_name,
                    currentDocId: doc.id,
                    activeModel: candidateModel,
                    inFlight: chunk.length,
                  },
                );
                if (summary && summary.length >= 20) break;
              } catch (error) {
                lastModelError = error;
                console.warn(`   ⚠️ ${candidateModel} failed for ${doc.id}; trying fallback`);
              }
            }
            if (!summary && lastModelError) throw lastModelError;

            if (!summary || summary.length < 10) {
              const preview = analysisText
                .replace(/[\r\n]+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 200);
              summary = `Document "${doc.file_name}" summary preview: ${preview}...`;
            }

            if (
              isFallbackDocumentTitle({ id: doc.id, title: doc.title, fileName: doc.file_name })
            ) {
              const derivedTitle = deriveDocumentTitle({
                id: doc.id,
                title: doc.title,
                fileName: doc.file_name,
                aiSummary: summary,
                ocrText: analysisText,
              });
              await pool.query(
                `UPDATE documents
             SET title = $1
             WHERE id = $2
               AND (
                 title IS NULL
                 OR BTRIM(title) = ''
                 OR LOWER(BTRIM(title)) LIKE 'untitled%'
                 OR title = $3
                 OR title = $4
               )`,
                [
                  derivedTitle.title,
                  doc.id,
                  deriveDocumentTitle({ id: doc.id, fileName: doc.file_name }).title,
                  `Document ${doc.id}`,
                ],
              );
            }

            const outputHash = crypto
              .createHash('sha256')
              .update(analysisText + summary)
              .digest('hex');
            await PipelineService.upsertAiArtifact({
              runId: currentPipelineRun?.id,
              stageRunId: documentStageRun?.id,
              documentId: Number(doc.id),
              artifactType: 'summary',
              artifactVersion: 'summary-v2',
              modelId: selectedModel,
              promptVersion: 'forensic-summary-v1',
              sourceExcerpt: analysisText.slice(0, 2000),
              outputText: summary,
              confidence: summary.startsWith('Document "') ? 0.35 : 0.75,
              provenance: {
                provider: process.env.AI_PROVIDER,
                routedModel: selectedModel,
                attemptedModels: fallbackModels.slice(0, fallbackModels.indexOf(selectedModel) + 1),
                mode,
                inputHash,
                outputHash,
                sourceText: 'decoded_content',
                canonicalTextUpdated: false,
              },
            });
            await PipelineService.finishStageRun(documentStageRun?.id, {
              status: 'succeeded',
              outputHash,
              metrics: { summaryChars: summary.length, analysisChars: analysisText.length },
            });
            summariesGenerated++;
            documentsEnriched++;
            modelUsage[selectedModel] = (modelUsage[selectedModel] || 0) + 1;
            markProgress({
              phase: 'Enrichment',
              enrichProcessed: documentsEnriched,
              enrichTotal,
              currentFile: doc.file_name,
              currentDocId: doc.id,
              activeModel: selectedModel,
              exoModelPool: modelPool,
              modelUsage,
            });
          } catch (error) {
            console.error(`   ❌ Failed to enrich document ${doc.id}:`, error);
            await PipelineService.finishStageRun(documentStageRun?.id, {
              status: 'failed',
              errorMessage: String((error as Error)?.message || error),
            });

            if (error instanceof ExoModelUnavailableError) {
              const message = error.message;
              writeLiveStatus({
                blocked: true,
                blockedReason: message,
                lastError: message,
                lastErrorAt: new Date().toISOString(),
                currentFile: doc.file_name,
                currentDocId: doc.id,
              });
              throw new PipelineBlockedError(message, 'exo');
            }

            if (
              error instanceof PipelineBlockedError ||
              String((error as Error)?.message || '').includes('timed out')
            ) {
              throw error;
            }
          } finally {
            pipelineRuntime.currentDocId = null;
            pipelineRuntime.currentFile = null;
            pipelineRuntime.currentDocStartedAt = 0;
          }

          if (documentsEnriched % 10 === 0) {
            const elapsed = (Date.now() - startTime) / 1000;
            const rate = elapsed > 0 ? documentsEnriched / elapsed : 0;
            process.stdout.write(
              `\r   ⏳ ${documentsEnriched} enriched | ${rate.toFixed(1)} docs/s`,
            );
          }
        }),
      );
      const rejected = results.find(
        (result): result is PromiseRejectedResult => result.status === 'rejected',
      );
      if (rejected) throw rejected.reason;
    }

    // Brief pause between batches — allows V8 GC to reclaim the just-processed docs
    // before loading the next batch.
    await sleep(200);
  }
  console.log('\n');
  pipelineRuntime.currentDocId = null;
  pipelineRuntime.currentFile = null;
  pipelineRuntime.currentDocStartedAt = 0;
  await PipelineService.finishStageRun(aggregateStageRun?.id, {
    status: 'succeeded',
    metrics: {
      documentsEnriched,
      summariesGenerated,
      mode,
      modelPool,
      summaryModels,
      summaryConcurrency,
      fetchBatchSize,
      modelUsage,
    },
  });
  return { documentsEnriched, summariesGenerated };
}
