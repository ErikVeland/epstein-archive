#!/usr/bin/env tsx
/**
 * Compute significance_score for all documents.
 *
 * Score formula (per document):
 *   pair_score * 3.0          — sum of (confidence * strength) for co-mentioned entity pairs
 *   + bridge_bonus * 2.5      — 5.0 if entities span 2+ distinct community_ids, else 0
 *   + centrality_norm * 1.0   — mentions * red_flag_rating, normalised 0-10 within batch
 *   + type_bonus              — evidence_type bonus (see TYPE_BONUS)
 *
 * Refreshes entity_connection_signals CONCURRENTLY first (falls back to non-CONCURRENT
 * if the view has no data yet).
 *
 * Usage:
 *   pnpm db:compute:significance
 *   SIG_BATCH_SIZE=10000 pnpm db:compute:significance
 */

import 'dotenv/config';
import { getMaintenancePool } from '../src/server/db/connection.js';

const BATCH_SIZE = Number(process.env.SIG_BATCH_SIZE || 5000);

// Document type bonus per evidence_type
const TYPE_BONUS: Record<string, number> = {
  flight_manifest: 5,
  financial_record: 5,
  email: 4,
  letter: 4,
  legal_document: 3,
  official_document: 3,
  correspondence: 1,
};

async function refreshSignals(pool: ReturnType<typeof getMaintenancePool>) {
  console.log('[significance] Refreshing entity_connection_signals...');
  const start = Date.now();
  // Use a dedicated client so we can disable the statement timeout only for this long-running
  // operation without affecting other pool connections.
  const client = await pool.connect();
  try {
    await client.query('SET statement_timeout = 0');
    try {
      await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY entity_connection_signals');
    } catch (err: unknown) {
      // CONCURRENTLY requires a unique index AND the view to already have data.
      // If the view was created WITH NO DATA, fall back to non-concurrent refresh.
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('CONCURRENTLY') || msg.includes('not been populated')) {
        console.log(
          '[significance] Falling back to non-concurrent refresh (view not yet populated)',
        );
        await client.query('REFRESH MATERIALIZED VIEW entity_connection_signals');
      } else {
        throw err;
      }
    }
  } finally {
    client.release();
  }
  console.log(`[significance] View refreshed in ${Date.now() - start}ms`);
}

async function computeBatch(
  pool: ReturnType<typeof getMaintenancePool>,
  offset: number,
): Promise<number> {
  const { rows: docs } = await pool.query<{ id: number; evidence_type: string | null }>(
    `SELECT id, evidence_type FROM documents ORDER BY id LIMIT $1 OFFSET $2`,
    [BATCH_SIZE, offset],
  );

  if (docs.length === 0) return 0;

  const docIds = docs.map((d) => d.id);

  // Use a dedicated client so we can disable the statement timeout only for the
  // long-running batch SELECT/UPDATE queries without affecting other pool connections.
  const client = await pool.connect();
  try {
    await client.query('SET statement_timeout = 0');

    // entity_pair_relationship_sum: sum of (er.confidence * er.strength) for entity pairs in this doc
    const { rows: pairScores } = await client.query<{ document_id: number; pair_score: number }>(
      `
      SELECT
        em1.document_id,
        SUM(COALESCE(er.confidence, 0) * COALESCE(er.strength, 1)) AS pair_score
      FROM entity_mentions em1
      JOIN entity_mentions em2
        ON em1.document_id = em2.document_id AND em1.entity_id < em2.entity_id
      JOIN entity_relationships er
        ON (er.source_entity_id = em1.entity_id AND er.target_entity_id = em2.entity_id)
        OR (er.source_entity_id = em2.entity_id AND er.target_entity_id = em1.entity_id)
      WHERE em1.document_id = ANY($1::bigint[])
      GROUP BY em1.document_id
      `,
      [docIds],
    );

    // entity_centrality_sum: sum of (mentions * red_flag_rating) for entities in doc
    const { rows: centralityScores } = await client.query<{
      document_id: number;
      centrality_sum: number;
    }>(
      `
      SELECT
        em.document_id,
        SUM(COALESCE(e.mentions, 0) * COALESCE(e.red_flag_rating, 0)) AS centrality_sum
      FROM entity_mentions em
      JOIN entities e ON e.id = em.entity_id
      WHERE em.document_id = ANY($1::bigint[])
      GROUP BY em.document_id
      `,
      [docIds],
    );

    // community_bridge_bonus: count distinct community_ids for entities in doc
    const { rows: bridgeScores } = await client.query<{
      document_id: number;
      community_count: number;
    }>(
      `
      SELECT
        em.document_id,
        COUNT(DISTINCT e.community_id) AS community_count
      FROM entity_mentions em
      JOIN entities e ON e.id = em.entity_id
      WHERE em.document_id = ANY($1::bigint[]) AND e.community_id IS NOT NULL
      GROUP BY em.document_id
      `,
      [docIds],
    );

    // Build lookup maps
    const pairMap = new Map(pairScores.map((r) => [r.document_id, Number(r.pair_score)]));
    const centralityMap = new Map(
      centralityScores.map((r) => [r.document_id, Number(r.centrality_sum)]),
    );
    const bridgeMap = new Map(bridgeScores.map((r) => [r.document_id, Number(r.community_count)]));

    // Normalise centrality to 0-10 range within this batch
    let maxCentrality = 1;
    for (const v of centralityMap.values()) {
      if (v > maxCentrality) maxCentrality = v;
    }

    // Compute scores and bulk update
    const updates = docs.map((doc) => {
      const pairScore = pairMap.get(doc.id) ?? 0;
      const centralityRaw = centralityMap.get(doc.id) ?? 0;
      const centralityNorm = (centralityRaw / maxCentrality) * 10;
      const communityCount = bridgeMap.get(doc.id) ?? 0;
      const bridgeBonus = communityCount >= 2 ? 5.0 : 0;
      const typeBonus = TYPE_BONUS[doc.evidence_type ?? ''] ?? 0;

      const score = pairScore * 3.0 + bridgeBonus * 2.5 + centralityNorm * 1.0 + typeBonus;

      return { id: doc.id, score: Math.round(score * 100) / 100 };
    });

    // Bulk update using unnest
    await client.query(
      `
      UPDATE documents d SET significance_score = v.score
      FROM unnest($1::bigint[], $2::float[]) AS v(id, score)
      WHERE d.id = v.id
      `,
      [updates.map((u) => u.id), updates.map((u) => u.score)],
    );
  } finally {
    client.release();
  }

  return docs.length;
}

async function main() {
  const pool = getMaintenancePool();
  try {
    await refreshSignals(pool);

    const { rows: countRows } = await pool.query<{ count: string }>(
      'SELECT COUNT(*) FROM documents',
    );
    const total = Number(countRows[0].count);
    console.log(`[significance] Computing scores for ${total} documents...`);

    let offset = 0;
    let processed = 0;
    while (offset < total) {
      const n = await computeBatch(pool, offset);
      if (n === 0) break;
      processed += n;
      offset += BATCH_SIZE;
      process.stdout.write(`\r[significance] ${processed}/${total}`);
    }

    const { rows: stats } = await pool.query<{ min: number; max: number; avg: number }>(
      'SELECT MIN(significance_score) AS min, MAX(significance_score) AS max, AVG(significance_score) AS avg FROM documents',
    );
    console.log(
      `\n[significance] Done. min=${Number(stats[0].min).toFixed(2)} max=${Number(stats[0].max).toFixed(2)} avg=${Number(stats[0].avg).toFixed(2)}`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[significance] Fatal:', err);
  process.exit(1);
});
