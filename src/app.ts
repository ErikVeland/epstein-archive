import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import toobusy from 'toobusy-js';
import rateLimit from 'express-rate-limit';
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
import {
  mapEntityDetailDto,
  mapEntityListResponseDto,
  mapSubjectsListResponseDto,
} from './server/mappers/entitiesDtoMapper.js';
import { validate, subjectsQuerySchema } from './server/middleware/validate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    try {
      await runMigrations();
      logger.info('Database migrations completed');
    } catch (error) {
      logger.error({ err: error }, 'Failed to run migrations');
      process.exit(1);
    }
  }

  private initializeMiddleware() {
    const isProduction = process.env.NODE_ENV === 'production';
    const scriptSrc = isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'", "'unsafe-eval'"];

    // Respect real client IP from upstream proxy (nginx) so rate limits are per-user, not global.
    this.app.set('trust proxy', 1);

    // 1. Core Security & Performance
    this.app.use(requestIdMiddleware);
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

    // 4. Parsing
    this.app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));
    this.app.use(
      express.urlencoded({ extended: true, limit: process.env.URLENCODED_BODY_LIMIT || '1mb' }),
    );
    this.app.use(cookieParser());

    // 5. Custom Headers
    this.app.use((_req, res, next) => {
      res.setHeader('X-DB-Dialect', 'postgres');
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
    this.app.use('/data', express.static(path.join(__dirname, '../data')));

    // 7. Secure File Serving
    // This replicates the logic from server.ts for handling /files/*
    this.app.get('/files/*', (req, res) => {
      const wildcardPath = (req.params as Record<string, string | undefined>)['0'];
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
      const timeoutMs = Math.max(100, Number(process.env.READINESS_TIMEOUT_MS || 1200) || 1200);
      const userAgent = String(req.headers['user-agent'] || '');
      const browserRequest = /\bmozilla\/\d/i.test(userAgent);
      const softMode = String(req.query.soft || '') === '1' || browserRequest;

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
        } catch (countErr: any) {
          countsError = countErr?.message || 'core counts unavailable';
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
              mode: softMode ? 'o1-plus-core-counts-soft' : 'o1-plus-core-counts',
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
      } catch (error: any) {
        return res.status(softMode ? 200 : 503).json({
          status: 'down',
          timestamp: new Date().toISOString(),
          checks: {
            db: { ok: false, error: error?.message || 'unknown' },
            readiness: {
              mode: softMode ? 'o1-plus-core-counts-soft' : 'o1-plus-core-counts',
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
        const rawPath = String((req.query as any).path || '').trim();
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
      return authenticateRequest(req, res, (authErr?: any) => {
        if (authErr) return next(authErr);
        return requireRole('admin')(req, res, next);
      });
    });
    router.get('/subjects', validate(subjectsQuerySchema), async (req, res, next) => {
      try {
        const query = req.query as any;
        const page = Number(query.page || 1);
        const limit = Number(query.limit || 24);
        const likelihoodRaw = query.likelihoodScore;
        const likelihoodScore = Array.isArray(likelihoodRaw)
          ? likelihoodRaw
          : typeof likelihoodRaw === 'string' && likelihoodRaw.length > 0
            ? [likelihoodRaw]
            : undefined;

        const result = await entitiesRepository.getSubjectCards(
          page,
          limit,
          {
            searchTerm: query.search,
            role: query.role,
            entityType: query.entityType,
            likelihoodScore,
            sortOrder: String(query.sortOrder || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc',
          } as any,
          (query.sortBy as any) || 'risk',
        );

        res.json(mapSubjectsListResponseDto(result));
      } catch (error) {
        next(error);
      }
    });
    router.get('/entities', async (req, res, next) => {
      try {
        const query = req.query as any;
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

        const result = await entitiesRepository.getEntities(
          page,
          limit,
          {
            searchTerm: query.search,
            role: query.role,
            likelihoodScore,
            minRedFlagIndex:
              query.minRedFlagIndex !== undefined ? Number(query.minRedFlagIndex) : undefined,
            maxRedFlagIndex:
              query.maxRedFlagIndex !== undefined ? Number(query.maxRedFlagIndex) : undefined,
            entityType: query.type,
          } as any,
          sortBy as any,
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
        const requestedLimit = Number((req.query as any).limit || 1000);
        const limit = Math.min(5000, Math.max(1, requestedLimit));
        const entities = await entitiesRepository.getAllEntities(limit);
        res.json(entities);
      } catch (error) {
        next(error);
      }
    });
    router.get('/entities/search', async (req, res, next) => {
      try {
        const q = String((req.query as any).q || '').trim();
        const limit = Math.min(100, Math.max(1, Number((req.query as any).limit || 20)));
        const result = await entitiesRepository.getEntities(
          1,
          limit,
          q ? ({ searchTerm: q } as any) : undefined,
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
        return res.json(mapEntityDetailDto(entity));
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
    router.use('/entity-evidence', entityEvidenceRoutes);
    router.use('/tasks', investigativeTasksRoutes);
    router.use('/articles', articlesRoutes);
    router.use('/emails', emailRoutes);
    router.use('/email', emailRoutes); // legacy singular alias
    router.use('/financial', financialRoutes);
    router.use('/forensic', forensicRoutes);
    router.use('/documents', documentsRoutes);
    router.use('/timeline', timelineRoutes);
    router.use('/flights', flightsRoutes);
    router.use('/properties', propertiesRoutes);
    router.use('/black-book', blackBookRoutes);
    router.use('/faces', faceRoutes);

    // Legacy/Direct routes that might need adjustment
    router.use('/investigation-evidence', investigationEvidenceRoutes);

    this.app.use('/api', router);

    // SPA Fallback
    this.app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
  }

  private initializeErrorHandling() {
    this.app.use(globalErrorHandler);
  }

  public async listen(port: number) {
    return new Promise<void>((resolve) => {
      this.app.listen(port, () => {
        logger.info(`Server running on port ${port}`);
        resolve();
      });
    });
  }
}
