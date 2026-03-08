import { Router } from 'express';
import { analyticsQueries } from '@epstein/db';
import { entitiesRepository } from '../db/entitiesRepository.js';
import { getApiPool } from '../db/runtime.js';
import { resetJunkFlags } from '../db/routesDb.js';
import { analyticsRateLimiter } from '../middleware/rateLimit.js';
import { cacheResponse } from '../utils/perfCache.js';
import { authenticateRequest, requireRole } from '../auth/middleware.js';

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
    console.log('📊 [Analytics] Fetching from materialised views...');
    console.time('analytics-total');

    const timelineLivePromise = pool.query<{
      period: string;
      total: string | number;
      emails: string | number;
      photos: string | number;
      documents: string | number;
      financial: string | number;
    }>(`
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
      ORDER BY (CASE WHEN period = 'Unknown' THEN '9999-99' ELSE period END) ASC
    `);

    const topConnectedLivePromise = pool.query<{
      id: number;
      name: string;
      role: string | null;
      type: string;
      riskLevel: number;
      connectionCount: number;
      mentions: number;
    }>(`
      WITH rel_counts AS (
        SELECT entity_id, SUM(cnt)::bigint AS cnt
        FROM (
          SELECT source_entity_id AS entity_id, COUNT(*)::bigint AS cnt
          FROM entity_relationships
          GROUP BY source_entity_id
          UNION ALL
          SELECT target_entity_id AS entity_id, COUNT(*)::bigint AS cnt
          FROM entity_relationships
          GROUP BY target_entity_id
        ) t
        GROUP BY entity_id
      ),
      filtered AS (
        SELECT
          e.id,
          e.full_name,
          e.primary_role,
          COALESCE(e.mentions, 0)::bigint AS mentions,
          COALESCE(e.red_flag_rating, 0)::int AS red_flag_rating,
          COALESCE(rc.cnt, 0)::bigint AS connection_count
        FROM entities e
        LEFT JOIN rel_counts rc ON rc.entity_id = e.id
        WHERE e.entity_type = 'Person'
          AND COALESCE(e.junk_tier, 'clean') = 'clean'
          AND COALESCE(e.quarantine_status, 0) = 0
          AND e.full_name IS NOT NULL
          AND length(trim(e.full_name)) >= 4
          AND e.full_name !~ '[0-9]'
          AND e.full_name !~ '\\n'
          AND e.full_name NOT ILIKE 'the %'
          AND e.full_name NOT ILIKE '% group'
          AND e.full_name NOT ILIKE '% inc'
          AND e.full_name NOT ILIKE '% llc'
          AND e.full_name NOT ILIKE '% corp'
          AND e.full_name NOT ILIKE '% ltd'
          AND e.full_name NOT ILIKE '% demolition'
          AND e.full_name NOT ILIKE '% bracket'
          AND e.full_name NOT ILIKE '% column%'
          AND e.full_name NOT ILIKE '% haul%'
          AND e.full_name NOT ILIKE '%provided'
          AND e.full_name NOT ILIKE '%direction'
          AND e.full_name NOT ILIKE '% name'
          AND e.full_name NOT ILIKE '% name%'
          AND e.full_name NOT ILIKE '% data%'
          AND e.full_name NOT ILIKE '% regular'
          AND e.full_name NOT ILIKE '% stock %'
          AND e.full_name NOT ILIKE '% market %'
          AND e.full_name NOT ILIKE '% newsletter%'
          AND e.full_name NOT ILIKE '% search %'
          AND e.full_name NOT ILIKE '% click %'
          AND e.full_name NOT ILIKE '% privacy %'
          AND array_length(regexp_split_to_array(trim(e.full_name), '\\s+'), 1) <= 3
      ),
      canonical_people AS (
        SELECT
          MIN(id)::bigint AS id,
          CASE
            WHEN full_name IN ('Donald Trump', 'President Trump', 'Mr Trump', 'Trump', 'Donald J Trump', 'Donald J. Trump') THEN 'Donald Trump'
            WHEN full_name IN ('Jeffrey Epstein', 'Epstein', 'Jeffrey', 'Jeff Epstein', 'Mr Epstein') THEN 'Jeffrey Epstein'
            WHEN full_name IN ('Ghislaine Maxwell', 'Maxwell', 'Ghislaine', 'Ms Maxwell', 'Miss Maxwell') THEN 'Ghislaine Maxwell'
            WHEN full_name IN ('Bill Clinton', 'President Clinton', 'Mr Clinton', 'Clinton', 'William Clinton')
              AND lower(full_name) NOT LIKE '%hillary%' AND lower(full_name) NOT LIKE '%chelsea%' THEN 'Bill Clinton'
            WHEN full_name IN ('Prince Andrew', 'Duke of York', 'Andrew') OR lower(full_name) LIKE '%prince andrew%' THEN 'Prince Andrew'
            WHEN full_name IN ('Alan Dershowitz', 'Dershowitz', 'Mr Dershowitz') THEN 'Alan Dershowitz'
            ELSE regexp_replace(trim(full_name), '\\s+', ' ', 'g')
          END AS canonical_name,
          SUM(mentions)::bigint AS mentions,
          MAX(red_flag_rating)::int AS red_flag_rating,
          MAX(primary_role) AS primary_role,
          SUM(connection_count)::bigint AS connection_count
        FROM filtered
        GROUP BY 2
      )
      SELECT
        id,
        canonical_name AS name,
        primary_role AS role,
        'Person'::text AS type,
        red_flag_rating AS "riskLevel",
        connection_count AS "connectionCount",
        mentions
      FROM canonical_people
      WHERE mentions > 0
      ORDER BY "connectionCount" DESC, mentions DESC, name ASC
      LIMIT 100
    `);

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
      topConnectedLivePromise.then((r) => r.rows),
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
      const connections = Number(row?.connectionCount || row?.connection_count || 0);
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
      .sort(
        (a, b) =>
          Number(b?.connectionCount || b?.connection_count || 0) -
          Number(a?.connectionCount || a?.connection_count || 0),
      )
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
