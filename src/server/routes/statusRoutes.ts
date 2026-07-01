import express from 'express';
import { statsRepository } from '../db/statsRepository.js';
import { archiveStatusSchema } from '../../shared/schemas/stats.js';
import { execFileSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { getApiPool } from '../db/connection.js';

const router = express.Router();

const asDateMs = (value: unknown): number | null => {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
};

const asPid = (value: unknown): number | null => {
  const pid = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isInteger(pid) && pid > 0 ? pid : null;
};

const isPidAlive = (pid: number | null): boolean => {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const hasUnifiedPipelineProcess = (): boolean => {
  try {
    execFileSync('pgrep', ['-f', 'tsx.*scripts/unified_pipeline\\.ts|unified_pipeline\\.ts'], {
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
};

router.get('/archive', async (_req, res, next) => {
  try {
    const status = await statsRepository.getArchiveStatus();
    res.json(archiveStatusSchema.parse(status));
  } catch (error) {
    next(error);
  }
});

router.get('/backfill', async (_req, res, next) => {
  try {
    const checkpointPath = path.resolve(process.cwd(), 'pipeline_checkpoints/live_status.json');
    const checkpoint = JSON.parse(await fs.readFile(checkpointPath, 'utf8')) as Record<
      string,
      unknown
    >;
    const checkpointPid = asPid(checkpoint.pid);
    const pidAlive = isPidAlive(checkpointPid);
    const processRunning = pidAlive || hasUnifiedPipelineProcess();
    const heartbeatAt = typeof checkpoint.heartbeatAt === 'string' ? checkpoint.heartbeatAt : null;
    const heartbeatMs = asDateMs(heartbeatAt);
    const heartbeatAgeSeconds =
      heartbeatMs === null ? null : Math.max(0, Math.round((Date.now() - heartbeatMs) / 1000));
    const heartbeatFresh = heartbeatAgeSeconds !== null && heartbeatAgeSeconds <= 120;
    const effectiveStatus =
      processRunning && heartbeatFresh ? 'running' : processRunning ? 'stale' : 'stopped';
    const pool = getApiPool();
    const counts = await pool.query<{
      claim_triples: string;
      financial_transactions: string;
      relations: string;
      timeline_events: string;
      refined_documents: string;
      docs_with_triples: string;
      marked_empty: string;
      marked_error: string;
      docs_last_hour: string;
      triples_last_hour: string;
    }>(`
      WITH refined AS (
        SELECT COUNT(*) AS n FROM documents WHERE content_refined IS NOT NULL
      ),
      done AS (
        SELECT COUNT(DISTINCT document_id) AS n FROM claim_triples
      ),
      empty_docs AS (
        SELECT COUNT(*) AS n FROM documents WHERE metadata_json ? 'graph_triples_empty_at'
      ),
      error_docs AS (
        SELECT COUNT(*) AS n FROM documents WHERE metadata_json ? 'graph_triples_error_at'
      ),
      recent AS (
        SELECT COUNT(*) AS triples, COUNT(DISTINCT document_id) AS docs
        FROM claim_triples
        WHERE created_at >= NOW() - INTERVAL '1 hour'
      )
      SELECT
        (SELECT COUNT(*) FROM claim_triples)::text AS claim_triples,
        (SELECT COUNT(*) FROM financial_transactions)::text AS financial_transactions,
        (SELECT COUNT(*) FROM entity_relationships)::text AS relations,
        (SELECT COUNT(*) FROM global_timeline_events WHERE source = 'pipeline_extract')::text AS timeline_events,
        refined.n::text AS refined_documents,
        done.n::text AS docs_with_triples,
        empty_docs.n::text AS marked_empty,
        error_docs.n::text AS marked_error,
        recent.docs::text AS docs_last_hour,
        recent.triples::text AS triples_last_hour
      FROM refined, done, empty_docs, error_docs, recent
    `);
    const row = counts.rows[0];
    const semanticRows = await pool
      .query<{
        document_embeddings: string;
        entity_embeddings: string;
      }>(
        `
        SELECT
          CASE
            WHEN EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'content_embedding'
            )
            THEN (SELECT COUNT(*)::text FROM documents WHERE content_embedding IS NOT NULL)
            ELSE '0'
          END AS document_embeddings,
          CASE
            WHEN EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'entities' AND column_name = 'description_embedding'
            )
            THEN (SELECT COUNT(*)::text FROM entities WHERE description_embedding IS NOT NULL)
            ELSE '0'
          END AS entity_embeddings
      `,
      )
      .catch(() => ({ rows: [] }));
    const artifactRows = await pool
      .query<{
        ai_artifacts: string;
        reviewed_ai_artifacts: string;
      }>(
        `
        SELECT
          COUNT(*)::text AS ai_artifacts,
          COUNT(*) FILTER (WHERE review_state <> 'unreviewed')::text AS reviewed_ai_artifacts
        FROM document_ai_artifacts
      `,
      )
      .catch(() => ({ rows: [] }));
    const semantic = semanticRows.rows[0];
    const artifacts = artifactRows.rows[0];
    const refined = Number(row?.refined_documents || 0);
    const done = Number(row?.docs_with_triples || 0);
    const empty = Number(row?.marked_empty || 0);
    const errors = Number(row?.marked_error || 0);
    const remaining = Math.max(0, refined - done - empty - errors);
    const docsLastHour = Number(row?.docs_last_hour || 0);
    const etaHours = docsLastHour > 0 ? remaining / docsLastHour : null;
    const stageRows = await pool
      .query<{
        stage_name: string;
        status: string;
        count: string;
        latest_at: string | null;
      }>(
        `
        SELECT stage_name, status, COUNT(*)::text AS count, MAX(updated_at)::text AS latest_at
        FROM document_stage_runs
        GROUP BY stage_name, status
        ORDER BY stage_name, status
      `,
      )
      .catch(() => ({ rows: [] }));

    const stages: Record<string, Record<string, number | string | null>> = {};
    for (const stage of stageRows.rows) {
      stages[stage.stage_name] = stages[stage.stage_name] || {};
      stages[stage.stage_name][stage.status] = Number(stage.count || 0);
      stages[stage.stage_name].latestAt = stage.latest_at;
    }

    res.json({
      ...checkpoint,
      running: effectiveStatus === 'running',
      runtime: {
        status: effectiveStatus,
        processRunning,
        checkpointRunning: checkpoint.running === true,
        pid: checkpointPid,
        pidAlive,
        heartbeatAt,
        heartbeatAgeSeconds,
        heartbeatFresh,
        lastProgressAt:
          typeof checkpoint.lastProgressAt === 'string' ? checkpoint.lastProgressAt : null,
        currentFile: typeof checkpoint.currentFile === 'string' ? checkpoint.currentFile : null,
        currentDocId: typeof checkpoint.currentDocId === 'number' ? checkpoint.currentDocId : null,
        phase: typeof checkpoint.phase === 'string' ? checkpoint.phase : null,
        exitReason: typeof checkpoint.exitReason === 'string' ? checkpoint.exitReason : null,
      },
      counts: {
        claimTriples: Number(row?.claim_triples || 0),
        financialTransactions: Number(row?.financial_transactions || 0),
        relations: Number(row?.relations || 0),
        timelineEvents: Number(row?.timeline_events || 0),
        refinedDocuments: refined,
        docsWithTriples: done,
        markedEmpty: empty,
        markedError: errors,
        remainingClaimDocs: remaining,
        docsLastHour,
        triplesLastHour: Number(row?.triples_last_hour || 0),
        etaHours,
        semanticDocumentEmbeddings: Number(semantic?.document_embeddings || 0),
        semanticEntityEmbeddings: Number(semantic?.entity_embeddings || 0),
        aiArtifacts: Number(artifacts?.ai_artifacts || 0),
        reviewedAiArtifacts: Number(artifacts?.reviewed_ai_artifacts || 0),
      },
      stages,
      reducto: {
        standard: 'source-grounded visual and text extraction with durable stage runs',
        stageTracking: true,
        aiArtifacts: true,
        semanticEmbeddings: true,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
