import express from 'express';
import { statsRepository } from '../db/statsRepository.js';
import { archiveStatusSchema } from '../../shared/schemas/stats.js';
import fs from 'fs/promises';
import path from 'path';
import { getApiPool } from '../db/connection.js';

const router = express.Router();

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
    const refined = Number(row?.refined_documents || 0);
    const done = Number(row?.docs_with_triples || 0);
    const empty = Number(row?.marked_empty || 0);
    const errors = Number(row?.marked_error || 0);
    const remaining = Math.max(0, refined - done - empty - errors);
    const docsLastHour = Number(row?.docs_last_hour || 0);
    const etaHours = docsLastHour > 0 ? remaining / docsLastHour : null;

    res.json({
      ...checkpoint,
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
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
