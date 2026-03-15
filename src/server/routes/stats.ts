import { Router } from 'express';
import { statsRepository } from '../db/statsRepository.js';
import { getApiPool } from '../db/connection.js';
import { getMigrationMetrics } from '../db/runtime.js';
import { config } from '../../config/index.js';
import {
  getCriticalTableCounts,
  getCurrentDatabaseSizeBytes,
  getDatabaseMetadata,
  getEntityAndDocumentCounts,
  getSampleEntityWithMentions,
  pingDatabase,
} from '../db/routesDb.js';
import { ingestRunsRepository } from '../db/ingestRunsRepository.js';
import { BackupService } from '../services/BackupService.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { authenticateRequest } from '../auth/middleware.js';

const router = Router();

function withSafeStatsContract(input: any) {
  const source = input || {};
  const existing = Array.isArray(source.likelihoodDistribution)
    ? source.likelihoodDistribution
    : [];
  const byLevel = new Map<string, { count?: number }>(
    existing.map((entry: any) => [
      String(entry?.level || ''),
      { count: Number(entry?.count || 0) },
    ]),
  );

  const safeLikelihoodDistribution = ['HIGH', 'MEDIUM', 'LOW'].map((level) => ({
    level,
    count: Number(byLevel.get(level)?.count || 0),
  }));

  return {
    totalEntities: Number(source.totalEntities || 0),
    totalDocuments: Number(source.totalDocuments || 0),
    totalRelationships: Number(source.totalRelationships || 0),
    totalMentions: Number(source.totalMentions || 0),
    averageRedFlagRating: Number(source.averageRedFlagRating || 0),
    totalUniqueRoles: Number(source.totalUniqueRoles || 0),
    entitiesWithDocuments: Number(source.entitiesWithDocuments || 0),
    documentsWithMetadata: Number(source.documentsWithMetadata || 0),
    documentsFixed: Number(source.documentsFixed || 0),
    activeInvestigations: Number(source.activeInvestigations || 0),
    topRoles: Array.isArray(source.topRoles) ? source.topRoles : [],
    topEntities: Array.isArray(source.topEntities) ? source.topEntities : [],
    likelihoodDistribution: safeLikelihoodDistribution,
    redFlagDistribution: Array.isArray(source.redFlagDistribution)
      ? source.redFlagDistribution
      : [],
    collectionCounts: Array.isArray(source.collectionCounts) ? source.collectionCounts : [],
    collectionStats: Array.isArray(source.collectionStats) ? source.collectionStats : [],
    pipeline_status: source.pipeline_status || null,
  };
}

// ── /meta/db ─── Canary endpoint: database dialect, version, timeouts, pool stats
router.get('/meta/db', authenticateRequest, async (_req, res, next) => {
  try {
    const rows = await getDatabaseMetadata();
    const metrics = await getMigrationMetrics();
    res.json({
      dialect: 'postgres',
      server_version: rows[0]?.server_version,
      statement_timeout: rows[0]?.statement_timeout,
      lock_timeout: rows[0]?.lock_timeout,
      pools: metrics.pools,
    });
  } catch (error) {
    next(error);
  }
});

// Public Stats Endpoint (for About page)
// Cache for 5 minutes (300 seconds)
router.get('/', cacheMiddleware(300), async (_req, res, next) => {
  try {
    const stats = statsRepository.getStatistics();
    res.json(withSafeStatsContract(await stats));
  } catch (e) {
    next(e);
  }
});

// Health check endpoint - Basic
router.get('/health', async (_req, res) => {
  let dbStatus = 'not_initialized';
  let stats = { entities: 0, documents: 0 };

  try {
    const pool = getApiPool();
    await pool.query('SELECT 1');
    dbStatus = 'connected';
    stats = await getEntityAndDocumentCounts();
  } catch (e) {
    dbStatus = 'error';
    console.error('Health check DB error:', e);
  }

  const healthCheck = {
    status: dbStatus === 'connected' && stats.entities > 0 ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
    data: stats,
    memory: process.memoryUsage(),
    environment: config.nodeEnv,
  };

  res.status(healthCheck.status === 'healthy' ? 200 : 503).json(healthCheck);
});

// Readiness Check — fast O(1) ping; add ?soft=1 for richer checks+data payload
router.get('/health/ready', async (req, res) => {
  const soft = req.query.soft === '1';
  const start = Date.now();
  try {
    const pingStart = Date.now();
    const pingPromise = pingDatabase();
    const timeoutMs = soft ? 5000 : 50;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), timeoutMs),
    );

    await Promise.race([pingPromise, timeoutPromise]);
    const latencyMs = Date.now() - pingStart;

    if (!soft) {
      return res.status(200).json({ status: 'ready' });
    }

    // Soft mode: also fetch entity/document counts for footer health widget
    let dataCounts = { entities: 0, documents: 0 };
    let dataOk = false;
    try {
      dataCounts = await getEntityAndDocumentCounts();
      dataOk = dataCounts.entities > 0 && dataCounts.documents > 0;
    } catch {
      // non-fatal — DB is reachable, data counts unavailable
    }

    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
      checks: {
        db: { ok: true, latencyMs },
        data: { ok: dataOk, ...dataCounts },
      },
    });
  } catch (e: any) {
    const isTimeout = e.message === 'timeout';
    if (!soft) {
      return res.status(503).json({
        status: 'degraded',
        error: isTimeout ? 'DB ping timeout' : 'DB error',
      });
    }
    return res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
      checks: {
        db: { ok: false, error: isTimeout ? 'DB ping timeout' : e.message },
      },
    });
  }
});

