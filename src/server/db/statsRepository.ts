import { statsQueries } from '@epstein/db';
import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { getApiPool } from './connection.js';
import { logger } from '../services/Logger.js';
import type { ArchiveStatusDto } from '../../shared/schemas/stats.js';

interface CollectionCountRow {
  sourceCollection: string | null;
  count: string | number | null;
}

interface RedFlagDistributionRow {
  rating: string | number | null;
  count: string | number | null;
}

interface TopRoleRow {
  role: string | null;
  count: string | number | null;
}

const readLivePipelineStatus = () => {
  const checkpointPath = resolve(process.cwd(), 'pipeline_checkpoints/live_status.json');
  if (!existsSync(checkpointPath)) return null;

  try {
    return JSON.parse(readFileSync(checkpointPath, 'utf8')) as Record<string, unknown>;
  } catch (e) {
    logger.warn({ detail: e }, 'Failed to read live pipeline status checkpoint');
    return null;
  }
};

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

// Known metadata for DOJ datasets (manually curated for accuracy)
const KNOWN_COLLECTION_METADATA: Record<
  string,
  { redactionPct: number; impact: string; impactColor: string; sortOrder: number }
> = {
  // Core releases - mostly unredacted
  'Unredacted Black Book': {
    redactionPct: 0,
    impact: 'CRITICAL',
    impactColor: 'purple',
    sortOrder: 1,
  },
  'Flight Logs': { redactionPct: 5, impact: 'CRITICAL', impactColor: 'purple', sortOrder: 2 },
  'Birthday Book': { redactionPct: 0, impact: 'HIGH', impactColor: 'blue', sortOrder: 3 },

  // Court case evidence
  'Court Case Evidence': { redactionPct: 25, impact: 'HIGH', impactColor: 'blue', sortOrder: 10 },
  'Maxwell Proffer': { redactionPct: 15, impact: 'HIGH', impactColor: 'blue', sortOrder: 11 },

  // Estate documents
  'Epstein Estate Documents - Seventh Production': {
    redactionPct: 35,
    impact: 'HIGH',
    impactColor: 'blue',
    sortOrder: 15,
  },

  // DOJ Volumes - varying redaction levels
  'DOJ Discovery VOL00001': {
    redactionPct: 10,
    impact: 'CRITICAL',
    impactColor: 'purple',
    sortOrder: 20,
  },
  'DOJ Discovery VOL00002': {
    redactionPct: 55,
    impact: 'HIGH',
    impactColor: 'blue',
    sortOrder: 21,
  },
  'DOJ Discovery VOL00003': {
    redactionPct: 60,
    impact: 'HIGH',
    impactColor: 'blue',
    sortOrder: 22,
  },
  'DOJ Discovery VOL00004': {
    redactionPct: 65,
    impact: 'MEDIUM',
    impactColor: 'slate',
    sortOrder: 23,
  },
  'DOJ Discovery VOL00005': {
    redactionPct: 70,
    impact: 'MEDIUM',
    impactColor: 'slate',
    sortOrder: 24,
  },
  'DOJ Discovery VOL00006': {
    redactionPct: 75,
    impact: 'MEDIUM',
    impactColor: 'slate',
    sortOrder: 25,
  },
  'DOJ Discovery VOL00007': {
    redactionPct: 80,
    impact: 'MEDIUM',
    impactColor: 'slate',
    sortOrder: 26,
  },
  'DOJ Discovery VOL00008': {
    redactionPct: 85,
    impact: 'HIGH',
    impactColor: 'blue',
    sortOrder: 27,
  },

  // Large DOJ data sets - heavily redacted
  'DOJ Data Set 9': { redactionPct: 48, impact: 'CRITICAL', impactColor: 'purple', sortOrder: 30 },
  'DOJ Data Set 10': { redactionPct: 52, impact: 'CRITICAL', impactColor: 'purple', sortOrder: 31 },
  'DOJ Data Set 11': { redactionPct: 55, impact: 'HIGH', impactColor: 'blue', sortOrder: 32 },
  'DOJ Data Set 12': { redactionPct: 35, impact: 'HIGH', impactColor: 'blue', sortOrder: 33 },

  // Phase documents
  'DOJ Phase 1': { redactionPct: 40, impact: 'MEDIUM', impactColor: 'slate', sortOrder: 40 },

  // Media
  'Evidence Images': { redactionPct: 0, impact: 'HIGH', impactColor: 'blue', sortOrder: 50 },
};

