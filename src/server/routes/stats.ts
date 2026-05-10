import express from 'express';
import { statsRepository } from '../db/statsRepository.js';
import { getMigrationMetrics } from '../db/runtime.js';
import {
  getCriticalTableCounts,
  getCurrentDatabaseSizeBytes,
  getDatabaseMetadata,
  getEntityAndDocumentCounts,
  getSampleEntityWithMentions,
  pingDatabase,
} from '../db/healthQueries.js';
import { BackupService } from '../services/BackupService.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { authenticateRequest, requireRole } from '../auth/middleware.js';
import { logger } from '../services/Logger.js';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { mapStatsDto, RawStatsRow } from '../mappers/statsDtoMapper.js';

const router = express.Router();
const execFileAsync = promisify(execFile);
const READINESS_TIMEOUT_MS = Math.max(
  100,
  Number.parseInt(process.env.READINESS_TIMEOUT_MS ?? '250', 10) || 250,
);

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
    const stats = await statsRepository.getStatistics();
    res.json(mapStatsDto(stats as unknown as RawStatsRow));
  } catch (e) {
    next(e);
  }
});

// Health check endpoint - Basic
router.get('/health', async (_req, res) => {
  let dbStatus = 'not_initialized';
  let stats = { entities: 0, documents: 0 };

  try {
    await pingDatabase();
    dbStatus = 'connected';
    stats = await getEntityAndDocumentCounts();
  } catch (e) {
    dbStatus = 'error';
    logger.error({ err: e }, 'Health check DB error');
  }

  const healthCheck = {
    status: dbStatus === 'connected' && stats.entities > 0 ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
    data: stats,
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
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
    const timeoutMs = soft ? 5000 : READINESS_TIMEOUT_MS;
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
  } catch (e: unknown) {
    const isTimeout = e instanceof Error && e.message === 'timeout';
    const errMessage = e instanceof Error ? e.message : 'Unknown error';
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
        db: { ok: false, error: isTimeout ? 'DB ping timeout' : errMessage },
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
    } catch (e: unknown) {
      checks.database_connection = {
        status: 'fail',
        message: `DB connection failed: ${e instanceof Error ? e.message : String(e)}`,
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
    } catch (e: unknown) {
      checks.query_execution = {
        status: 'fail',
        message: `Query failed: ${e instanceof Error ? e.message : String(e)}`,
      };
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
    } catch (e: unknown) {
      checks.database_size = {
        status: 'warn',
        message: `Could not check Postgres DB size: ${e instanceof Error ? e.message : String(e)}`,
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
    } catch (e: unknown) {
      checks.backup_status = {
        status: 'warn',
        message: `Backup check failed: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  } catch (e: unknown) {
    checks.fatal_error = {
      status: 'fail',
      message: `Health check crashed: ${e instanceof Error ? e.message : String(e)}`,
    };
    overallStatus = 'critical';
  }

  const totalDuration = Date.now() - startTime;

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    totalCheckDuration: `${totalDuration}ms`,
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || 'unknown',
    checks,
  };

  const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
  res.status(httpStatus).json(response);
});

// Manual Ingestion Control
router.post(
  '/pipeline/control',
  authenticateRequest,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { runId, signal } = req.body;
      if (!runId || !['pause', 'resume', 'stop'].includes(signal)) {
        return res.status(400).json({ error: 'Invalid runId or signal' });
      }

      const { PipelineService } = await import('../services/pipelineService.js');
      await PipelineService.setControlSignal(Number(runId), signal);

      // If signal is resume, also set status back to running immediately
      if (signal === 'resume') {
        await PipelineService.updateRunStatus(Number(runId), 'running');
        await PipelineService.setControlSignal(Number(runId), null);
      }

      res.json({ success: true, signal });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/ingestion/process',
  authenticateRequest,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { action } = req.body as { action?: unknown };
      const a = typeof action === 'string' ? action : '';
      if (!['start', 'stop', 'restart'].includes(a)) {
        return res.status(400).json({ error: 'Invalid action' });
      }

      const args =
        a === 'start'
          ? ['start', 'ecosystem.config.cjs', '--only', 'ingest-intelligence', '--update-env']
          : a === 'stop'
            ? ['stop', 'ingest-intelligence']
            : ['restart', 'ingest-intelligence'];

      const { stdout } = await execFileAsync('pm2', args, {
        cwd: process.cwd(),
        timeout: 20_000,
      });

      res.json({ success: true, action: a, output: String(stdout || '').trim() });
    } catch (e) {
      next(e);
    }
  },
);

router.get(
  '/ingestion/status',
  authenticateRequest,
  requireRole('admin'),
  async (_req, res, next) => {
    try {
      const { stdout } = await execFileAsync('pm2', ['jlist'], { timeout: 10_000 });

      let list: unknown[] = [];
      try {
        list = JSON.parse(String(stdout || '[]'));
      } catch {
        list = [];
      }

      const rawProc =
        list.find((p) => (p as Record<string, unknown>)?.name === 'ingest-intelligence') || null;
      const proc = rawProc as Record<string, unknown> | null;
      const pm2Env =
        proc && typeof proc.pm2_env === 'object' && proc.pm2_env !== null
          ? (proc.pm2_env as Record<string, unknown>)
          : null;
      const monit =
        proc && typeof proc.monit === 'object' && proc.monit !== null
          ? (proc.monit as Record<string, unknown>)
          : null;

      const pipeline = await statsRepository.getPipelineProgress();
      res.json({
        process: proc
          ? {
              name: String(proc.name || 'ingest-intelligence'),
              pid: typeof proc.pid === 'number' ? proc.pid : null,
              pmId: typeof proc.pm_id === 'number' ? proc.pm_id : null,
              status: typeof pm2Env?.status === 'string' ? pm2Env.status : 'unknown',
              restarts: typeof pm2Env?.restart_time === 'number' ? pm2Env.restart_time : null,
              uptime:
                typeof pm2Env?.pm_uptime === 'number'
                  ? new Date(pm2Env.pm_uptime).toISOString()
                  : null,
              memoryBytes: typeof monit?.memory === 'number' ? monit.memory : null,
              cpuPercent: typeof monit?.cpu === 'number' ? monit.cpu : null,
            }
          : null,
        pipeline,
      });
    } catch (e) {
      next(e);
    }
  },
);

/**
 * GET /api/stats/backups
 * Returns list of database backup snapshots.
 */
router.get('/backups', authenticateRequest, requireRole('admin'), async (_req, res, next) => {
  try {
    const backups = BackupService.listBackups();
    res.json(backups);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/stats/backups/trigger
 * Triggers a new zero-downtime database snapshot.
 */
router.post(
  '/backups/trigger',
  authenticateRequest,
  requireRole('admin'),
  async (_req, res, next) => {
    try {
      const result = await BackupService.createBackup();
      res.json({ success: true, backup: result });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/stats/ingest-runs
 * Returns history of ingestion runs.
 */
router.get('/ingest-runs', authenticateRequest, requireRole('admin'), async (_req, res, next) => {
  try {
    const runs = await statsRepository.getIngestRuns(20);
    res.json(runs);
  } catch (error) {
    next(error);
  }
});

export default router;
