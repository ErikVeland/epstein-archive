import { Router } from 'express';
import { analyticsQueries } from '@epstein/db';
import { analyticsRepository } from '../db/analyticsRepository.js';
import { entitiesRepository } from '../db/entitiesRepository.js';
import { getApiPool } from '../db/runtime.js';
import { resetJunkFlags } from '../db/routesDb.js';
import { analyticsRateLimiter } from '../middleware/rateLimit.js';
import { cacheResponse } from '../utils/perfCache.js';
import { authenticateRequest, requireRole } from '../auth/middleware.js';
import { logger } from '../services/Logger.js';

const router = Router();

const TOP_CONNECTED_JUNK_PATTERNS: RegExp[] = [
  /\b(see attachment|attachment|attachmert)\b/i,
  /\b(disc|rewritable|bluray)\b/i,
  /\b(building|contact|number|memo|case|bags|roof|beam|floor|date)\b/i,
  /\b(en\s+espa|east\s+if)\b/i,
  /\b(magstea|jedge|girand|girara|margarlt|tunsi|dechiqu)\b/i,
  /\b(sos\s+kimber|kimber(?:ly|y)\s+meder)\b/i,
];

function normalizeTopConnectedName(raw: string): string {
  return String(raw || '')
    .replace(/\s+/g, ' ')
    .replace(/^(mr|mrs|ms|miss|dr|prof|sir)\.?\s+/i, '')
    .trim();
}

function isLikelyJunkTopConnectedName(name: string): boolean {
  const trimmed = normalizeTopConnectedName(name);
  if (!trimmed || trimmed.length < 3) return true;
  if (TOP_CONNECTED_JUNK_PATTERNS.some((p) => p.test(trimmed))) return true;
  if (/\d/.test(trimmed)) return true;
  if (/^[a-z]/.test(trimmed)) return true;
  if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(trimmed)) return true;
  return false;
}

/**
 * Enhanced Analytics — reads from materialised views for O(1) response times.
 * Views are refreshed every 5 minutes by the setInterval in server.ts.
 */