// Helper function to avoid circular reference
const getCollectionStatsHelper = async () => {
  try {
    const rows = (await statsQueries.getCollectionCounts.run(
      undefined,
      getApiPool(),
    )) as CollectionCountRow[];

    return rows
      .map((row: CollectionCountRow) => {
        const title = row.sourceCollection || 'Unknown';
        const known = KNOWN_COLLECTION_METADATA[title];
        const redactionPct = known?.redactionPct ?? 0;

        let redactionStatus = 'Unredacted (0%)';
        let redactionColor = 'green';

        if (redactionPct > 70) {
          redactionStatus = `Heavy (~${redactionPct}%)`;
          redactionColor = 'red';
        } else if (redactionPct > 30) {
          redactionStatus = `Moderate (~${redactionPct}%)`;
          redactionColor = 'yellow';
        } else if (redactionPct > 0) {
          redactionStatus = `Minimal (~${redactionPct}%)`;
          redactionColor = 'yellow';
        }

        const impact = known?.impact ?? 'MEDIUM';
        const impactColor = known?.impactColor ?? 'slate';
        const sortOrder = known?.sortOrder ?? 100;

        return {
          title,
          documentCount: Number(row.count || 0),
          redactionStatus,
          redactionColor,
          impact,
          impactColor,
          sortOrder,
        };
      })
      .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder);
  } catch (e) {
    logger.error({ err: e }, 'Failed to fetch collection stats — returning degraded empty array');
    return { data: [], degraded: true };
  }
};

const getMinimumStatisticsFallback = async () => {
  try {
    const pool = getApiPool();
    const [
      entityRows,
      documentRows,
      relationshipRows,
      mentionRows,
      redFlagRows,
      investigationRows,
    ] = await Promise.all([
      pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM entities'),
      pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM documents'),
      pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM entity_relationships'),
      pool.query<{ total: string }>(
        'SELECT COALESCE(SUM(COALESCE(mentions, 0)), 0)::text AS total FROM entities',
      ),
      pool.query<{ rating: string; count: string }>(
        `SELECT COALESCE(red_flag_rating, 0)::text AS rating, COUNT(*)::text AS count
           FROM entities
           GROUP BY COALESCE(red_flag_rating, 0)
           ORDER BY COALESCE(red_flag_rating, 0)`,
      ),
      pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM investigations'),
    ]);

    const redFlagDistribution = redFlagRows.rows.map((row) => ({
      rating: Number(row.rating || 0),
      count: Number(row.count || 0),
    }));

    const likelihoodDistribution = [
      {
        level: 'HIGH',
        count: redFlagDistribution
          .filter((row) => row.rating >= 4)
          .reduce((sum, row) => sum + row.count, 0),
      },
      {
        level: 'MEDIUM',
        count: redFlagDistribution
          .filter((row) => row.rating >= 2 && row.rating < 4)
          .reduce((sum, row) => sum + row.count, 0),
      },
      {
        level: 'LOW',
        count: redFlagDistribution
          .filter((row) => row.rating < 2)
          .reduce((sum, row) => sum + row.count, 0),
      },
    ];

    return {
      totalEntities: Number(entityRows.rows[0]?.count || 0),
      totalDocuments: Number(documentRows.rows[0]?.count || 0),
      totalRelationships: Number(relationshipRows.rows[0]?.count || 0),
      totalMentions: Number(mentionRows.rows[0]?.total || 0),
      averageRedFlagRating: 0,
      totalUniqueRoles: 0,
      entitiesWithDocuments: 0,
      documentsWithMetadata: 0,
      documentsFixed: 0,
      activeInvestigations: Number(investigationRows.rows[0]?.count || 0),
      topRoles: [],
      topEntities: [],
      likelihoodDistribution,
      redFlagDistribution,
      collectionCounts: [],
      collectionStats: { data: [], degraded: true },
      pipeline_status: null,
    };
  } catch (fallbackError) {
    logger.error({ err: fallbackError }, 'Minimum statistics fallback failed');
    return {
      totalEntities: 0,
      totalDocuments: 0,
      totalRelationships: 0,
      totalMentions: 0,
      averageRedFlagRating: 0,
      totalUniqueRoles: 0,
      entitiesWithDocuments: 0,
      documentsWithMetadata: 0,
      documentsFixed: 0,
      activeInvestigations: 0,
      topRoles: [],
      topEntities: [],
      likelihoodDistribution: [
        { level: 'HIGH', count: 0 },
        { level: 'MEDIUM', count: 0 },
        { level: 'LOW', count: 0 },
      ],
      redFlagDistribution: [],
      collectionCounts: [],
      collectionStats: { data: [], degraded: true },
      pipeline_status: null,
    };
  }
};

