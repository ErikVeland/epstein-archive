// ============================================================================
// RUNNER — subprocess execution and phase orchestration
// ============================================================================

import { existsSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import crypto from 'crypto';
import { AIEnrichmentService } from '../../src/server/services/AIEnrichmentService.js';
import { getIngestPool } from '../../src/server/db/connection.js';
import { withTimeoutReject } from '../../src/server/utils/asyncTimeout.js';
import { PipelineService, type PipelineRun } from '../../src/server/services/pipelineService.js';
import { BATCH_SIZE, DOC_PROCESSING_TIMEOUT_MS } from './config.js';
import {
  pipelineRuntime,
  isShuttingDown,
  setShuttingDown,
  PipelineBlockedError,
  updateHeartbeat,
  markProgress,
  sleep,
} from './status.js';
import { stageByName, type UnifiedStage } from './stages.js';
import { ensureServiceHealthyOrRecover, attemptRecovery } from './recovery.js';

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

  if ((process.env.AI_PROVIDER || 'local_ollama') === 'exo_cluster') {
    await ensureServiceHealthyOrRecover(
      'exo',
      'Exo health check failed before enrichment',
      'Exo stayed unhealthy after automatic recovery. Backfill cycle aborted.',
    );
  }

  const pool = getIngestPool();
  const stage = stageByName('ai-enrichment');
  const aggregateStageRun = await PipelineService.startStageRun({
    runId: currentPipelineRun?.id,
    stageName: stage.name,
    stageVersion: stage.version,
    modelId: process.env.EXO_MODEL || process.env.AI_PROVIDER || 'auto',
    metrics: { mode },
  });

  let whereClause =
    "content IS NOT NULL AND length(content) > 50 AND (metadata_json IS NULL OR NOT metadata_json ? 'ai_enrichment_failed')";
  const summaryArtifactPredicate =
    "NOT EXISTS (SELECT 1 FROM document_ai_artifacts daa WHERE daa.document_id = documents.id AND daa.artifact_type = 'summary' AND daa.artifact_version = 'summary-v2' AND daa.prompt_version = 'forensic-summary-v1')";
  const ocrArtifactPredicate =
    "NOT EXISTS (SELECT 1 FROM document_ai_artifacts daa WHERE daa.document_id = documents.id AND daa.artifact_type = 'ocr_clean_text' AND daa.artifact_version = 'ocr-clean-v1' AND daa.prompt_version = 'forensic-ocr-clean-v1')";
  if (mode === 'backfill') {
    // Backfill documents lacking durable AI artifacts. LLM outputs are intentionally not used as
    // metadata markers or canonical text updates unless explicitly enabled by environment.
    whereClause += ` AND (${summaryArtifactPredicate} OR ((content LIKE '%=%' OR coalesce((metadata_json->>'ocr_confidence')::float, 1.0) < 0.6) AND ${ocrArtifactPredicate}))`;
  } else if (mode === 'new') {
    whereClause += " AND created_at > now() - interval '1 day'";
  }
  const allowAiContentRewrite =
    process.env.NODE_ENV !== 'production' && process.env.ALLOW_AI_CONTENT_REWRITE === 'true';

  // Get enrichable total once at start for progress tracking
  const enrichTotalRow = (
    await pool.query(`SELECT COUNT(*) AS total FROM documents WHERE ${whereClause}`)
  ).rows[0];
  const enrichTotal = Number(enrichTotalRow?.total || 0);

  let documentsEnriched = 0;
  let summariesGenerated = 0;
  const startTime = Date.now();

  // Record when this enrichment run began so the widget can compute throughput/ETA
  markProgress({
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

  const failedDocIds = new Set<number>();

  while (!isShuttingDown()) {
    // Always query at offset 0: enriched docs drop out of the WHERE clause
    // so the result set naturally shrinks each iteration.
    const docs = (
      await pool.query(
        `
      SELECT id, LEFT(content, 4000) AS content, metadata_json, file_name
      FROM documents
      WHERE ${whereClause} ${failedDocIds.size > 0 ? `AND id NOT IN (${Array.from(failedDocIds).join(',')})` : ''}
      ORDER BY id ASC
      LIMIT $1
    `,
        [BATCH_SIZE],
      )
    ).rows as {
      id: number;
      content: string | null;
      metadata_json: Record<string, unknown> | null;
      file_name: string | null;
    }[];

    if (docs.length === 0) break;

    // Write progress to live_status.json once per batch so the widget stays current
    updateHeartbeat({
      phase: 'Enrichment',
      enrichProcessed: documentsEnriched,
      enrichTotal,
      currentFile: docs[0]?.file_name ?? null,
      currentDocId: docs[0]?.id ?? null,
    });

    // Process sequentially: EXO is local so parallel requests queue up on its side
    // anyway, while concurrent fetches multiply Node.js heap usage for no throughput gain.
    for (const doc of docs) {
      if (isShuttingDown()) break;
      let documentStageRun: { id: number } | null = null;
      try {
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
          (meta.subject as string) || (meta.title as string) || doc.file_name || 'Unknown Document';

        let refinedText = AIEnrichmentService.decodeHtmlAndUnicode(doc.content || '');
        let analysisText = refinedText;
        let cleanedTextForArtifact: string | null = null;
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
          modelId: process.env.EXO_MODEL || process.env.AI_PROVIDER || 'auto',
          metrics: { mode, fileName: doc.file_name },
        });

        // LLM OCR Re-Correction Pipeline Phase:
        // Reconstruct highly garbled text (ocr_confidence < 0.6 or containing equals signs) into readable sentences using Ollama or Exo.
        const ocrConf = meta.ocr_confidence;
        const isLowLegibility =
          (typeof ocrConf === 'number' && ocrConf < 0.6) || (doc.content || '').includes('=');
        if (isLowLegibility && process.env.ENABLE_AI_ENRICHMENT === 'true') {
          const cleanedText = await AIEnrichmentService.cleanOCRText(refinedText, subject);
          if (cleanedText && cleanedText.length > 50) {
            cleanedTextForArtifact = cleanedText;
            analysisText = cleanedText;
            if (allowAiContentRewrite) {
              refinedText = cleanedText;
            }
          }
        }

        // Release raw content from row object — refinedText is the only copy we need
        doc.content = null;

        let summary = await withTimeoutReject(
          AIEnrichmentService.summarizeDocument(analysisText, {
            fileName: doc.file_name || undefined,
            subject,
          }),
          {
            timeoutMs: DOC_PROCESSING_TIMEOUT_MS,
            timeoutMessage: `AI enrichment timed out for document ${doc.id} (${doc.file_name})`,
            onTimeout: async () => {
              await attemptRecovery(
                'exo',
                `AI enrichment timed out after ${Math.round(DOC_PROCESSING_TIMEOUT_MS / 1000)}s on ${doc.file_name || 'unknown'}`,
              );
            },
          },
        );

        if (!summary || summary.length < 10) {
          const preview = analysisText
            .replace(/[\r\n]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 200);
          summary = `Document "${doc.file_name}" summary preview: ${preview}...`;
        }

        if (allowAiContentRewrite && cleanedTextForArtifact) {
          await pool.query('UPDATE documents SET content_refined = $1 WHERE id = $2', [
            cleanedTextForArtifact,
            doc.id,
          ]);
        }

        const outputHash = crypto
          .createHash('sha256')
          .update(analysisText + summary)
          .digest('hex');
        if (cleanedTextForArtifact) {
          const cleanedOutputHash = crypto
            .createHash('sha256')
            .update(cleanedTextForArtifact)
            .digest('hex');
          await PipelineService.upsertAiArtifact({
            runId: currentPipelineRun?.id,
            stageRunId: documentStageRun?.id,
            documentId: Number(doc.id),
            artifactType: 'ocr_clean_text',
            artifactVersion: 'ocr-clean-v1',
            modelId: process.env.EXO_MODEL || process.env.AI_PROVIDER || 'auto',
            promptVersion: 'forensic-ocr-clean-v1',
            sourceExcerpt: refinedText.slice(0, 2000),
            outputText: cleanedTextForArtifact,
            confidence: 0.6,
            provenance: {
              provider: process.env.AI_PROVIDER,
              mode,
              inputHash,
              outputHash: cleanedOutputHash,
              canonicalTextUpdated: allowAiContentRewrite,
            },
          });
        }
        await PipelineService.upsertAiArtifact({
          runId: currentPipelineRun?.id,
          stageRunId: documentStageRun?.id,
          documentId: Number(doc.id),
          artifactType: 'summary',
          artifactVersion: 'summary-v2',
          modelId: process.env.EXO_MODEL || process.env.AI_PROVIDER || 'auto',
          promptVersion: 'forensic-summary-v1',
          sourceExcerpt: analysisText.slice(0, 2000),
          outputText: summary,
          confidence: summary.startsWith('Document "') ? 0.35 : 0.75,
          provenance: {
            provider: process.env.AI_PROVIDER,
            mode,
            inputHash,
            outputHash,
            sourceText: cleanedTextForArtifact ? 'ocr_clean_text_artifact' : 'decoded_content',
            canonicalTextUpdated: allowAiContentRewrite && Boolean(cleanedTextForArtifact),
          },
        });
        await PipelineService.finishStageRun(documentStageRun?.id, {
          status: 'succeeded',
          outputHash,
          metrics: { summaryChars: summary.length, analysisChars: analysisText.length },
        });
        summariesGenerated++;
        documentsEnriched++;
        markProgress({
          phase: 'Enrichment',
          enrichProcessed: documentsEnriched,
          enrichTotal,
          currentFile: doc.file_name,
          currentDocId: doc.id,
        });
      } catch (error) {
        console.error(`   ❌ Failed to enrich document ${doc.id}:`, error);
        failedDocIds.add(Number(doc.id));
        await PipelineService.finishStageRun(documentStageRun?.id, {
          status: 'failed',
          errorMessage: String((error as Error)?.message || error),
        });

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
        process.stdout.write(`\r   ⏳ ${documentsEnriched} enriched | ${rate.toFixed(1)} docs/s`);
      }
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
    metrics: { documentsEnriched, summariesGenerated, mode },
  });
  return { documentsEnriched, summariesGenerated };
}