// Deep health check
router.get('/health/deep', async (_req, res) => {
  const checks: Record<
    string,
    { status: 'pass' | 'fail' | 'warn'; message: string; duration?: number }
  > = {};
  let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';

  const startTime = Date.now();
  try {
    // 1. Database connection check
    const dbStart = Date.now();
    try {
      await pingDatabase();
      checks.database_connection = {
        status: 'pass',
        message: 'Database connected',
        duration: Date.now() - dbStart,
      };
    } catch (e: any) {
      checks.database_connection = {
        status: 'fail',
        message: `DB connection failed: ${e.message}`,
      };
      overallStatus = 'critical';
    }

    checks.database_integrity = { status: 'pass', message: 'N/A (postgres)' };

    // 3. Critical tables exist and have data
    const criticalTables = [
      'entities',
      'documents',
      'entity_relationships',
      'investigations',
      'black_book_entries',
    ];
    const tableCounts = await getCriticalTableCounts(criticalTables);
    for (const table of criticalTables) {
      const tableStart = Date.now();
      const info = tableCounts[table];
      if (info.ok && info.count > 0) {
        checks[`table_${table}`] = {
          status: 'pass',
          message: `${info.count} rows`,
          duration: Date.now() - tableStart,
        };
      } else if (info.ok) {
        checks[`table_${table}`] = {
          status: 'warn',
          message: 'Table empty',
          duration: Date.now() - tableStart,
        };
        if (overallStatus === 'healthy') overallStatus = 'degraded';
      } else {
        checks[`table_${table}`] = {
          status: 'fail',
          message: `Table check failed: ${info.error}`,
        };
        overallStatus = 'critical';
      }
    }

    // 4. Test a real query
    const queryStart = Date.now();
    try {
      const entity = await getSampleEntityWithMentions();
      if (entity) {
        checks.query_execution = {
          status: 'pass',
          message: 'Query executed successfully',
          duration: Date.now() - queryStart,
        };
      } else {
        checks.query_execution = { status: 'warn', message: 'No entities with mentions found' };
      }
    } catch (e: any) {
      checks.query_execution = { status: 'fail', message: `Query failed: ${e.message}` };
      overallStatus = 'critical';
    }

    checks.journal_mode = { status: 'pass', message: 'N/A (postgres)' };

    // 6. Memory check
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const heapPercentage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
    if (heapPercentage > 90) {
      checks.memory = {
        status: 'warn',
        message: `High memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapPercentage}%)`,
      };
      if (overallStatus === 'healthy') overallStatus = 'degraded';
    } else {
      checks.memory = {
        status: 'pass',
        message: `${heapUsedMB}MB / ${heapTotalMB}MB (${heapPercentage}%)`,
      };
    }

    // 7. Database size check (Postgres)
    try {
      const sizeBytes = await getCurrentDatabaseSizeBytes();
      if (typeof sizeBytes === 'number') {
        const dbSizeMB = Math.round(sizeBytes / 1024 / 1024);
        checks.database_size = { status: 'pass', message: `${dbSizeMB} MB` };
      } else {
        checks.database_size = {
          status: 'warn',
          message: 'Could not determine Postgres database size',
        };
      }
    } catch (e: any) {
      checks.database_size = {
        status: 'warn',
        message: `Could not check Postgres DB size: ${e.message}`,
      };
    }

    // 8. FTS Integrity Check (REMOVED - Postgres handles FTS internally)
    // const ftsStart = Date.now();
    // try { ... }

    // 9. Backup Status
    try {
      const backups = BackupService.listBackups();
      if (backups.length > 0) {
        const latest = new Date(backups[0].createdAt);
        const hoursOld = (Date.now() - latest.getTime()) / 1000 / 3600;
        checks.backup_status = {
          status: hoursOld < 48 ? 'pass' : 'warn',
          message: `Latest backup: ${Math.round(hoursOld)}h ago`,
        };
      } else {
        checks.backup_status = { status: 'warn', message: 'No backups found' };
      }
    } catch (e: any) {
      checks.backup_status = { status: 'warn', message: `Backup check failed: ${e.message}` };
    }
  } catch (e: any) {
    checks.fatal_error = { status: 'fail', message: `Health check crashed: ${e.message}` };
    overallStatus = 'critical';
  }

  const totalDuration = Date.now() - startTime;

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    totalCheckDuration: `${totalDuration}ms`,
    environment: config.nodeEnv,
    version: process.env.npm_package_version || 'unknown',
    checks,
  };

  const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
  res.status(httpStatus).json(response);
});

// --- ADMIN OPS ENDPOINTS (Phase 4) ---

// Get Ingestion History
router.get('/ingest-runs', authenticateRequest, async (_req, res, next) => {
  try {
    const runs = ingestRunsRepository.getRuns(50);
    res.json(runs);
  } catch (e) {
    next(e);
  }
});

// List Backups
router.get('/backups', authenticateRequest, async (_req, res, next) => {
  try {
    const backups = BackupService.listBackups();
    res.json(backups);
  } catch (e) {
    next(e);
  }
});

// Trigger Manual Backup
router.post('/backups/trigger', authenticateRequest, async (_req, res, next) => {
  try {
    const path = await BackupService.createBackup();
    res.json({ success: true, path });
  } catch (e) {
    next(e);
  }
});

export default router;