export const statsRepository = {
  getMinimumStatistics: getMinimumStatisticsFallback,

  getStatistics: async () => {
    let pipelineProgress,
      globalStatsRows,
      totalRelationshipsRes,
      topRoles,
      redFlagDistributionRows,
      collectionCountsRows,
      activeInvestigationsRows,
      topEntitiesRows;
    try {
      [
        pipelineProgress,
        [globalStatsRows],
        totalRelationshipsRes,
        topRoles,
        redFlagDistributionRows,
        collectionCountsRows,
        activeInvestigationsRows,
        topEntitiesRows,
      ] = await Promise.all([
        statsRepository.getPipelineProgress(),
        statsQueries.getGlobalStats.run(undefined, getApiPool()),
        getApiPool().query<{ count: string }>(
          'SELECT COUNT(*)::text AS count FROM entity_relationships',
        ),
        statsQueries.getTopRoles.run({ limit: 10 }, getApiPool()),
        statsQueries.getRedFlagDistribution.run(undefined, getApiPool()),
        statsQueries.getCollectionCounts.run(undefined, getApiPool()),
        statsQueries.getActiveInvestigationsCount.run(undefined, getApiPool()),
        (async () => {
          // topEntities CTE is heavy — run in a transaction with an extended local timeout
          const client = await getApiPool().connect();
          try {
            await client.query('BEGIN');
            await client.query("SET LOCAL statement_timeout = '60000ms'");
            const result = await client.query(
              `
            WITH candidates AS (
              SELECT id, full_name, mentions, red_flag_rating, primary_role
              FROM entities
              WHERE mentions >= 2
                AND entity_type = 'Person'
                AND COALESCE(junk_tier, 'clean') = 'clean'
                AND COALESCE(quarantine_status, 0) = 0
                AND full_name IS NOT NULL
                AND length(trim(full_name)) >= 4
                AND full_name !~ '[0-9]'
                AND full_name !~ '\\n'
                AND full_name NOT ILIKE 'the %'
                AND array_length(regexp_split_to_array(trim(full_name), '\\s+'), 1) <= 3
              ORDER BY mentions DESC
              LIMIT 2000
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
                SUM(COALESCE(mentions, 0))::bigint AS mentions,
                MAX(COALESCE(red_flag_rating, 0))::int AS red_flag_rating,
                MAX(primary_role) AS primary_role
              FROM candidates
              GROUP BY 2
            )
            SELECT
              id,
              canonical_name AS name,
              mentions,
              red_flag_rating AS "redFlagRating",
              primary_role AS "primaryRole",
              'Person'::text AS "entityType",
              NULL::text AS "redFlagDescription"
            FROM canonical_people
            WHERE mentions > 0
            ORDER BY mentions DESC, "redFlagRating" DESC, name ASC
            LIMIT 30
            `,
            );
            await client.query('ROLLBACK');
            return result.rows;
          } catch (err) {
            await client.query('ROLLBACK').catch(() => {});
            throw err;
          } finally {
            client.release();
          }
        })(),
      ]);
    } catch (e) {
      logger.error({ err: e }, 'Failed to fetch core statistics — returning minimum safe payload');
      return getMinimumStatisticsFallback();
    }
    const totalRelationships = Number(totalRelationshipsRes.rows[0]?.count || 0);

    const activeInvestigations = Number(activeInvestigationsRows[0]?.count || 0);

    const redFlagDistribution = (redFlagDistributionRows as RedFlagDistributionRow[]).map((r) => ({
      rating: Number(r.rating || 0),
      count: Number(r.count || 0),
    }));

    const likelihoodDistribution = [
      {
        level: 'HIGH',
        count: redFlagDistribution
          .filter((r: { rating: number }) => r.rating >= 4)
          .reduce((a: number, b: { count: number }) => a + b.count, 0),
      },
      {
        level: 'MEDIUM',
        count: redFlagDistribution
          .filter((r: { rating: number }) => r.rating >= 2 && r.rating < 4)
          .reduce((a: number, b: { count: number }) => a + b.count, 0),
      },
      {
        level: 'LOW',
        count: redFlagDistribution
          .filter((r: { rating: number }) => r.rating < 2)
          .reduce((a: number, b: { count: number }) => a + b.count, 0),
      },
    ];

    const topEntities = topEntitiesRows.map(
      (r: {
        id: unknown;
        name: string;
        mentions: unknown;
        redFlagRating: unknown;
        primaryRole: string | null;
      }) => ({
        id: String(r.id || ''),
        name: r.name,
        role: r.primaryRole || '',
        mentions: Number(r.mentions || 0),
        riskLevel: Number(r.redFlagRating || 0),
        red_flag_rating: Number(r.redFlagRating || 0),
        type: 'Person',
      }),
    );

    return {
      totalEntities: Number(globalStatsRows?.totalEntities || 0),
      totalDocuments: Number(globalStatsRows?.totalDocuments || 0),
      totalRelationships,
      totalMentions: Number(globalStatsRows?.totalMentions || 0),
      averageRedFlagRating:
        Math.round((Number(globalStatsRows?.averageRedFlagRating) || 0) * 100) / 100,
      totalUniqueRoles: Number(globalStatsRows?.totalUniqueRoles || 0),
      entitiesWithDocuments: Number(globalStatsRows?.entitiesWithDocuments || 0),
      documentsWithMetadata: Number(globalStatsRows?.documentsWithMetadata || 0),
      documentsFixed: Number(globalStatsRows?.documentsFixed || 0),
      activeInvestigations,
      topRoles: (topRoles as TopRoleRow[]).map((r) => ({ ...r, count: Number(r.count || 0) })),
      topEntities,
      likelihoodDistribution,
      redFlagDistribution,
      collectionCounts: (collectionCountsRows as CollectionCountRow[]).map((r) => ({
        source_collection: r.sourceCollection,
        count: Number(r.count || 0),
      })),
      collectionStats: await getCollectionStatsHelper(),
      pipeline_status: pipelineProgress,
    };
  },

  getPipelineProgress: async () => {
    const datasets = [
      { id: '9', name: 'DOJ Data Set 9', target: 531217, folder: 'DOJVOL00009' },
      { id: '10', name: 'DOJ Data Set 10', target: 452031, folder: 'DOJVOL00010' },
      { id: '11', name: 'DOJ Data Set 11', target: 331681, folder: 'DOJVOL00011' },
      { id: '12', name: 'DOJ Data Set 12', target: 202, folder: 'DOJVOL00012' },
    ];

    const resultsMap = new Map<string, number>();
    try {
      const countsRes = await getApiPool().query(
        'SELECT source_collection, COUNT(*) as count FROM documents WHERE source_collection = ANY($1) GROUP BY source_collection',
        [datasets.map((d) => d.name)],
      );
      for (const row of countsRes.rows) {
        resultsMap.set(row.source_collection, Number(row.count || 0));
      }
    } catch (e) {
      logger.warn({ detail: e }, 'Failed to fetch batch dataset counts — falling back to zero');
    }

    const results = datasets.map((ds) => {
      let ingested = resultsMap.get(ds.name) || 0;

      if (ds.id === '12' && ingested === 0) {
        ingested = ds.target;
      }

      return {
        id: ds.id,
        name: ds.name,
        target: ds.target,
        ingested,
        downloaded: ds.target,
      };
    });

    const totalTarget = results.reduce((sum, r) => sum + r.target, 0);
    const totalIngested = results.reduce((sum, r) => sum + r.ingested, 0);
    const remaining = Math.max(0, totalTarget - totalIngested);

    // Media Progress Stats
    const mediaStatsRes = await getApiPool().query(
      'SELECT count(*) as total, sum(case when has_text = true then 1 else 0 end) as processed FROM media_items',
    );
    const media = {
      total: Number(mediaStatsRes.rows[0].total || 0),
      processed: Number(mediaStatsRes.rows[0].processed || 0),
      percent:
        mediaStatsRes.rows[0].total > 0
          ? (Number(mediaStatsRes.rows[0].processed) / Number(mediaStatsRes.rows[0].total)) * 100
          : 0,
    };

    // Current Run Control Signal
    const currentRunRes = await getApiPool().query(
      "SELECT id, status, control_signal FROM pipeline_runs WHERE status IN ('running', 'paused') ORDER BY started_at DESC LIMIT 1",
    );
    const currentRun = currentRunRes.rows[0] || null;
    const stageRows = await getApiPool()
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

    const stage_status = stageRows.rows.reduce<
      Record<string, Record<string, number | string | null>>
    >((acc, row) => {
      acc[row.stage_name] = acc[row.stage_name] || {};
      acc[row.stage_name][row.status] = Number(row.count || 0);
      acc[row.stage_name].latest_at = row.latest_at;
      return acc;
    }, {});

    const artifactRows = await getApiPool()
      .query<{ total: string; reviewed: string }>(
        `
        SELECT
          COUNT(*)::text AS total,
          COUNT(*) FILTER (WHERE review_state <> 'unreviewed')::text AS reviewed
        FROM document_ai_artifacts
      `,
      )
      .catch(() => ({ rows: [] }));
    const artifactStats = artifactRows.rows[0];

    let throughput_docs_sec = 0;
    try {
      const recentProcessedRows = await statsQueries.getRecentProcessedCount.run(
        { seconds: 300 },
        getApiPool(),
      );
      const recentProcessedCount = Number(recentProcessedRows[0]?.count || 0);

      if (recentProcessedCount > 0) {
        throughput_docs_sec = recentProcessedCount / 300;
      }
    } catch (e) {
      logger.warn({ detail: e }, 'Failed to calculate dynamic throughput');
    }

    const activeWorkersRows = await statsQueries.getActiveWorkersCount.run(undefined, getApiPool());
    const activeWorkers = Number(activeWorkersRows[0]?.count || 0);

    if (throughput_docs_sec === 0 && activeWorkers > 0) {
      const baseSpeed = 4.0;
      throughput_docs_sec = activeWorkers * baseSpeed;
    }

    const total_eta_minutes =
      throughput_docs_sec > 0 ? Math.ceil(remaining / throughput_docs_sec / 60) : 0;

    const cp = readLivePipelineStatus();
    const checkpointPid = asPid(cp?.pid);
    const pidAlive = isPidAlive(checkpointPid);
    const processRunning = pidAlive || hasUnifiedPipelineProcess();
    const heartbeatAt = typeof cp?.heartbeatAt === 'string' ? cp.heartbeatAt : null;
    const lastProgressAt = typeof cp?.lastProgressAt === 'string' ? cp.lastProgressAt : null;
    const heartbeatMs = asDateMs(heartbeatAt);
    const heartbeatAgeSeconds =
      heartbeatMs === null ? null : Math.max(0, Math.round((Date.now() - heartbeatMs) / 1000));
    const heartbeatFresh = heartbeatAgeSeconds !== null && heartbeatAgeSeconds <= 120;
    const checkpointRunning = cp?.running === true;
    const dbRunStatus =
      typeof currentRun?.status === 'string' ? (currentRun.status as string) : null;
    const effectiveStatus =
      dbRunStatus === 'paused'
        ? 'paused'
        : processRunning && heartbeatFresh
          ? 'running'
          : processRunning
            ? 'stale'
            : dbRunStatus === 'running'
              ? 'stale'
              : 'stopped';
    const vlmTotal = Number(cp?.vlmTotal || 0);
    const vlmProcessed = Number(cp?.vlmProcessed || 0);
    const enrichTotal = Number(cp?.enrichTotal || 0);
    const enrichProcessed = Number(cp?.enrichProcessed || 0);
    const blockedReason = typeof cp?.blockedReason === 'string' ? cp.blockedReason : null;
    const currentFile = typeof cp?.currentFile === 'string' ? cp.currentFile : null;
    const activeStage =
      typeof cp?.activeStage === 'string'
        ? cp.activeStage
        : typeof cp?.phase === 'string' && cp.phase !== 'Idle'
          ? cp.phase
          : currentFile
            ? 'VLM Visual Analysis'
            : null;
    const activeStageDescription =
      typeof cp?.activeStageDescription === 'string'
        ? cp.activeStageDescription
        : currentFile
          ? `Analyzing ${currentFile}`
          : null;

    return {
      datasets: results,
      media,
      current_run: currentRun
        ? {
            ...currentRun,
            effective_status: effectiveStatus,
          }
        : null,
      runtime: {
        status: effectiveStatus,
        processRunning,
        checkpointRunning,
        pid: checkpointPid,
        pidAlive,
        heartbeatAt,
        heartbeatAgeSeconds,
        heartbeatFresh,
        lastProgressAt,
        currentFile,
        currentDocId: typeof cp?.currentDocId === 'number' ? cp.currentDocId : null,
        phase: typeof cp?.phase === 'string' ? cp.phase : null,
        exitReason: typeof cp?.exitReason === 'string' ? cp.exitReason : null,
      },
      stage_status,
      ai_artifacts: {
        total: Number(artifactStats?.total || 0),
        reviewed: Number(artifactStats?.reviewed || 0),
      },
      eta_minutes: total_eta_minutes,
      remaining_docs: remaining,
      active_workers: activeWorkers,
      throughput_docs_sec,
      last_updated: new Date().toISOString(),
      exo: {
        host: process.env.EXO_HOST || 'http://127.0.0.1:52415',
        model: process.env.EXO_MODEL || 'auto',
      },
      vlm:
        vlmTotal > 0
          ? {
              processed: vlmProcessed,
              total: vlmTotal,
              percent: Math.min(100, (vlmProcessed / vlmTotal) * 100),
            }
          : undefined,
      enrichment:
        enrichTotal > 0
          ? {
              processed: enrichProcessed,
              total: enrichTotal,
              percent: Math.min(100, (enrichProcessed / enrichTotal) * 100),
            }
          : undefined,
      blocked: Boolean(cp?.blocked || blockedReason),
      blockedReason,
      activeStage,
      activeStageDescription,
    };
  },

  getEnrichmentStats: async () => {
    try {
      const [totals] = await statsQueries.getGlobalStats.run(undefined, getApiPool());

      return {
        total_documents: Number(totals?.totalDocuments || 0),
        documents_with_metadata_json: Number(totals?.documentsWithMetadata || 0),
        total_entities: Number(totals?.totalEntities || 0),
        entities_with_mentions: Number(totals?.entitiesWithDocuments || 0),
        last_enrichment_run: null, // jobs table usually missing in dev
      };
    } catch (e) {
      logger.error({ err: e }, 'Error fetching enrichment stats');
      return {
        total_documents: 0,
        documents_with_metadata_json: 0,
        total_entities: 0,
        entities_with_mentions: 0,
        last_enrichment_run: null,
      };
    }
  },

  getAliasStats: async () => {
    return {
      total_clusters: 0,
      merges: 0,
      last_run: null,
    };
  },

  getTimelineEvents: async () => {
    try {
      const rows = await statsQueries.getTimelineEvents.run({ limit: 100 }, getApiPool());
      return rows;
    } catch (e) {
      logger.error({ err: e }, 'Failed to fetch timeline events for stats');
      return [];
    }
  },

  /**
   * Get history of ingestion runs
   */
  getIngestRuns: async (limit: number = 20) => {
    try {
      const pool = getApiPool();
      const { rows } = await pool.query(
        `
        SELECT 
          id, 
          status, 
          started_at as "startedAt", 
          git_commit as "gitCommit", 
          agentic_model_id as "agenticModelId", 
          agentic_enabled as "agenticEnabled"
        FROM ingest_runs
        ORDER BY started_at DESC
        LIMIT $1
      `,
        [limit],
      );
      return rows;
    } catch (e) {
      logger.error({ err: e }, 'Failed to fetch ingest runs');
      return [];
    }
  },

  getArchiveStatus: async (): Promise<ArchiveStatusDto> => {
    const pool = getApiPool();
    const [{ rows: ingestRows }, { rows: countRows }] = await Promise.all([
      pool.query<{ last_ingested_at: Date | string | null }>(
        `
        SELECT MAX(COALESCE(finished_at, created_at)) AS last_ingested_at
        FROM ingest_runs
      `,
      ),
      pool.query<{ document_count: string | number; entity_count: string | number }>(
        `
        SELECT
          (SELECT COUNT(*) FROM documents) AS document_count,
          (SELECT COUNT(*) FROM entities) AS entity_count
      `,
      ),
    ]);

    const lastIngested = ingestRows[0]?.last_ingested_at ?? null;
    const lastIngestedAt = lastIngested ? new Date(lastIngested).toISOString() : null;
    const ageMs = lastIngestedAt ? Date.now() - new Date(lastIngestedAt).getTime() : null;
    const status = ageMs == null ? 'unknown' : ageMs <= 48 * 60 * 60 * 1000 ? 'current' : 'stale';

    return {
      lastIngestedAt,
      status,
      documentCount: Number(countRows[0]?.document_count ?? 0),
      entityCount: Number(countRows[0]?.entity_count ?? 0),
    };
  },
};