router.get('/enhanced', analyticsRateLimiter, cacheResponse(60), async (_req, res, next) => {
  try {
    const pool = getApiPool();
    logger.info('📊 [Analytics] Fetching from materialised views...');
    console.time('analytics-total');

    const timelineLivePromise = pool.query<{
      period: string;
      total: string | number;
      emails: string | number;
      photos: string | number;
      documents: string | number;
      financial: string | number;
    }>(`
      SELECT * FROM (
        SELECT
          CASE
            WHEN COALESCE(extracted_date, date_created) IS NULL THEN 'Unknown'
            WHEN COALESCE(extracted_date, date_created) > '2026-12-31'::date THEN 'Unknown'
            ELSE to_char(COALESCE(extracted_date, date_created), 'YYYY-MM')
          END AS period,
          COUNT(*)::bigint AS total,
          SUM(CASE WHEN file_type LIKE '%email%' OR file_type = 'message/rfc822' THEN 1 ELSE 0 END)::bigint AS emails,
          SUM(CASE WHEN file_type LIKE '%image%' THEN 1 ELSE 0 END)::bigint AS photos,
          SUM(CASE WHEN file_type LIKE '%pdf%' OR file_type = 'application/pdf' THEN 1 ELSE 0 END)::bigint AS documents,
          0::bigint AS financial
        FROM documents
        GROUP BY 1
      ) t
      ORDER BY (CASE WHEN period = 'Unknown' THEN '9999-99' ELSE period END) ASC
    `);

    const topConnectedLivePromise = analyticsRepository.getTopConnectedPeople();

    const [
      docsByTypeRows,
      timelineLiveRows,
      topConnectedRowsRaw,
      entityDistRows,
      redactionStatsRows,
      topRelationshipsRows,
      totalCountsRows,
      reconciliationRows,
      riskByTypeRows,
    ] = await Promise.all([
      analyticsQueries.getDocsByType.run(undefined, pool),
      timelineLivePromise.then((r) => r.rows),
      topConnectedLivePromise,
      analyticsQueries.getEntityTypeDistribution.run(undefined, pool),
      analyticsQueries.getRedactionStats.run(undefined, pool),
      analyticsQueries.getTopRelationships.run(undefined, pool),
      analyticsQueries.getTotalCounts.run(undefined, pool),
      analyticsQueries.getReconciliationCounts.run(undefined, pool),
      pool.query<{ riskLevel: number; count: number }>(`
        SELECT red_flag_rating AS "riskLevel", COUNT(*)::integer AS count
        FROM entities
        WHERE red_flag_rating IS NOT NULL
          AND COALESCE(junk_tier, 'clean') = 'clean'
        GROUP BY red_flag_rating
        ORDER BY red_flag_rating
      `),
    ]);

    const topConnectedMap = new Map<string, any>();
    for (const row of topConnectedRowsRaw || []) {
      const normalizedName = normalizeTopConnectedName(String(row?.name || ''));
      if (!normalizedName || isLikelyJunkTopConnectedName(normalizedName)) continue;

      const key = normalizedName.toLowerCase();
      const mentions = Number(row?.mentions || 0);
      const connections = Number(row?.connectionCount || 0);
      const score = connections * 1000 + mentions;
      const existing = topConnectedMap.get(key);

      if (!existing || score > Number(existing.__score || 0)) {
        topConnectedMap.set(key, {
          ...row,
          name: normalizedName,
          __score: score,
        });
      }
    }
    const topConnectedRows = Array.from(topConnectedMap.values())
      .sort((a, b) => Number(b?.connectionCount || 0) - Number(a?.connectionCount || 0))
      .slice(0, 100)
      .map(({ __score, ...row }) => row);
    const topConnectedIds = new Set(topConnectedRows.map((row: any) => Number(row.id)));
    const filteredTopRelationshipsRows = (topRelationshipsRows || []).filter(
      (rel: any) =>
        topConnectedIds.has(Number(rel?.sourceId || rel?.source_id)) &&
        topConnectedIds.has(Number(rel?.targetId || rel?.target_id)),
    );

    const tc = totalCountsRows[0];
    const rc = reconciliationRows[0];

    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      documentsByType: docsByTypeRows,
      timelineData: timelineLiveRows,
      topConnectedEntities: topConnectedRows,
      entityTypeDistribution: entityDistRows,
      riskByType: riskByTypeRows.rows,
      redactionStats: redactionStatsRows[0] ?? null,
      topRelationships: filteredTopRelationshipsRows,
      totalCounts: {
        entities: Number(tc.entities),
        documents: Number(tc.documents),
        evidenceFiles: Number(tc.evidence_files),
        relationships: Number(tc.relationships),
      },
      reconciliation: {
        unclassifiedCount: Number(rc.unclassified),
        unknownDateCount: Number(rc.unknown_date),
      },
      generatedAt: new Date().toISOString(),
    });
    console.timeEnd('analytics-total');
  } catch (error) {
    logger.error({ err: error }, '❌ Error fetching enhanced analytics');
    next(error);
  }
});

// Backward-compatible alias for clients probing /api/analytics directly.
router.get('/', (_req, res) => {
  res.redirect(307, '/api/analytics/enhanced');
});

// Admin Route: Trigger Junk Entity Reconciliation
router.post(
  '/reconcile/junk',
  authenticateRequest,
  requireRole('admin'),
  async (_req, res, next) => {
    try {
      entitiesRepository.startBackgroundJunkBackfill();
      res.json({
        success: true,
        message: 'Junk reconciliation started in background',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ err: error }, '❌ Error in junk reconciliation');
      next(error);
    }
  },
);

// Admin Route: Reset Junk Flags
router.post(
  '/reconcile/reset',
  authenticateRequest,
  requireRole('admin'),
  async (_req, res, next) => {
    try {
      const changes = await resetJunkFlags();
      res.json({
        success: true,
        changes,
        message: 'All junk flags have been reset',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ err: error }, '❌ Error resetting junk flags');
      next(error);
    }
  },
);

export default router;
