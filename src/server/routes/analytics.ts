import { Router } from 'express';
import { analyticsQueries } from '@epstein/db';
import { entitiesRepository } from '../db/entitiesRepository.js';
import { getApiPool } from '../db/runtime.js';
import { resetJunkFlags } from '../db/routesDb.js';
import { analyticsRateLimiter } from '../middleware/rateLimit.js';
import { cacheResponse } from '../utils/perfCache.js';
import { authenticateRequest, requireRole } from '../auth/middleware.js';

const router = Router();

/**
 * Enhanced Analytics — reads from materialised views for O(1) response times.
 * Views are refreshed every 5 minutes by the setInterval in server.ts.
 */
router.get('/enhanced', analyticsRateLimiter, cacheResponse(60), async (_req, res, next) => {
  try {
    const pool = getApiPool();
    console.log('📊 [Analytics] Fetching from materialised views...');
    console.time('analytics-total');

    const [
      docsByTypeRows,
      timelineRows,
      topConnectedRows,
      entityDistRows,
      redactionStatsRows,
      topRelationshipsRows,
      totalCountsRows,
      reconciliationRows,
      riskByTypeRows,
    ] = await Promise.all([
      analyticsQueries.getDocsByType.run(undefined, pool),
      analyticsQueries.getTimelineData.run(undefined, pool),
      analyticsQueries.getTopConnected.run(undefined, pool),
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

    const tc = totalCountsRows[0];
    const rc = reconciliationRows[0];

    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      documentsByType: docsByTypeRows,
      timelineData: timelineRows,
      topConnectedEntities: topConnectedRows,
      entityTypeDistribution: entityDistRows,
      riskByType: riskByTypeRows.rows,
      redactionStats: redactionStatsRows[0] ?? null,
      topRelationships: topRelationshipsRows,
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
    console.error('❌ Error fetching enhanced analytics:', error);
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
      console.error('❌ Error in junk reconciliation:', error);
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
      console.error('❌ Error resetting junk flags:', error);
      next(error);
    }
  },
);

export default router;
