import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import toobusy from 'toobusy-js';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { logger } from './server/services/Logger.js';
import { requestIdMiddleware } from './server/middleware/requestId.js';
import { globalErrorHandler } from './server/utils/errorHandler.js';
import {
  initPools,
  assertProductionPg,
  getApiPool,
  getMigrationMetrics,
} from './server/db/connection.js';
import { validateStartup } from './server/utils/startupValidation.js';
import { runMigrations } from './server/db/migrator.js';
import { getEntityAndDocumentCounts } from './server/db/routesDb.js';
import type { SearchFilters, SortOption } from './types.js';

// Route imports
import authRoutes from './server/auth/routes.js';
import {
  authenticateRequest,
  optionalAuthenticate,
  requireRole,
} from './server/auth/middleware.js';
import statsRoutes from './server/routes/stats.js';
import relationshipsRoutes from './server/routes/relationships.js';
import analyticsRoutes from './server/routes/analytics.js';
import graphRoutes from './server/routes/graphRoutes.js';
import mapRoutes from './server/routes/mapRoutes.js';
import mediaRoutes from './server/routes/mediaRoutes.js';
import usersRoutes from './server/routes/users.js';
import investigationEvidenceRoutes from './server/routes/investigationEvidenceRoutes.js';
import investigationsRouter from './server/routes/investigations.js';
import evidenceRoutes from './server/routes/evidenceRoutes.js';
import advancedAnalyticsRoutes from './server/routes/advancedAnalytics.js';
import entityEvidenceRoutes from './server/routes/entityEvidenceRoutes.js';
import investigativeTasksRoutes from './server/routes/investigativeTasks.js';
import articlesRoutes from './server/routes/articlesRoutes.js';
import emailRoutes from './server/routes/emailRoutes.js';
import financialRoutes from './server/routes/financialRoutes.js';
import forensicRoutes from './server/routes/forensicRoutes.js';
import documentsRoutes from './server/routes/documentsRoutes.js';
import timelineRoutes from './server/routes/timelineRoutes.js';
import flightsRoutes from './server/routes/flightsRoutes.js';
import propertiesRoutes from './server/routes/propertiesRoutes.js';
import blackBookRoutes from './server/routes/blackBookRoutes.js';
import faceRoutes from './server/routes/faceRoutes.js';
import { entitiesRepository } from './server/db/entitiesRepository.js';
import { mediaRepository } from './server/db/mediaRepository.js';
import {
  mapEntityDetailDto,
  mapEntityListResponseDto,
  mapSubjectsListResponseDto,
} from './server/mappers/entitiesDtoMapper.js';
import { validate, subjectsQuerySchema } from './server/middleware/validate.js';
import { purgeCache } from './server/middleware/cache.js';
import { pgSaturationShed } from './server/middleware/pgShed.js';
import { retryStormDetector } from './server/middleware/retryStorm.js';
import { queryCounter } from './server/queryCounter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_INDEX_PATH = path.join(__dirname, '../dist/index.html');
let cachedIndexTemplate: string | null = null;

export class App {
  public app: Express;

  constructor() {
    this.app = express();
  }

