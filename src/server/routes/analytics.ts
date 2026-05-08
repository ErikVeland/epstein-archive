import express from 'express';
import { analyticsQueries } from '@epstein/db';
import { analyticsRepository } from '../db/analyticsRepository.js';
import { entitiesRepository } from '../db/entitiesRepository.js';
import { getApiPool } from '../db/runtime.js';
import { resetJunkFlags } from '../db/routesDb.js';
import { analyticsRateLimiter } from '../middleware/rateLimit.js';
import { cacheResponse } from '../utils/perfCache.js';
import { authenticateRequest, requireRole } from '../auth/middleware.js';
import { logger } from '../services/Logger.js';

const router = express.Router();

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
    const t0 = Date.now();
    logger.info('📊 [Analytics] Fetching from materialised views...');
    const timelineLivePromise = analyticsRepository.getTimelineAnalytics();
    const topConnectedLivePromise = analyticsRepository.getTopConnectedPeople();
    const riskDistributionPromise = analyticsRepository.getRiskDistribution();

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
      timelineLivePromise,
      topConnectedLivePromise,
      analyticsQueries.getEntityTypeDistribution.run(undefined, pool),
      analyticsQueries.getRedactionStats.run(undefined, pool),
      analyticsQueries.getTopRelationships.run(undefined, pool),
      analyticsQueries.getTotalCounts.run(undefined, pool),
      analyticsQueries.getReconciliationCounts.run(undefined, pool),
      riskDistributionPromise,
    ]);

    const topConnectedMap = new Map<string, Record<string, unknown>>();
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
    const topConnectedIds = new Set(
      topConnectedRows.map((row: Record<string, unknown>) => Number(row.id)),
    );
    const filteredTopRelationshipsRows = (topRelationshipsRows || []).filter((rel: unknown) => {
      const r = rel as Record<string, unknown>;
      return (
        topConnectedIds.has(Number(r?.sourceId || r?.source_id)) &&
        topConnectedIds.has(Number(r?.targetId || r?.target_id))
      );
    });

    const tc = totalCountsRows[0];
    const rc = reconciliationRows[0];

    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      documentsByType: docsByTypeRows,
      timelineData: timelineLiveRows,
      topConnectedEntities: topConnectedRows,
      entityTypeDistribution: entityDistRows,
      riskByType: riskByTypeRows,
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
    logger.info(`[Analytics] Completed in ${Date.now() - t0}ms`);
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
    } catch (error) {
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

// Analytics specific correlation heuristics
router.get('/correlations', authenticateRequest, async (_req, res, next) => {
  try {
    const [topEntity, stats] = await Promise.all([
      analyticsRepository.getTopEntityByMentions(),
      analyticsRepository.getAnalyticsTotals(),
    ]);

    const dataSources = [
      {
        id: 'documents',
        type: 'document',
        name: 'Documents',
        description: 'Indexed evidence documents',
        lastUpdated: new Date().toISOString().slice(0, 10),
        reliability: 'verified',
        recordCount: Number(stats?.totalDocuments || 0),
        coverage: 100,
      },
      {
        id: 'entities',
        type: 'legal',
        name: 'Entities',
        description: 'People and organisations with mentions',
        lastUpdated: new Date().toISOString().slice(0, 10),
        reliability: 'high',
        recordCount: Number(stats?.totalEntities || 0),
        coverage: 100,
      },
    ];

    const correlations: Array<Record<string, unknown>> = [];

    if (topEntity) {
      const topEntityId = topEntity.canonicalId || topEntity.id;
      const topEntityName = topEntity.fullName || topEntity.name || String(topEntityId);

      // 3. Relationships Correlations
      const relationshipRows =
        await analyticsRepository.getEntityRelationshipCorrelations(topEntityId);

      relationshipRows.forEach((r, idx) => {
        correlations.push({
          id: `rel-${idx}`,
          type: 'entity',
          confidence: Math.round(Number(r.confidence || 0) * 100) || 75,
          description: `Relationship ${r.relationship_type} with entity ${r.target_id}`,
          sources: ['entities', 'documents'],
          entities: [topEntityName, String(r.target_id)],
          timeRange: { start: 'Unknown', end: 'Unknown' },
          significance:
            Number(r.proximity_score || 0) > 0.7
              ? 'high'
              : Number(r.proximity_score || 0) > 0.4
                ? 'medium'
                : 'low',
          evidence: [],
          anomalies: [],
        });
      });

      // 4. Financial Correlations
      const highRiskResult = await analyticsRepository.getHighRiskFinancialTransactions();
      const highRiskTxs = Array.isArray(highRiskResult) ? highRiskResult : highRiskResult.data;
      if (!Array.isArray(highRiskResult) && highRiskResult.degraded) res.locals._degraded = true;
      if (highRiskTxs.length > 0) {
        const counterparties = Array.from(
          new Set(
            highRiskTxs
              .flatMap((t) => [t.from_entity, t.to_entity])
              .filter(Boolean)
              .map(String),
          ),
        );
        correlations.push({
          id: 'financial-high-risk',
          type: 'financial',
          confidence: 80,
          description: `High-risk financial transfers involving ${counterparties.length} counterparties and ${highRiskTxs.length} flagged transactions for ${topEntityName}`,
          sources: ['financial'],
          entities: [topEntityName, ...counterparties],
          timeRange: { start: 'Unknown', end: 'Unknown' },
          significance:
            highRiskTxs.length > 50 ? 'critical' : highRiskTxs.length > 10 ? 'high' : 'medium',
          evidence: [],
          anomalies: [],
        });
      }

      // 5. Communications Correlations
      const commResult = await analyticsRepository.getFlightCommunications(topEntityId);
      const commEvents = Array.isArray(commResult) ? commResult : commResult.data;
      if (!Array.isArray(commResult) && commResult.degraded) res.locals._degraded = true;
      if (commEvents.length > 0) {
        const peers = Array.from(
          new Set(
            commEvents
              .flatMap((e) => [e.from, ...(Array.isArray(e.to) ? e.to : [])])
              .filter(Boolean)
              .map(String),
          ),
        );
        correlations.push({
          id: 'communication-flight',
          type: 'communication',
          confidence: 75,
          description:
            'Cluster of communications referencing flight or logistics activity around a key entity.',
          sources: ['communication'],
          entities: [topEntityName, ...peers],
          timeRange: { start: 'Unknown', end: 'Unknown' },
          significance: commEvents.length > 30 ? 'high' : 'medium',
          evidence: [],
          anomalies: [],
        });
      }
    }

    res.json({
      dataSources,
      correlations,
      rules: [],
    });
  } catch (error) {
    logger.error({ err: error }, '❌ Error fetching correlations');
    next(error);
  }
});

export default router;
