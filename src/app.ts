import express, { Express, Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
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
import { initSentry, sentryErrorHandler } from './server/services/sentry.js';
import {
  initPools,
  assertProductionPg,
  getApiPool,
  getMigrationMetrics,
} from './server/db/connection.js';
import { validateStartup } from './server/utils/startupValidation.js';
import { runMigrations } from './server/db/migrator.js';
import { initRevisionManager } from './server/revisionManager.js';
import { getEntityAndDocumentCounts } from './server/db/healthQueries.js';
import { subjectsRouter } from './server/routes/subjectsRoutes.js';

// Route imports
import authRoutes from './server/auth/routes.js';
import { optionalAuthenticate } from './server/auth/middleware.js';
import statsRoutes from './server/routes/stats.js';
import statusRoutes from './server/routes/statusRoutes.js';
import relationshipsRoutes from './server/routes/relationships.js';
import analyticsRoutes from './server/routes/analytics.js';
import { warmTopConnectedCache } from './server/db/analyticsRepository.js';
import graphRoutes from './server/routes/graphRoutes.js';
import mapRoutes from './server/routes/mapRoutes.js';
import mediaRoutes from './server/routes/mediaRoutes.js';
import usersRoutes from './server/routes/users.js';
import investigationEvidenceRoutes from './server/routes/investigationEvidenceRoutes.js';
import investigationsRouter from './server/routes/investigations.js';
import evidenceRoutes from './server/routes/evidenceRoutes.js';
import advancedAnalyticsRoutes from './server/routes/advancedAnalytics.js';
import entityEvidenceRoutes from './server/routes/entityEvidenceRoutes.js';
import entityConnectionsRoutes from './server/routes/entityConnectionsRoutes.js';
import investigativeTasksRoutes from './server/routes/investigativeTasks.js';
import investigationLeadsRouter from './server/routes/investigationLeads.js';
import icebergRoutes from './server/routes/icebergRoutes.js';
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
import activeLearningRoutes from './server/routes/activeLearning.js';
import legalRoutes from './server/routes/legalRoutes.js';
import testimoniesRoutes from './server/routes/testimoniesRoutes.js';
import connectionsRoutes from './server/routes/connectionsRoutes.js';
import collaborationRoutes from './server/routes/collaborationRoutes.js';
import claimsRoutes from './server/routes/claimsRoutes.js';
import { intelligenceRoutes } from './server/routes/intelligenceRoutes.js';
import adminRoutes from './server/routes/adminRoutes.js';
import memoryRoutes from './server/routes/memoryRoutes.js';
import dataQualityRoutes from './server/routes/dataQualityRoutes.js';
import vitalsRoutes from './server/routes/vitalsRoutes.js';
import sitemapRouter from './server/routes/sitemap.js';
import entitiesRoutes from './server/routes/entitiesRoutes.js';
import searchRoutes from './server/routes/searchRoutes.js';
import { entitiesRepository } from './server/db/entitiesRepository.js';
import { mediaRepository } from './server/db/mediaRepository.js';
import { evidenceRepository } from './server/db/evidenceRepository.js';
import { claimTriplesRepository } from './server/db/claimTriplesRepository.js';
import { financialRepository } from './server/db/financialRepository.js';
import { purgeCacheByPattern } from './server/middleware/cache.js';
import { pgSaturationShed } from './server/middleware/pgShed.js';
import { retryStormDetector } from './server/middleware/retryStorm.js';
import { apiErrorEnvelopeMiddleware } from './server/middleware/apiErrorEnvelope.js';
import { queryCounter } from './server/queryCounter.js';
import { shouldBootInDegradedMode } from './server/utils/startupMode.js';
import { initMatViewScheduler } from './server/services/matViewRefresh.js';
import { getDbMetaPayload } from './server/services/dbMetaService.js';

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
    initSentry();
    await this.initializeDatabase();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private async initializeDatabase() {
    if (shouldBootInDegradedMode()) {
      process.env.DEGRADED_MODE = '1';
      logger.warn(
        'DATABASE_URL is not set. Starting in degraded development mode so the UI shell can run locally.',
      );
      return;
    }

    initPools();
    assertProductionPg();
    initRevisionManager(getApiPool());

    // Validate environment (throws on failure)
    try {
      await validateStartup();
    } catch (error) {
      const isProd = process.env.NODE_ENV === 'production';
      if (isProd) {
        logger.error({ err: error }, 'Startup validation failed');
        process.exit(1);
      }

      // In development, keep the server up in a degraded state so the UI can show
      // a clear "API unavailable" message instead of failing to connect.
      process.env.DEGRADED_MODE = '1';
      logger.warn(
        { err: error },
        'Startup validation failed (development) — continuing in degraded mode',
      );
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

  private buildConnectSrc(): string[] {
    const connectSrc = new Set<string>(["'self'"]);

    const addOrigins = (input: string | undefined | null) => {
      const raw = String(input || '').trim();
      if (!raw) return;

      for (const candidate of raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)) {
        try {
          connectSrc.add(new URL(candidate).origin);
        } catch {
          if (/^https?:\/\//i.test(candidate)) {
            connectSrc.add(candidate.replace(/\/+$/, ''));
          }
        }
      }
    };

    if (process.env.NODE_ENV !== 'production') {
      [
        'http://localhost:3000',
        'http://localhost:3002',
        'http://localhost:4173',
        'http://localhost:5173',
        'http://localhost:3312',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3002',
        'http://127.0.0.1:4173',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3312',
      ].forEach((origin) => connectSrc.add(origin));
    }

    addOrigins(process.env.VITE_API_URL);
    addOrigins(process.env.CORS_ORIGIN);

    return Array.from(connectSrc);
  }

  private buildCorsOptions(): CorsOptions {
    const configuredOrigins = new Set(
      String(process.env.CORS_ORIGIN || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((origin) => {
          try {
            return new URL(origin).origin;
          } catch {
            return origin.replace(/\/+$/, '');
          }
        }),
    );
    configuredOrigins.add('https://epstein.academy');
    configuredOrigins.add('https://www.epstein.academy');
    const localhostOriginPattern = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/;

    return {
      origin: (origin, callback) => {
        // Allow same-origin / server-to-server requests (no Origin header).
        // Write-route protection is handled by auth middleware, not CORS.
        if (!origin) {
          return callback(null, true);
        }

        const normalizedOrigin = (() => {
          try {
            return new URL(origin).origin;
          } catch {
            return origin.replace(/\/+$/, '');
          }
        })();

        if (localhostOriginPattern.test(normalizedOrigin)) {
          return callback(null, true);
        }

        if (configuredOrigins.has(normalizedOrigin)) {
          return callback(null, true);
        }

        return callback(new Error(`CORS origin denied: ${normalizedOrigin}`));
      },
      credentials: true,
    };
  }

  private initializeMiddleware() {
    const isProduction = process.env.NODE_ENV === 'production';
    const scriptSrc = isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'", "'unsafe-eval'"];
    const connectSrc = this.buildConnectSrc();

    // Respect real client IP from upstream proxy (nginx) so rate limits are per-user, not global.
    this.app.set('trust proxy', 1);

    // 1. Core Security & Performance
    this.app.use(requestIdMiddleware);
    this.app.use(apiErrorEnvelopeMiddleware);
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
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            imgSrc: ["'self'", 'data:', 'blob:'],
            fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
            connectSrc,
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
          },
        },
        crossOriginEmbedderPolicy: false,
      }),
    );
    const corsOptions = this.buildCorsOptions();
    this.app.use(cors(corsOptions));
    this.app.options('/{*splat}', cors(corsOptions));
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

    // 5b. Dynamic sitemap (must precede express.static so it takes priority over dist/sitemap.xml)
    this.app.use('/sitemap.xml', sitemapRouter);

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
    // Both /files/* and /data/* expose only the explicitly public data subset.
    // Authenticated/private corpus files are served by typed API routes such as
    // /api/documents/:id/file and /api/media/* so policy stays attached to DB records.
    this.app.get(['/files/{*splat}', '/data/{*splat}'], (req, res) => {
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
      const publicRoots = [
        path.resolve(process.cwd(), 'data', 'public'),
        path.resolve(process.cwd(), 'data', 'public', 'data'),
      ]
        .filter((root) => fs.existsSync(root))
        .map((root) => fs.realpathSync(root));

      const normalizedDecoded = decodedPath.replace(/^\/+/, '');
      const candidatePaths = publicRoots.map((root) => path.resolve(root, normalizedDecoded));

      let realRequestedPath: string | null = null;
      for (const requestedPath of candidatePaths) {
        if (!fs.existsSync(requestedPath)) continue;
        const realCandidate = fs.realpathSync(requestedPath);
        const allowed = publicRoots.some((root) => {
          const normalizedRoot = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
          return realCandidate === root || realCandidate.startsWith(normalizedRoot);
        });
        if (allowed && fs.statSync(realCandidate).isFile()) {
          realRequestedPath = realCandidate;
          break;
        }
      }

      if (!realRequestedPath) {
        return res.status(404).send('File not found');
      }

      res.setHeader('X-Content-Type-Options', 'nosniff');
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

    router.use('/subjects', subjectsRouter);

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
        res.json(await getDbMetaPayload());
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
        }>(
          `
            SELECT id, file_name, file_path
            FROM documents
            WHERE
              LOWER(COALESCE(file_path, '')) = ANY($1::text[])
              OR LOWER(COALESCE(metadata_json->>'source_original_url', '')) = ANY($1::text[])
              OR LOWER(COALESCE(file_path, '')) LIKE '%' || $2::text
              OR LOWER(COALESCE(metadata_json->>'source_original_url', '')) LIKE '%' || $2::text
            ORDER BY
              CASE
                WHEN LOWER(COALESCE(file_path, '')) = ANY($1::text[]) THEN 0
                WHEN LOWER(COALESCE(metadata_json->>'source_original_url', '')) = ANY($1::text[]) THEN 1
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
          }>(
            `
              SELECT id, file_name, file_path
              FROM documents
              WHERE
                LOWER(COALESCE(file_name, '')) = $1::text
                OR LOWER(COALESCE(file_path, '')) LIKE '%' || $1::text
              ORDER BY
                CASE
                  WHEN $2::text IS NOT NULL AND LOWER(COALESCE(file_path, '')) LIKE '%' || $2::text || '%' THEN 0
                  WHEN LOWER(COALESCE(file_name, '')) = $1::text THEN 1
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
      if (
        req.path.startsWith('/auth') ||
        req.method === 'GET' ||
        req.method === 'HEAD' ||
        req.method === 'OPTIONS'
      ) {
        return next();
      }
      // Purge only the cache keys relevant to the mutated resource so
      // unrelated cached responses remain warm.
      res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Derive the top-level resource segment from the request path.
          // e.g. POST /api/entities/42 → purge /api/entities*
          const segment = req.path.split('/').filter(Boolean)[0];
          if (segment) {
            purgeCacheByPattern(new RegExp(`/api/${segment}`));
          }
        }
      });
      return next();
    });
    router.use('/entities', entitiesRoutes);
    router.use('/search', searchRoutes);
    router.use('/stats', statsRoutes);
    router.use('/status', statusRoutes);
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
    router.use('/entities', entityConnectionsRoutes);
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
    router.use('/review', activeLearningRoutes);
    router.use('/claims', claimsRoutes);
    router.use('/legal-proceedings', legalRoutes);
    router.use('/testimonies', testimoniesRoutes);
    router.use('/connections', connectionsRoutes);
    router.use('/collaboration', collaborationRoutes);
    router.use('/intelligence', intelligenceRoutes);
    router.use('/investigations', investigationEvidenceRoutes);
    router.use('/investigations/:id/leads', investigationLeadsRouter);
    router.use('/investigations/:id/iceberg', icebergRoutes);
    router.use('/admin', adminRoutes);
    router.use('/memory', memoryRoutes);
    router.use('/data-quality', dataQualityRoutes);
    router.use('/vitals', vitalsRoutes);

    // API 404 — must be last on the router, before the SPA fallback.
    // Prevents unknown /api/* paths from returning HTML to API clients.
    router.use((req, res) => {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: `API route not found: ${req.method} ${req.path}` },
      });
    });

    this.app.use('/api', router);

    // SPA Fallback
    this.app.get('/{*splat}', async (req, res) => {
      if (await this.tryServeMediaShareMeta(req, res)) {
        return;
      }
      if (await this.tryServeEvidenceShareMeta(req, res)) {
        return;
      }
      if (await this.tryServeEntityShareMeta(req, res)) {
        return;
      }
      if (await this.tryServeClaimShareMeta(req, res)) {
        return;
      }
      if (await this.tryServeFinancialShareMeta(req, res)) {
        return;
      }
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(DIST_INDEX_PATH, (err) => {
        if (err) {
          // Build artifact missing — happens if the app is started before `pnpm build:prod`.
          res.status(503).send('Application not built. Run pnpm build:prod first.');
        }
      });
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

  private injectOgTags(
    html: string,
    opts: {
      title: string;
      description: string;
      image: string;
      imageAlt: string;
      canonical: string;
      imageType?: string;
    },
  ): string {
    const escapedTitle = this.escapeHtml(opts.title);
    const escapedDescription = this.escapeHtml(opts.description);
    const escapedImage = this.escapeHtml(opts.image);
    const escapedImageAlt = this.escapeHtml(opts.imageAlt);
    const escapedCanonical = this.escapeHtml(opts.canonical);
    const escapedImageType = this.escapeHtml(opts.imageType ?? 'image/jpeg');

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
    // Inject og:image:type even if absent from the static template — all SSR-rendered
    // pages should declare the image MIME type for social crawlers.
    html = this.replaceMetaTag(
      html,
      /<meta\s+property="og:image:type"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:image:type" content="${escapedImageType}" />`,
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
    return html;
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
      html = this.injectOgTags(html, { title, description, image, imageAlt, canonical });

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

  private async tryServeEvidenceShareMeta(req: Request, res: Response): Promise<boolean> {
    try {
      if (!req.path.startsWith('/evidence/')) return false;
      const id = req.path.replace('/evidence/', '').split('/')[0].trim();
      if (!id) return false;

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const canonical = `${baseUrl}${req.originalUrl}`;

      let title = `Evidence Record ${id}`;
      let description =
        'Search and analyze the Epstein Files archive: documents, emails, media, entities, timelines, and flights.';
      const image = `${baseUrl}/epstein-files.jpg`;
      const imageAlt = 'Epstein Files Archive cover image';

      const evidence = await evidenceRepository.getEvidenceById(id);
      if (evidence) {
        const ev = evidence as Record<string, unknown>;
        const rawTitle = ev['title'];
        const rawDesc = ev['description'];
        if (typeof rawTitle === 'string' && rawTitle.trim()) {
          title = rawTitle.trim();
        }
        if (typeof rawDesc === 'string' && rawDesc.trim()) {
          const raw = rawDesc.trim();
          description = raw.length > 160 ? `${raw.slice(0, 157)}…` : raw;
        }
      }

      let html = await this.loadIndexTemplate();
      html = this.injectOgTags(html, { title, description, image, imageAlt, canonical });

      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.status(200).type('html').send(html);
      return true;
    } catch (error) {
      logger.warn(
        { err: error },
        'Failed to render evidence OG metadata, falling back to SPA shell',
      );
      return false;
    }
  }

  private async tryServeEntityShareMeta(req: Request, res: Response): Promise<boolean> {
    try {
      if (!req.path.startsWith('/entity/')) return false;
      const rawId = req.path.replace('/entity/', '').split('/')[0].trim();
      if (!rawId) return false;
      const numericId = Number(rawId);
      if (Number.isNaN(numericId) || numericId <= 0) return false;

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const canonical = `${baseUrl}${req.originalUrl}`;

      let title = `Entity ${numericId}`;
      let description =
        'Browse entities, mention context, and supporting references across the Epstein files archive.';
      const image = `${baseUrl}/epstein-files.jpg`;
      const imageAlt = 'Epstein Files Archive cover image';

      const entity = await entitiesRepository.getEntityById(numericId);
      if (entity) {
        if (entity.name && entity.name !== 'Unknown') {
          title = entity.name;
        }
        const role =
          entity.primaryRole && entity.primaryRole !== 'Unknown' ? entity.primaryRole : null;
        const mentions = typeof entity.mentions === 'number' ? entity.mentions : 0;
        description = role
          ? `${role} — ${mentions} mention${mentions === 1 ? '' : 's'} in the Epstein Files archive.`
          : `${mentions} mention${mentions === 1 ? '' : 's'} in the Epstein Files archive.`;
      }

      let html = await this.loadIndexTemplate();
      html = this.injectOgTags(html, { title, description, image, imageAlt, canonical });

      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.status(200).type('html').send(html);
      return true;
    } catch (error) {
      logger.warn({ err: error }, 'Failed to render entity OG metadata, falling back to SPA shell');
      return false;
    }
  }

  private async tryServeClaimShareMeta(req: Request, res: Response): Promise<boolean> {
    try {
      if (!req.path.startsWith('/claims/')) return false;
      const rawId = req.path.replace('/claims/', '').split('/')[0].trim();
      if (!rawId) return false;

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const canonical = `${baseUrl}${req.originalUrl}`;
      const claim = await claimTriplesRepository.getById(rawId);

      let title = `AI Claim ${rawId}`;
      let description =
        'AI-extracted subject-predicate-object claim from the Epstein Files archive.';
      if (claim) {
        const subject = claim.subjectName || 'Unknown entity';
        const predicate = claim.predicate || 'related to';
        const object = claim.objectName || claim.objectText || 'unknown';
        title = `${subject} ${predicate} ${object}`;
        description = `${claim.documentTitle || `Document ${claim.documentId}`} · confidence ${Math.round(
          Number(claim.confidence || 0) * 100,
        )}% · requires human verification.`;
      }

      let html = await this.loadIndexTemplate();
      html = this.injectOgTags(html, {
        title,
        description,
        image: `${baseUrl}/epstein-files.jpg`,
        imageAlt: 'Epstein Files Archive claim preview',
        canonical,
      });

      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.status(200).type('html').send(html);
      return true;
    } catch (error) {
      logger.warn({ err: error }, 'Failed to render claim OG metadata, falling back to SPA shell');
      return false;
    }
  }

  private async tryServeFinancialShareMeta(req: Request, res: Response): Promise<boolean> {
    try {
      if (!req.path.startsWith('/financial/')) return false;
      const rawId = req.path.replace('/financial/', '').split('/')[0].trim();
      if (!rawId || rawId === 'transactions') return false;

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const canonical = `${baseUrl}${req.originalUrl}`;
      const transaction = await financialRepository.getTransactionById(rawId);

      let title = `Financial Transaction ${rawId}`;
      let description = 'Extracted financial record from the Epstein Files archive.';
      if (transaction) {
        const amount = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: transaction.currency || 'USD',
          maximumFractionDigits: 0,
        }).format(Number(transaction.amount || 0));
        title = `${transaction.from_entity} → ${transaction.to_entity}`;
        description = `${amount} · ${transaction.transaction_type || 'transaction'} · ${transaction.risk_level || 'medium'} risk · source document ${transaction.source_document_id || 'pending'}.`;
      }

      let html = await this.loadIndexTemplate();
      html = this.injectOgTags(html, {
        title,
        description,
        image: `${baseUrl}/epstein-files.jpg`,
        imageAlt: 'Epstein Files Archive financial preview',
        canonical,
      });

      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.status(200).type('html').send(html);
      return true;
    } catch (error) {
      logger.warn(
        { err: error },
        'Failed to render financial OG metadata, falling back to SPA shell',
      );
      return false;
    }
  }

  private initializeErrorHandling() {
    // Forward unhandled errors to Sentry before our own handler takes over.
    this.app.use(sentryErrorHandler);
    this.app.use(globalErrorHandler);
  }

  private server: import('http').Server | null = null;

  public async listen(port: number) {
    return new Promise<void>((resolve) => {
      this.server = this.app.listen(port, '0.0.0.0', () => {
        logger.info(`Server listening on 0.0.0.0:${port}`);
        // Signal PM2 that the process is ready to accept traffic.
        if (typeof process.send === 'function') {
          process.send('ready');
        }
        // Pre-warm the expensive top-connected analytics cache so the first
        // request to /api/analytics/enhanced doesn't block waiting for it.
        warmTopConnectedCache();
        // Refresh every 30 minutes to keep the cache warm after it expires.
        setInterval(warmTopConnectedCache, 30 * 60 * 1000).unref();

        // Start materialised view background scheduler
        initMatViewScheduler();

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