  public async init() {
    await this.initializeDatabase();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private async initializeDatabase() {
    initPools();
    assertProductionPg();

    // Validate environment (throws on failure)
    try {
      await validateStartup();
    } catch (error) {
      logger.error({ err: error }, 'Startup validation failed');
      process.exit(1);
    }

    if (process.env.RUN_MIGRATIONS_ON_BOOT === '1') {
      try {
        await runMigrations();
        logger.info('Database migrations completed');
      } catch (error) {
        logger.error({ err: error }, 'Failed to run migrations');
        process.exit(1);
      }
    } else {
      logger.info('Skipping database migrations on boot');
    }
  }

  private initializeMiddleware() {
    const isProduction = process.env.NODE_ENV === 'production';
    const scriptSrc = isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'", "'unsafe-eval'"];

    // Respect real client IP from upstream proxy (nginx) so rate limits are per-user, not global.
    this.app.set('trust proxy', 1);

    // 1. Core Security & Performance
    this.app.use(requestIdMiddleware);
    this.app.use((req, res, next) => {
      const requestId = req.requestId;
      if (!requestId) {
        next();
        return;
      }
      queryCounter.clear(requestId);
      res.on('finish', () => {
        const endpoint = queryCounter.endpointForRequest(req.method, req.originalUrl || req.url);
        if (!endpoint) {
          queryCounter.clear(requestId);
          return;
        }
        const budgetCheck = queryCounter.checkBudget(endpoint, requestId);
        if (!budgetCheck.passed) {
          logger.warn(
            {
              requestId,
              endpoint,
              queryCount: budgetCheck.count,
              queryBudget: budgetCheck.budget,
            },
            '[QUERY_BUDGET_EXCEEDED]',
          );
        }
        queryCounter.clear(requestId);
      });
      next();
    });

    // 1b. Structured HTTP access logging
    this.app.use(
      pinoHttp({
        logger,
        autoLogging: {
          ignore: (req) => {
            const url = (req as Request & { originalUrl?: string }).originalUrl || req.url || '';
            return url === '/api/health' || url === '/api/ready' || url.startsWith('/api/health/');
          },
        },
        customLogLevel: (_req, res, err) => {
          if (res.statusCode >= 500 || err) return 'error';
          if (res.statusCode >= 400) return 'warn';
          return 'info';
        },
        serializers: {
          req: (req) => ({
            method: req.method,
            url: req.url,
            remoteAddress: req.remoteAddress,
          }),
          res: (res) => ({ statusCode: res.statusCode }),
        },
      }),
    );
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc,
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'blob:'],
            fontSrc: ["'self'", 'data:'],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
          },
        },
        crossOriginEmbedderPolicy: false,
      }),
    );
    this.app.use(
      cors({
        origin: (origin, callback) => {
          const configured = String(process.env.CORS_ORIGIN || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
          const defaultDevOrigins = [
            'http://localhost:3000',
            'http://localhost:3002',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3002',
          ];
          const allowedOrigins =
            configured.length > 0
              ? configured
              : process.env.NODE_ENV === 'production'
                ? []
                : defaultDevOrigins;

          // Allow same-origin / server-to-server requests (no Origin header).
          // Write-route protection is handled by auth middleware, not CORS.
          if (!origin) {
            return callback(null, true);
          }
          if (allowedOrigins.includes(origin)) {
            return callback(null, true);
          }
          return callback(new Error('CORS origin denied'));
        },
        credentials: true,
      }),
    );
    this.app.use(compression());

    // 2. Load Shedding
    this.app.use((_req, res, next) => {
      // Keep public read access available under load; shed mutating traffic first.
      const method = _req.method.toUpperCase();
      const isReadOnly = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';

      if (!isReadOnly && toobusy()) {
        if (_req.path.startsWith('/api/')) {
          return res.status(503).json({ error: 'Server Too Busy' });
        }
        return res.status(503).send('Server Too Busy');
      } else {
        next();
      }
    });

    // 3. Rate Limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 2000, // Public site boot + media loads can be bursty; keep per-user limits practical.
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) =>
        req.path === '/api/health' ||
        req.path === '/api/ready' ||
        req.path === '/api/health/ready' ||
        req.path === '/api/stats/health/deep',
    });
    this.app.use(limiter);

    // 3b. DB pool saturation shedding — returns 503 when pool is near-exhausted
    this.app.use(pgSaturationShed);

    // 3c. Retry storm detection — blocks IPs that flood with declared retries
    this.app.use(retryStormDetector);

    // 4. Parsing
    this.app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));
    this.app.use(
      express.urlencoded({ extended: true, limit: process.env.URLENCODED_BODY_LIMIT || '1mb' }),
    );
    this.app.use(cookieParser());

    // 5. Custom Headers (none needed beyond helmet defaults)

    // 5b. API response normalisation: recursively convert all object keys to camelCase
    // so client code can reliably use camelCase regardless of how raw DB rows are named.
    function toCamelCaseKey(str: string): string {
      return str.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
    }
    function deepCamelKeys(obj: unknown): unknown {
      if (Array.isArray(obj)) return obj.map(deepCamelKeys);
      if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
        return Object.fromEntries(
          Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
            toCamelCaseKey(k),
            deepCamelKeys(v),
          ]),
        );
      }
      return obj;
    }
    this.app.use('/api', (_req, res, next) => {
      const originalJson = res.json.bind(res);
      res.json = function (body: unknown) {
        return originalJson(deepCamelKeys(body));
      };
      next();
    });

    // 6. Static files
    this.app.use((req, res, next) => {
      if (req.method === 'GET' && (req.path === '/' || req.path.endsWith('.html'))) {
        res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      next();
    });
    this.app.use(express.static(path.join(__dirname, '../dist')));

    // 7. Secure File Serving
    // Both /files/* and /data/* serve from the data/ directory with path-traversal protection.
    // /data/* is kept as a backward-compatible alias; /files/* is the canonical secure path.
    this.app.get(['/files/*', '/data/*'], (req, res) => {
      const prefix = req.path.startsWith('/files/') ? '/files/' : '/data/';
      const wildcardPath = req.path.slice(prefix.length);
      const filePath = wildcardPath ?? '';

      const decodedPath = (() => {
        try {
          return decodeURIComponent(filePath);
        } catch {
          return filePath;
        }
      })();
      const dataRoot = path.resolve(process.cwd(), 'data');
      const requestedPath = path.resolve(dataRoot, decodedPath);
      const normalizedRoot = dataRoot.endsWith(path.sep) ? dataRoot : `${dataRoot}${path.sep}`;

      if (requestedPath !== dataRoot && !requestedPath.startsWith(normalizedRoot)) {
        return res.status(400).send('Invalid path');
      }
      if (!fs.existsSync(requestedPath)) {
        return res.status(404).send('File not found');
      }
      const realDataRoot = fs.realpathSync(dataRoot);
      const realRequestedPath = fs.realpathSync(requestedPath);
      const normalizedRealRoot = realDataRoot.endsWith(path.sep)
        ? realDataRoot
        : `${realDataRoot}${path.sep}`;
      if (realRequestedPath !== realDataRoot && !realRequestedPath.startsWith(normalizedRealRoot)) {
        return res.status(400).send('Invalid path');
      }

      res.sendFile(realRequestedPath, (err) => {
        if (err) {
          if (!res.headersSent) {
            res.status(404).send('File not found');
          }
        }
      });
    });
  }

  private initializeRoutes() {
    const router = express.Router();

    // Health check
    router.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Legacy readiness alias retained for older clients and scripts.
    router.get('/ready', (_req, res) => {
      res.redirect(307, '/api/health/ready');
    });

    // Readiness endpoint: validates DB connectivity + core data path availability.
    router.get('/health/ready', async (req, res) => {
      const startedAt = Date.now();
      const timeoutMs = Math.max(100, Number(process.env.READINESS_TIMEOUT_MS || 8000) || 8000);
      const softMode = String(req.query.soft || '') === '1';

      const withTimeout = async <T>(promise: Promise<T>, label: string): Promise<T> => {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`${label} timeout after ${timeoutMs}ms`)), timeoutMs),
        );
        return Promise.race([promise, timeoutPromise]);
      };

      try {
        const pool = getApiPool();

        const dbPingStart = Date.now();
        await withTimeout(pool.query('SELECT 1 AS ok'), 'db ping');
        const dbLatencyMs = Date.now() - dbPingStart;

        let countsLatencyMs: number | undefined;
        let countsError: string | undefined;
        let counts: { entities: number; documents: number } | undefined;
        try {
          const countsStart = Date.now();
          counts = await withTimeout(getEntityAndDocumentCounts(), 'core counts');
          countsLatencyMs = Date.now() - countsStart;
        } catch (countErr) {
          countsError = countErr instanceof Error ? countErr.message : 'core counts unavailable';
        }

        const hasMinimumData = counts ? counts.entities > 0 && counts.documents > 0 : true;

        const migrationMetrics = await getMigrationMetrics();
        const apiPoolMetrics = migrationMetrics.pools.api;
        const saturated = Boolean(apiPoolMetrics && apiPoolMetrics.waiting >= 3);
        const hardFailure = !hasMinimumData;
        // Core-count timeouts are treated as non-fatal telemetry warnings as long as DB ping and
        // minimum-data guarantees hold, preventing false degraded readiness during heavy load.
        const degraded = saturated;
        const status: 'ok' | 'degraded' | 'down' = hardFailure
          ? 'down'
          : degraded
            ? 'degraded'
            : 'ok';

        return res.status(status === 'down' && !softMode ? 503 : 200).json({
          status,
          timestamp: new Date().toISOString(),
          checks: {
            db: { ok: true, latencyMs: dbLatencyMs, dialect: 'postgres' },
            data: {
              ok: hasMinimumData,
              entities: counts?.entities,
              documents: counts?.documents,
              latencyMs: countsLatencyMs,
              error: countsError || (hasMinimumData ? undefined : 'Core data unavailable'),
            },
            pool: apiPoolMetrics,
            readiness: {
              mode: softMode ? 'strict-core-counts-soft' : 'strict-core-counts',
              timeoutMs,
            },
            degraded: saturated
              ? { reason: 'api_pool_waiting', waiting: apiPoolMetrics?.waiting || 0 }
              : undefined,
            warnings: countsError
              ? [{ reason: 'core_counts_timeout_or_error', detail: countsError }]
              : undefined,
          },
          durationMs: Date.now() - startedAt,
        });
      } catch (error) {
        return res.status(softMode ? 200 : 503).json({
          status: 'down',
          timestamp: new Date().toISOString(),
          checks: {
            db: { ok: false, error: error instanceof Error ? error.message : 'unknown' },
            readiness: {
              mode: softMode ? 'strict-core-counts-soft' : 'strict-core-counts',
              timeoutMs,
            },
          },
          durationMs: Date.now() - startedAt,
        });
      }
    });

    // Canonical DB metadata endpoint used by monitors and deploy verification.
    router.get('/_meta/db', async (_req, res, next) => {
      try {
        const pool = getApiPool();
        const { rows } = await pool.query<{
          server_version: string;
          statement_timeout: string;
          lock_timeout: string;
        }>(`
          SELECT
            version() AS server_version,
            current_setting('statement_timeout') AS statement_timeout,
            current_setting('lock_timeout') AS lock_timeout
        `);
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

    // Resolve DOJ-style file paths to local document IDs for in-app viewer deep links.
    // Example input path: "DataSet 6/EFTA00008744.pdf"
    router.get('/resolve/epstein-file', async (req, res, next) => {
      try {
        const query = req.query as Record<string, unknown>;
        const rawPath = String(query.path || '').trim();
        if (!rawPath) {
          return res.status(400).json({ error: 'Missing path parameter' });
        }

        const safeDecode = (value: string) => {
          try {
            return decodeURIComponent(value);
          } catch {
            return value;
          }
        };

        const decoded = safeDecode(rawPath).replace(/^\/+/, '');
        const encoded = encodeURI(decoded).replace(/^\/+/, '');
        const fileName = decoded.split('/').filter(Boolean).pop()?.toLowerCase() || null;
        const datasetMatch = decoded.match(/dataset\s*([0-9]+)/i);
        const datasetNumber = datasetMatch ? Number(datasetMatch[1]) : null;
        const volumeHint =
          Number.isFinite(datasetNumber) && datasetNumber !== null
            ? `vol${String(datasetNumber).padStart(5, '0')}`
            : null;

        const candidates = Array.from(
          new Set(
            [
              decoded,
              encoded,
              `epstein/files/${decoded}`,
              `epstein/files/${encoded}`,
              `/epstein/files/${decoded}`,
              `/epstein/files/${encoded}`,
              `https://www.justice.gov/epstein/files/${decoded}`,
              `https://www.justice.gov/epstein/files/${encoded}`,
              `https://justice.gov/epstein/files/${decoded}`,
              `https://justice.gov/epstein/files/${encoded}`,
              `https://epstein.academy/epstein/files/${decoded}`,
              `https://epstein.academy/epstein/files/${encoded}`,
            ].map((value) => value.toLowerCase()),
          ),
        );

        const { rows } = await getApiPool().query<{
          id: number;
          file_name: string | null;
          file_path: string | null;
          original_file_path: string | null;
        }>(
          `
            SELECT id, file_name, file_path, original_file_path
            FROM documents
            WHERE
              LOWER(COALESCE(file_path, '')) = ANY($1::text[])
              OR LOWER(COALESCE(original_file_path, '')) = ANY($1::text[])
              OR LOWER(COALESCE(metadata_json->>'source_original_url', '')) = ANY($1::text[])
              OR LOWER(COALESCE(file_path, '')) LIKE '%' || $2::text
              OR LOWER(COALESCE(original_file_path, '')) LIKE '%' || $2::text
              OR LOWER(COALESCE(metadata_json->>'source_original_url', '')) LIKE '%' || $2::text
            ORDER BY
              CASE
                WHEN LOWER(COALESCE(file_path, '')) = ANY($1::text[]) THEN 0
                WHEN LOWER(COALESCE(original_file_path, '')) = ANY($1::text[]) THEN 1
                WHEN LOWER(COALESCE(metadata_json->>'source_original_url', '')) = ANY($1::text[]) THEN 2
                ELSE 3
              END,
              id DESC
            LIMIT 1
          `,
          [candidates, decoded.toLowerCase()],
        );

        let hit = rows[0];

        if (!hit && fileName) {
          const fallback = await getApiPool().query<{
            id: number;
            file_name: string | null;
            file_path: string | null;
            original_file_path: string | null;
          }>(
            `
              SELECT id, file_name, file_path, original_file_path
              FROM documents
              WHERE
                LOWER(COALESCE(file_name, '')) = $1::text
                OR LOWER(COALESCE(file_path, '')) LIKE '%' || $1::text
                OR LOWER(COALESCE(original_file_path, '')) LIKE '%' || $1::text
              ORDER BY
                CASE
                  WHEN $2::text IS NOT NULL AND LOWER(COALESCE(file_path, '')) LIKE '%' || $2::text || '%' THEN 0
                  WHEN $2::text IS NOT NULL AND LOWER(COALESCE(original_file_path, '')) LIKE '%' || $2::text || '%' THEN 1
                  WHEN LOWER(COALESCE(file_name, '')) = $1::text THEN 2
                  ELSE 3
                END,
                id DESC
              LIMIT 1
            `,
            [fileName, volumeHint],
          );
          hit = fallback.rows[0];
        }

        if (!hit) {
          return res.status(404).json({ error: 'Document not found for path', path: decoded });
        }

        return res.json({
          documentId: String(hit.id),
          redirectTo: `/documents?id=${hit.id}`,
        });
      } catch (error) {
        next(error);
      }
    });

    // Mount routes
    router.use('/auth', authRoutes);
    router.use(optionalAuthenticate);
    router.use((req, res, next) => {
      if (req.path.startsWith('/auth')) {
        return next();
      }
      if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
        return next();
      }
      // Purge API response cache after any successful write operation so
      // subsequent reads reflect the mutation.
      res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          purgeCache();
        }
      });
      return authenticateRequest(req, res, (authErr?: unknown) => {
        if (authErr) return next(authErr);
        return requireRole('admin')(req, res, next);
      });
    });
    router.get('/subjects', validate(subjectsQuerySchema), async (req, res, next) => {
      try {
        const query = req.query as Record<string, unknown>;
        const page = Number(query.page || 1);
        const limit = Number(query.limit || 24);
        const likelihoodRaw = query.likelihoodScore;
        const likelihoodScore = Array.isArray(likelihoodRaw)
          ? likelihoodRaw
          : typeof likelihoodRaw === 'string' && likelihoodRaw.length > 0
            ? [likelihoodRaw]
            : undefined;

        const filters: SearchFilters = {
          searchTerm: typeof query.search === 'string' ? query.search : undefined,
          role: typeof query.role === 'string' ? query.role : undefined,
          entityType: typeof query.entityType === 'string' ? query.entityType : undefined,
          likelihoodScore,
          sortOrder: String(query.sortOrder || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc',
        };
        const sortBy: SortOption =
          typeof query.sortBy === 'string' ? (query.sortBy as SortOption) : 'risk';
        const result = await entitiesRepository.getSubjectCards(page, limit, filters, sortBy);

        res.json(mapSubjectsListResponseDto(result as unknown as Record<string, unknown>));
      } catch (error) {
        next(error);
      }
    });
    router.get('/entities', async (req, res, next) => {
      try {
        const query = req.query as Record<string, unknown>;
        const page = Math.max(1, Number(query.page || 1));
        const limit = Math.min(500, Math.max(1, Number(query.limit || 24)));
        const sortByRaw = String(query.sortBy || 'risk').toLowerCase();
        const sortBy =
          sortByRaw === 'red_flag_rating' || sortByRaw === 'red_flag' ? 'red_flag' : sortByRaw;

        const likelihoodRaw = query.likelihood || query.likelihoodScore;
        const likelihoodScore = Array.isArray(likelihoodRaw)
          ? likelihoodRaw
          : typeof likelihoodRaw === 'string' && likelihoodRaw.length > 0
            ? [likelihoodRaw]
            : undefined;

        const filters: SearchFilters = {
          searchTerm: typeof query.search === 'string' ? query.search : undefined,
          role: typeof query.role === 'string' ? query.role : undefined,
          likelihoodScore,
          minRedFlagIndex:
            query.minRedFlagIndex !== undefined ? Number(query.minRedFlagIndex) : undefined,
          maxRedFlagIndex:
            query.maxRedFlagIndex !== undefined ? Number(query.maxRedFlagIndex) : undefined,
          entityType: typeof query.type === 'string' ? query.type : undefined,
        };
        const result = await entitiesRepository.getEntities(
          page,
          limit,
          filters,
          sortBy as SortOption,
        );

        res.json(
          mapEntityListResponseDto({
            entities: result.entities,
            total: result.total,
            page,
            pageSize: limit,
            photosByEntity: {},
          }),
        );
      } catch (error) {
        next(error);
      }
    });
    router.get('/entities/all', async (req, res, next) => {
      try {
        const query = req.query as Record<string, unknown>;
        const requestedLimit = Number(query.limit || 1000);
        const limit = Math.min(5000, Math.max(1, requestedLimit));
        const entities = await entitiesRepository.getAllEntities(limit);
        res.json(entities);
      } catch (error) {
        next(error);
      }
    });
    router.get('/entities/search', async (req, res, next) => {
      try {
        const query = req.query as Record<string, unknown>;
        const q = String(query.q || '').trim();
        const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
        const result = await entitiesRepository.getEntities(
          1,
          limit,
          q ? ({ searchTerm: q } as SearchFilters) : undefined,
          'relevance',
        );
        res.json({ results: result.entities });
      } catch (error) {
        next(error);
      }
    });
    router.get('/entities/:id', async (req, res, next) => {
      try {
        const entity = await entitiesRepository.getEntityById(req.params.id);
        if (!entity) return res.status(404).json({ error: 'Entity not found' });
        return res.json(mapEntityDetailDto(entity as unknown as Record<string, unknown>));
      } catch (error) {
        next(error);
      }
    });
    router.use('/stats', statsRoutes);
    router.use('/relationships', relationshipsRoutes);
    router.use('/analytics', analyticsRoutes);
    router.use('/graph', graphRoutes);
    router.use('/map', mapRoutes);
    router.use('/media', mediaRoutes);
    router.use('/users', usersRoutes);
    router.use('/investigations', investigationsRouter);
    router.use('/evidence', evidenceRoutes);
    router.use('/advanced-analytics', advancedAnalyticsRoutes);
    router.use('/entities', entityEvidenceRoutes);
    router.use('/tasks', investigativeTasksRoutes);
    router.use('/articles', articlesRoutes);
    router.use('/emails', emailRoutes);
    router.use('/financial', financialRoutes);
    router.use('/forensic', forensicRoutes);
    router.use('/documents', documentsRoutes);
    router.use('/timeline', timelineRoutes);
    router.use('/flights', flightsRoutes);
    router.use('/properties', propertiesRoutes);
    router.use('/black-book', blackBookRoutes);
    router.use('/faces', faceRoutes);
    router.use('/investigations', investigationEvidenceRoutes);

    this.app.use('/api', router);

    // SPA Fallback
    this.app.get('*', async (req, res) => {
      if (await this.tryServeMediaShareMeta(req, res)) {
        return;
      }
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(DIST_INDEX_PATH);
    });
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private replaceMetaTag(html: string, regex: RegExp, replacement: string): string {
    if (regex.test(html)) return html.replace(regex, replacement);
    return html.replace('</head>', `    ${replacement}\n  </head>`);
  }

  private async loadIndexTemplate(): Promise<string> {
    if (cachedIndexTemplate) return cachedIndexTemplate;
    cachedIndexTemplate = await fs.promises.readFile(DIST_INDEX_PATH, 'utf8');
    return cachedIndexTemplate;
  }

  private async tryServeMediaShareMeta(req: Request, res: Response): Promise<boolean> {
    try {
      if (!req.path.startsWith('/media')) return false;
      const itemId = String(req.query.id || req.query.photoId || '').trim();
      const albumId = String(req.query.albumId || '').trim();
      if (!itemId && !albumId) return false;

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const canonical = `${baseUrl}${req.originalUrl}`;
      const pathLower = req.path.toLowerCase();

      let title = 'Epstein Media Archive';
      let description = 'Shared media from the Epstein Files archive.';
      let image = `${baseUrl}/epstein-files.jpg`;
      let imageAlt = 'Epstein Files media preview';

      if (itemId) {
        const numericId = Number(itemId);
        if (!Number.isNaN(numericId) && numericId > 0) {
          const mediaItem = await mediaRepository.getMediaItemById(numericId);
          if (mediaItem?.title) {
            title = mediaItem.title;
          } else if (pathLower.includes('/audio')) {
            title = `Epstein Audio ${numericId}`;
          } else if (pathLower.includes('/video')) {
            title = `Epstein Video ${numericId}`;
          } else {
            title = `Epstein Photo ${numericId}`;
          }

          if (mediaItem?.description) {
            description = mediaItem.description;
          }

          if (pathLower.includes('/audio')) {
            image = `${baseUrl}/api/media/audio/${numericId}/thumbnail`;
            imageAlt = `Audio thumbnail ${numericId}`;
          } else if (pathLower.includes('/video')) {
            image = `${baseUrl}/api/media/video/${numericId}/thumbnail`;
            imageAlt = `Video thumbnail ${numericId}`;
          } else {
            image = `${baseUrl}/api/media/images/${numericId}/file`;
            imageAlt = `Media image ${numericId}`;
          }
        }
      } else if (albumId) {
        const numericAlbumId = Number(albumId);
        if (!Number.isNaN(numericAlbumId) && numericAlbumId > 0) {
          const { mediaItems } = await mediaRepository.getMediaItemsPaginated(1, 1, {
            albumId: numericAlbumId,
            fileType: 'image',
          });
          const firstImage = mediaItems?.[0];
          title = `Epstein Media Album ${numericAlbumId}`;
          description = `Shared media album ${numericAlbumId} from the Epstein Files archive.`;
          if (firstImage?.id) {
            image = `${baseUrl}/api/media/images/${firstImage.id}/file`;
            imageAlt = `Album ${numericAlbumId} preview`;
          }
        }
      }

      let html = await this.loadIndexTemplate();
      const escapedTitle = this.escapeHtml(title);
      const escapedDescription = this.escapeHtml(description);
      const escapedCanonical = this.escapeHtml(canonical);
      const escapedImage = this.escapeHtml(image);
      const escapedImageAlt = this.escapeHtml(imageAlt);

      html = html.replace(
        /<title>[^<]*<\/title>/i,
        `<title>${escapedTitle} | Epstein Files Archive</title>`,
      );
      html = this.replaceMetaTag(
        html,
        /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="description" content="${escapedDescription}" />`,
      );
      html = this.replaceMetaTag(
        html,
        /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
        `<link rel="canonical" href="${escapedCanonical}" />`,
      );
      html = this.replaceMetaTag(
        html,
        /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
        `<meta property="og:title" content="${escapedTitle}" />`,
      );
      html = this.replaceMetaTag(
        html,
        /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
        `<meta property="og:description" content="${escapedDescription}" />`,
      );
      html = this.replaceMetaTag(
        html,
        /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
        `<meta property="og:image" content="${escapedImage}" />`,
      );
      html = this.replaceMetaTag(
        html,
        /<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/?>/i,
        `<meta property="og:image:alt" content="${escapedImageAlt}" />`,
      );
      html = this.replaceMetaTag(
        html,
        /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
        `<meta property="og:url" content="${escapedCanonical}" />`,
      );
      html = this.replaceMetaTag(
        html,
        /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="twitter:title" content="${escapedTitle}" />`,
      );
      html = this.replaceMetaTag(
        html,
        /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="twitter:description" content="${escapedDescription}" />`,
      );
      html = this.replaceMetaTag(
        html,
        /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="twitter:image" content="${escapedImage}" />`,
      );
      html = this.replaceMetaTag(
        html,
        /<meta\s+name="twitter:image:alt"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="twitter:image:alt" content="${escapedImageAlt}" />`,
      );

      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.status(200).type('html').send(html);
      return true;
    } catch (error) {
      logger.warn({ err: error }, 'Failed to render media OG metadata, falling back to SPA shell');
      return false;
    }
  }

  private initializeErrorHandling() {
    this.app.use(globalErrorHandler);
  }

  private server: import('http').Server | null = null;

  public async listen(port: number) {
    return new Promise<void>((resolve) => {
      this.server = this.app.listen(port, () => {
        logger.info(`Server running on port ${port}`);
        // Signal PM2 that the process is ready to accept traffic.
        if (typeof process.send === 'function') {
          process.send('ready');
        }
        resolve();
      });
    });
  }

  public async shutdown(): Promise<void> {
    const SHUTDOWN_TIMEOUT_MS = 8_000;
    const { drainPools } = await import('./server/db/connection.js');

    // Stop accepting new connections.
    await new Promise<void>((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());

        // Force-close lingering connections after the grace period so shutdown
        // is not blocked by long-running requests (graph paths, deep health).
        setTimeout(() => {
          logger.warn('Shutdown grace period exceeded, forcing remaining connections closed');
          this.server?.closeAllConnections();
          resolve();
        }, SHUTDOWN_TIMEOUT_MS);
      } else {
        resolve();
      }
    });

    await drainPools();
  }
}
