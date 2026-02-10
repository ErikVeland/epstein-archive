import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
// import { databaseService } from './services/DatabaseService.js';
// import { getEnv } from './src/config/env.js';
import { entitiesRepository } from './server/db/entitiesRepository.js';
import { documentsRepository } from './server/db/documentsRepository.js';
import { statsRepository } from './server/db/statsRepository.js';
import { mediaRepository } from './server/db/mediaRepository.js';
import { investigationsRepository } from './server/db/investigationsRepository.js';
import { searchRepository } from './server/db/searchRepository.js';
import { timelineRepository } from './server/db/timelineRepository.js';
import { forensicRepository } from './server/db/forensicRepository.js';
import { runMigrations } from './server/db/migrator.js';
import { validateStartup } from './server/utils/startupValidation.js';
import { authenticateRequest, requireRole } from './server/auth/middleware.js';
import authRoutes from './server/auth/routes.js';
import { logAudit } from './server/utils/auditLogger.js';
// getEnv removed - not currently used, but available in ./server/utils/envValidator.js if needed
import { MediaService } from './services/MediaService.js';
import investigationEvidenceRoutes from './routes/investigationEvidenceRoutes.js';
import investigationsRouter from './server/routes/investigations.js';
import evidenceRoutes from './routes/evidenceRoutes.js';
import advancedAnalyticsRoutes from './server/routes/advancedAnalytics.js';
import entityEvidenceRoutes from './routes/entityEvidenceRoutes.js';
import investigativeTasksRoutes from './server/routes/investigativeTasks.js';
import articlesRoutes from './server/routes/articlesRoutes.js';
import emailRoutes from './server/routes/emailRoutes.js';
import financialRoutes from './server/routes/financialRoutes.js';
import forensicRoutes from './server/routes/forensicRoutes.js';
import { articlesRepository } from './server/db/articlesRepository.js';
import { communicationsRepository } from './server/db/communicationsRepository.js';
import crypto from 'crypto';
import multer from 'multer';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { SearchFilters, SortOption } from './types';
import { config } from './config/index.js';
import { blackBookRepository } from './server/db/blackBookRepository.js';
import { globalErrorHandler } from './server/utils/errorHandler.js';
import { memoryRepository } from './server/db/memoryRepository.js';
import NodeCache from 'node-cache';
import { getDb } from './server/db/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// API Response Cache - 5 minute TTL for high-traffic endpoints
const apiCache = new NodeCache({
  stdTTL: 300, // 5 minutes
  checkperiod: 60, // Check for expired keys every 60s
  useClones: false, // Don't clone objects (faster, but be careful with mutations)
});

// Cache middleware helper
const cacheMiddleware = (ttl?: number) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Generate cache key from URL + query params
    const cacheKey = req.originalUrl || req.url;

    // Try to get cached response
    const cachedResponse = apiCache.get(cacheKey);
    if (cachedResponse) {
      // Send cached response
      res.set('X-Cache', 'HIT');
      return res.json(cachedResponse);
    }

    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      // Cache the response
      apiCache.set(cacheKey, body, ttl || 300);
      res.set('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
};

// Paths
const CORPUS_BASE_PATH = process.env.RAW_CORPUS_BASE_PATH || '';
// Warn if corpus path not configured (documents may not be accessible)
if (!CORPUS_BASE_PATH) {
  console.warn('WARNING: RAW_CORPUS_BASE_PATH not set. Document file serving will be limited.');
}

const app = express();
// Enable trust proxy for Nginx/Load Balancer
app.set('trust proxy', 1);

// databaseService is already initialized at module level in its file, but let's make sure we use the same connection
const mediaService = new MediaService(getDb());

// Request logging - AT THE VERY TOP
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Log originalUrl to see exactly what reached Express
    console.log(
      `${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`,
    );
  });
  next();
});

// Basic middleware
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: config.corsCredentials,
  }),
);

app.use(cookieParser());

// Security headers (CSP, HSTS, X-Frame-Options, etc.)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for React
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', '*'],
        connectSrc: [
          "'self'",
          ...(Array.isArray(config.corsOrigin) ? config.corsOrigin : [config.corsOrigin]),
          'http://localhost:*',
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", 'blob:', '*'],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Required for some media
    crossOriginResourcePolicy: false, // Required for mobile image loading
  }),
);

// Compress all responses
app.use(compression());

// Rate limiting (100 requests per 15 minutes per IP)
const apiLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

if (config.nodeEnv === 'production' && process.env.DISABLE_RATE_LIMIT !== 'true') {
  app.use('/api/', apiLimiter);
} else {
  console.warn(
    '[RateLimit] Skipping API rate limiter in development (set DISABLE_RATE_LIMIT=false to re-enable).',
  );
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input validation and sanitization middleware
import { inputValidationMiddleware } from './server/middleware/validation.js';
app.use(inputValidationMiddleware);

// Mount specialized routes
import downloadRoutes from './server/routes/downloads.js';
app.use('/api/downloads', downloadRoutes);

// Relationships API
app.get('/api/relationships', async (req, res, next) => {
  try {
    const entityId = req.query.entityId as string;
    if (!entityId) {
      return res.status(400).json({ error: 'entityId is required' });
    }

    const { relationshipsRepository } = await import('./server/db/relationshipsRepository.js');
    const limit = parseInt(req.query.limit as string) || 50;

    // Using getRelationships but mapping to what InvestigationWorkspace expects if needed
    // The repository returns source_id, target_id, etc.
    const relations = relationshipsRepository.getRelationships(entityId, {
      minWeight: req.query.minWeight ? parseFloat(req.query.minWeight as string) : undefined,
    });

    // Map to the structure expected by the frontend
    const mapped = relations.slice(0, limit).map((r) => ({
      entity_id: r.target_id,
      related_entity_id: r.target_id,
      relationship_type: r.relationship_type,
      strength: r.proximity_score,
      confidence: r.confidence,
      weight: r.proximity_score,
    }));

    res.json({ relationships: mapped });
  } catch (error) {
    next(error);
  }
});
app.use('/api/investigations', investigationsRouter);
app.use('/api/investigation', investigationEvidenceRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/entities', entityEvidenceRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/entities', entityEvidenceRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/articles', articlesRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/forensic', forensicRoutes);
import activeLearningRoutes from './server/routes/activeLearning.js';
app.use('/api/review', activeLearningRoutes);

// Public Stats Endpoint (for About page)
app.get('/api/stats', cacheMiddleware(300), async (_req, res, next) => {
  try {
    const stats = statsRepository.getStatistics();
    res.json(stats);
  } catch (e) {
    next(e);
  }
});

// Authentication middleware will be applied below

// Serve static frontend from dist

// Serve static frontend from dist
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  // Serve static frontend from dist
  app.use(
    express.static(distPath, {
      setHeaders: (res, path) => {
        // Don't cache index.html to ensure updates are seen immediately
        if (path.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else {
          // Cache other assets (they have hash chunks)
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    }),
  );
}
// Serve project data (images) statically
const dataPath = path.join(process.cwd(), 'data');
if (fs.existsSync(dataPath)) {
  app.use('/data', express.static(dataPath));
}
// Also try resolving relative to project root (handles different CWDs)
try {
  const projectDataPath = path.join(__dirname, '..', 'data');
  if (fs.existsSync(projectDataPath)) {
    app.use('/data', express.static(projectDataPath));
  }
} catch {
  void 0;
}
// And absolute /data (Docker/host volume)
const absDataPath = '/data';
try {
  if (fs.existsSync(absDataPath)) {
    app.use('/data', express.static(absDataPath));
  }
} catch {
  void 0;
}
// Local development document images (
// maps absolute dataset folder to /files)
try {
  if (fs.existsSync(CORPUS_BASE_PATH)) {
    app.use('/files', express.static(CORPUS_BASE_PATH));
  }
} catch {
  void 0;
}

// Robust static resolver for files under /data
app.get('/api/static', async (req, res, next) => {
  try {
    let raw = String(req.query.path || '');
    if (!raw) return res.status(400).json({ error: 'path required' });

    // Normalize common forms:
    // - "data/..."   → "/data/..."
    // - already absolute "/data/..." is left as-is
    if (raw.startsWith('data/')) {
      raw = '/data/' + raw.substring('data/'.length);
    }

    if (!raw.includes('/data/')) return res.status(400).json({ error: 'invalid path' });

    const rel = raw.replace(/^.*[/\\]data[/\\]/, '').replace(/\\/g, '/');
    const candidates: string[] = [];
    candidates.push(path.join(process.cwd(), 'data', rel));
    candidates.push(path.join(__dirname, '..', 'data', rel));
    candidates.push(path.join('/data', rel.startsWith('/') ? rel.substring(1) : rel));

    for (const fp of candidates) {
      if (fs.existsSync(fp)) {
        return res.sendFile(fp);
      }
    }
    return res.status(404).json({ error: 'File not found' });
  } catch (e) {
    next(e);
  }
});

// Health check endpoint - Basic (fast, for load balancers)
app.get('/api/health', (_req, res) => {
  let dbStatus = 'not_initialized';
  let stats = { entities: 0, documents: 0 };

  try {
    const db = getDb();
    if (db) {
      dbStatus = 'connected';
      const entityCount = db.prepare('SELECT COUNT(*) as count FROM entities').get() as {
        count: number;
      };
      const docCount = db.prepare('SELECT COUNT(*) as count FROM documents').get() as {
        count: number;
      };
      stats = { entities: entityCount.count, documents: docCount.count };
    }
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

// Deep health check - Comprehensive verification for deployment validation
// This endpoint performs thorough checks and should only be used during deployment verification
app.get('/api/health/deep', (_req, res) => {
  const checks: Record<
    string,
    { status: 'pass' | 'fail' | 'warn'; message: string; duration?: number }
  > = {};
  let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';

  const startTime = Date.now();

  try {
    const db = getDb();

    // 1. Database connection check
    const dbStart = Date.now();
    try {
      db.prepare('SELECT 1').get();
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

    // 2. Database integrity check
    const integrityStart = Date.now();
    try {
      const integrity = db.pragma('integrity_check') as Array<{ integrity_check: string }>;
      if (integrity[0]?.integrity_check === 'ok') {
        checks.database_integrity = {
          status: 'pass',
          message: 'Database integrity OK',
          duration: Date.now() - integrityStart,
        };
      } else {
        checks.database_integrity = {
          status: 'fail',
          message: `Integrity check failed: ${integrity[0]?.integrity_check}`,
        };
        overallStatus = 'critical';
      }
    } catch (e: any) {
      checks.database_integrity = {
        status: 'fail',
        message: `Integrity check error: ${e.message}`,
      };
      overallStatus = 'critical';
    }

    // 3. Critical tables exist and have data
    const criticalTables = [
      'entities',
      'documents',
      'entity_relationships',
      'investigations',
      'black_book_entries',
    ];
    for (const table of criticalTables) {
      const tableStart = Date.now();
      try {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as {
          count: number;
        };
        if (count.count > 0) {
          checks[`table_${table}`] = {
            status: 'pass',
            message: `${count.count} rows`,
            duration: Date.now() - tableStart,
          };
        } else {
          checks[`table_${table}`] = {
            status: 'warn',
            message: 'Table empty',
            duration: Date.now() - tableStart,
          };
          if (overallStatus === 'healthy') overallStatus = 'degraded';
        }
      } catch (e: any) {
        checks[`table_${table}`] = { status: 'fail', message: `Table check failed: ${e.message}` };
        overallStatus = 'critical';
      }
    }

    // 4. Test a real query (simulates user request)
    const queryStart = Date.now();
    try {
      const entity = db
        .prepare('SELECT id, full_name FROM entities WHERE mentions > 0 LIMIT 1')
        .get();
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

    // 5. Check WAL mode (important for SQLite reliability)
    try {
      const journalMode = db.pragma('journal_mode') as Array<{ journal_mode: string }>;
      const mode = journalMode[0]?.journal_mode;
      checks.journal_mode = {
        status: mode === 'wal' ? 'pass' : 'warn',
        message: `Journal mode: ${mode}`,
      };
    } catch (e: any) {
      checks.journal_mode = {
        status: 'warn',
        message: `Could not check journal mode: ${e.message}`,
      };
    }

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

    // 7. Disk space check for database file
    try {
      const dbPath = process.env.DB_PATH || './epstein-archive.db';
      const stats = fs.statSync(dbPath);
      const dbSizeMB = Math.round(stats.size / 1024 / 1024);
      checks.database_size = { status: 'pass', message: `${dbSizeMB} MB` };
    } catch (e: any) {
      checks.database_size = { status: 'warn', message: `Could not check DB size: ${e.message}` };
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

// Readiness check for Kubernetes/Docker
app.get('/api/ready', (_req, res) => {
  if (getDb()) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not_ready', reason: 'database_not_initialized' });
  }
});

// Auth Login Endpoint (Public)
// Auth Routes (Login/Logout)
app.use('/api/auth', authRoutes);

// Enhanced Analytics API (PUBLIC) - Aggregated data for visualizations
app.get('/api/analytics/enhanced', async (_req, res, next) => {
  try {
    console.log('📊 Starting Enhanced Analytics Fetch...');
    console.time('analytics-total');
    const db = getDb();

    // Document breakdown by type
    console.time('analytics-docs-by-type');
    const documentsByType = db
      .prepare(
        `
      SELECT 
        evidence_type as type,
        COUNT(*) as count,
        SUM(CASE WHEN has_redactions = 1 THEN 1 ELSE 0 END) as redacted,
        AVG(red_flag_rating) as avgRisk
      FROM documents 
      WHERE evidence_type IS NOT NULL 
      GROUP BY evidence_type 
      ORDER BY count DESC
    `,
      )
      .all();
    console.timeEnd('analytics-docs-by-type');

    console.time('analytics-timeline');
    const timelineData = db
      .prepare(
        `
      SELECT 
        substr(date_created, 1, 7) as period,
        COUNT(*) as total,
        SUM(CASE WHEN evidence_type = 'email' THEN 1 ELSE 0 END) as emails,
        SUM(CASE WHEN evidence_type = 'photo' THEN 1 ELSE 0 END) as photos,
        SUM(CASE WHEN evidence_type = 'document' THEN 1 ELSE 0 END) as documents,
        SUM(CASE WHEN evidence_type = 'financial' THEN 1 ELSE 0 END) as financial
      FROM documents 
      WHERE date_created IS NOT NULL AND length(date_created) >= 7
      GROUP BY period 
      ORDER BY period ASC
    `,
      )
      .all();
    console.timeEnd('analytics-timeline');

    console.time('analytics-top-connected');
    // Top connected entities (by relationship count)
    const topConnectedEntities = db
      .prepare(
        `
      WITH rel_counts AS (
        SELECT entity_id, SUM(cnt) as cnt FROM (
          SELECT source_entity_id as entity_id, COUNT(*) as cnt FROM entity_relationships GROUP BY source_entity_id
          UNION ALL
          SELECT target_entity_id as entity_id, COUNT(*) as cnt FROM entity_relationships GROUP BY target_entity_id
        ) t
        GROUP BY entity_id
      )
      SELECT 
        e.id,
        e.full_name as name,
        e.primary_role as role,
        e.entity_type as type,
        e.red_flag_rating as riskLevel,
        COALESCE(rc.cnt, 0) as connectionCount,
        e.mentions
      FROM rel_counts rc
      JOIN entities e ON e.id = rc.entity_id
      WHERE e.entity_type = 'Person'
      ORDER BY rc.cnt DESC
      LIMIT 1000
    `,
      )
      .all();
    console.timeEnd('analytics-top-connected');

    console.time('analytics-entity-dist');
    // Entity type distribution
    const entityTypeDistribution = db
      .prepare(
        `
      SELECT 
        entity_type as type,
        COUNT(*) as count,
        AVG(red_flag_rating) as avgRisk
      FROM entities 
      WHERE entity_type IS NOT NULL 
      GROUP BY entity_type 
      ORDER BY count DESC
    `,
      )
      .all();
    console.timeEnd('analytics-entity-dist');

    console.time('analytics-risk-by-type');
    // Risk distribution by entity type
    const riskByType = db
      .prepare(
        `
      SELECT 
        entity_type as type,
        red_flag_rating as riskLevel,
        COUNT(*) as count
      FROM entities 
      WHERE entity_type IS NOT NULL AND red_flag_rating IS NOT NULL
      GROUP BY entity_type, red_flag_rating 
      ORDER BY entity_type, red_flag_rating DESC
    `,
      )
      .all();
    console.timeEnd('analytics-risk-by-type');

    console.time('analytics-redaction-stats');
    // Overall redaction stats
    const redactionStats = db
      .prepare(
        `
      SELECT 
        COUNT(*) as totalDocuments,
        SUM(CASE WHEN has_redactions = 1 THEN 1 ELSE 0 END) as redactedDocuments,
        (SUM(CASE WHEN has_redactions = 1 THEN 1.0 ELSE 0 END) / COUNT(*) * 100) as redactionPercentage,
        SUM(redaction_count) as totalRedactions
      FROM documents
    `,
      )
      .get();
    console.timeEnd('analytics-redaction-stats');

    console.time('analytics-top-relationships');
    // Top relationships
    const topRelationships = db
      .prepare(
        `
      SELECT 
        e1.full_name as source,
        e2.full_name as target,
        er.relationship_type as type,
        er.strength as weight
      FROM entity_relationships er
      JOIN entities e1 ON er.source_entity_id = e1.id
      JOIN entities e2 ON er.target_entity_id = e2.id
      ORDER BY er.strength DESC
      LIMIT 2000
    `,
      )
      .all();
    console.timeEnd('analytics-top-relationships');

    res.set('Cache-Control', 'public, max-age=300'); // 5 min cache
    res.json({
      documentsByType,
      timelineData,
      topConnectedEntities,
      entityTypeDistribution,
      riskByType,
      redactionStats,
      topRelationships,
      totalCounts: {
        entities: db.prepare('SELECT COUNT(*) as count FROM entities').get().count,
        documents: db.prepare('SELECT COUNT(*) as count FROM documents').get().count,
        relationships: db.prepare('SELECT COUNT(*) as count FROM entity_relationships').get().count,
      },
      generatedAt: new Date().toISOString(),
    });
    console.timeEnd('analytics-total');
  } catch (error) {
    console.error('❌ Error fetching enhanced analytics:', error);
    next(error);
  }
});

// Apply Auth Middleware to all other API routes
// Authentication middleware - Selective protection
app.use('/api', (req, res, next) => {
  // 1. User management and profile info always require auth
  if (req.path.startsWith('/users') || req.path.startsWith('/auth/me')) {
    return authenticateRequest(req, res, next);
  }

  // 2. All investigative browsing (GET/HEAD/OPTIONS requests) is public per user request
  // (media, entities, search, analytics, flights, memory)
  // OPTIONS is whitelisted to allow CORS preflights to succeed for public routes.
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  // 3. All mutations (POST, PUT, PATCH, DELETE) require authentication
  // This protects media editing, adding entities, and document uploads.
  authenticateRequest(req, res, next);
});

// Email routes (protected)
app.use('/api/emails', emailRoutes);

// User Management Endpoints
app.get('/api/users', async (_req, res, next) => {
  try {
    const db = getDb();
    const users = db.prepare('SELECT * FROM users ORDER BY username ASC').all();
    res.json(users);
  } catch (e) {
    next(e);
  }
});

app.get('/api/users/current', async (req, res, next) => {
  // Simple simulation of session/auth
  try {
    const db = getDb();
    // Default to the first user if no header (in real app, would use session/token)
    const userId = req.headers['x-user-id'] || 'user-1';
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    next(e);
  }
});

// Create new user (Admin only)
app.post('/api/users', authenticateRequest, requireRole('admin'), async (req, res, next) => {
  try {
    const { username, password, email, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const id = `user-${Date.now()}`;
    const db = getDb();

    // Hash password
    const passwordHash = bcrypt.hashSync(password, 10);

    db.prepare(
      `
      INSERT INTO users (id, username, email, role, password_hash, created_at, last_active)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    ).run(id, username, email || null, role || 'viewer', passwordHash);

    logAudit('create_user', (req as any).user?.id, 'user', id, { username, role });
    res.status(201).json({ id, username, email, role });
  } catch (e) {
    next(e);
  }
});

// Update user (Admin only)
app.put('/api/users/:id', authenticateRequest, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const { email, role, password } = req.body;
    const db = getDb();

    let query = 'UPDATE users SET last_active = CURRENT_TIMESTAMP';
    const params: any[] = [];

    if (email !== undefined) {
      query += ', email = ?';
      params.push(email);
    }

    if (role !== undefined) {
      // Prevent self-lockout? simplified for now
      query += ', role = ?';
      params.push(role);
    }

    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      query += ', password_hash = ?';
      params.push(hash);
    }

    query += ' WHERE id = ?';
    params.push(id);

    const result = db.prepare(query).run(...params);

    if (result.changes === 0) return res.status(404).json({ error: 'User not found' });

    logAudit('update_user', (req as any).user?.id, 'user', id, {
      role,
      emailUpdated: !!email,
      passwordUpdated: !!password,
    });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// Delete user (Admin only)
app.delete('/api/users/:id', authenticateRequest, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const db = getDb();

    // Prevent self-deletion
    if ((req as any).user?.id === id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);

    if (result.changes === 0) return res.status(404).json({ error: 'User not found' });

    logAudit('delete_user', (req as any).user?.id, 'user', id, {});
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// Admin Audit Log Endpoint
app.get(
  '/api/admin/audit-logs',
  authenticateRequest,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const limit = Math.min(1000, parseInt(req.query.limit as string) || 100); // Increased limit
      const db = getDb();

      // Check if audit_log table exists (it should, but safety first)
      try {
        const logs = db
          .prepare(
            `
        SELECT a.*, u.username as performed_by
        FROM audit_log a 
        LEFT JOIN users u ON a.user_id = u.id 
        ORDER BY a.timestamp DESC 
        LIMIT ?
      `,
          )
          .all(limit);

        // Parse payload_json safely
        const parsedLogs = logs.map((log: any) => {
          let payload = null;
          try {
            payload = log.payload_json ? JSON.parse(log.payload_json) : null;
          } catch (_e) {
            payload = { error: 'Invalid JSON', raw: log.payload_json };
          }
          return { ...log, payload };
        });

        res.json(parsedLogs);
      } catch (dbError: any) {
        if (dbError.message.includes('no such table')) {
          // Create table if missing (auto-heal)
          db.exec(`
          CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            action TEXT NOT NULL,
            object_type TEXT,
            object_id TEXT,
            payload_json TEXT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);
          return res.json([]);
        }
        throw dbError;
      }
    } catch (e) {
      next(e);
    }
  },
);

// Document Upload Endpoint with Security Validation (Issue 20)
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
];
const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.docx', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `doc-${uniqueSuffix}${ext}`);
  },
});

const uploadFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`));
  }
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`MIME type not allowed: ${file.mimetype}`));
  }
  cb(null, true);
};

const upload = multer({
  storage: uploadStorage,
  fileFilter: uploadFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

app.post('/api/upload-document', upload.single('document'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = (req as any).user?.id || 'system';
    const db = getDb();

    // Calculate file hash for integrity
    const fileBuffer = fs.readFileSync(file.path);
    const contentHash = crypto.createHash('md5').update(fileBuffer).digest('hex');

    // Determine evidence type from extension
    const ext = path.extname(file.originalname).toLowerCase();
    const evidenceType =
      ext === '.pdf'
        ? 'Legal Document'
        : ['.jpg', '.jpeg', '.png'].includes(ext)
          ? 'Photograph'
          : 'Text Document';

    // Insert document record
    const result = db
      .prepare(
        `
      INSERT INTO documents (file_name, file_path, file_type, file_size, evidence_type, content_hash, created_at, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
    `,
      )
      .run(
        file.originalname,
        file.path,
        ext.replace('.', ''),
        file.size,
        evidenceType,
        contentHash,
        JSON.stringify({ uploadedBy: userId, ingestionMethod: 'upload', scanStatus: 'pending' }),
      );

    const documentId = result.lastInsertRowid;

    // Create initial chain of custody entry
    try {
      db.prepare(
        `
        INSERT INTO chain_of_custody (evidence_id, action, performed_by, timestamp, details, hash_before, hash_after)
        VALUES (?, 'acquired', ?, datetime('now'), ?, ?, ?)
      `,
      ).run(documentId, userId, 'Document uploaded via API', contentHash, contentHash);
    } catch (e) {
      // chain_of_custody might not be set up for document IDs, continue anyway
      console.warn('Could not create chain_of_custody entry:', e);
    }

    // Audit log
    logAudit('upload_document', userId, 'document', String(documentId), {
      filename: file.originalname,
      size: file.size,
      hash: contentHash,
    });

    res.status(201).json({
      id: documentId,
      fileName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      contentHash,
      evidenceType,
      message: 'Document uploaded successfully',
    });
  } catch (error) {
    console.error('Upload error:', error);
    next(error);
  }
});

// API routes with comprehensive error handling
app.get('/api/entities', cacheMiddleware(300), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 24));
    const search = req.query.search as string;
    const role = req.query.role as string;
    const likelihood = req.query.likelihood as string | string[];
    const entityType = req.query.type as string;
    const sortBy = req.query.sortBy as string;
    const sortOrder = req.query.sortOrder as 'asc' | 'desc';

    // Validate and sanitize inputs
    if (search && search.length > 100) {
      return res.status(400).json({ error: 'Search term too long' });
    }

    const filters: SearchFilters = {
      likelihood: 'all',
      role: 'all',
      status: 'all',
      minMentions: 0,
      searchTerm: undefined,
      evidenceTypes: undefined,
      likelihoodScore: undefined,
      entityType: undefined,
      sortBy: undefined,
      sortOrder: undefined,
    };

    if (search) filters.searchTerm = search.trim();
    if (role) filters.evidenceTypes = [role.trim()];
    if (likelihood) {
      if (Array.isArray(likelihood)) {
        filters.likelihoodScore = likelihood.map((l) => l as 'HIGH' | 'MEDIUM' | 'LOW');
      } else {
        filters.likelihoodScore = [likelihood as 'HIGH' | 'MEDIUM' | 'LOW'];
      }
    }
    if (entityType) filters.entityType = entityType.trim();
    if (sortBy) filters.sortBy = sortBy.trim() as any;
    if (sortOrder) filters.sortOrder = sortOrder;

    const result = entitiesRepository.getEntities(page, limit, filters, sortBy as SortOption);

    // Batch fetch photos for these entities
    const entityIds = result.entities.map((e: any) => e.id);
    const photosByEntity: Record<string, any[]> = {};

    if (entityIds.length > 0) {
      try {
        const photos = mediaRepository.getPhotosForEntities(entityIds);
        photos.forEach((p: any) => {
          if (!photosByEntity[p.entityId]) photosByEntity[p.entityId] = [];
          photosByEntity[p.entityId].push(p);
        });
      } catch (err) {
        console.error('Error fetching entity photos:', err);
      }
    }

    // Transform the result to match the expected format
    const transformedData = result.entities.map((entity: any) => ({
      id: entity.id,
      name: entity.full_name || entity.fullName,
      fullName: entity.full_name || entity.fullName,
      entity_type: entity.entity_type || entity.entityType || 'Person',
      primaryRole: entity.primary_role || entity.primaryRole || 'Person of Interest',
      secondaryRoles: entity.secondary_roles || entity.secondaryRoles || [],
      mentions: entity.mentions,
      files: entity.document_count || entity.files || entity.documentCount || 0,
      contexts: entity.contexts || [],
      evidence_types: entity.evidence_types || entity.evidenceTypes || [],
      evidenceTypes: entity.evidence_types || entity.evidenceTypes || [],
      photos: photosByEntity[entity.id] || [],
      spicy_passages: entity.red_flag_passages || entity.spicyPassages || [],
      likelihood_score: (entity.risk_level || entity.riskLevel || 'LOW').toUpperCase(),
      red_flag_score: entity.red_flag_score !== undefined ? entity.red_flag_score : 0,
      red_flag_rating: entity.red_flag_rating !== undefined ? entity.red_flag_rating : 0,
      red_flag_peppers:
        entity.red_flag_rating !== undefined ? '🚩'.repeat(entity.red_flag_rating) : '🏳️',
      red_flag_description:
        entity.red_flag_description ||
        entity.redFlagDescription ||
        `Red Flag Index ${entity.red_flag_rating || entity.redFlagRating || 0}`,
      connectionsToEpstein: entity.connections_summary || entity.connectionsSummary || '',
    }));

    // Add cache headers for performance
    res.set({
      'Cache-Control': 'private, max-age=60',
      'X-Total-Count': result.total.toString(),
      'X-Page': page.toString(),
      'X-Page-Size': limit.toString(),
      'X-Total-Pages': Math.ceil(result.total / limit).toString(),
    });

    res.json({
      data: transformedData,
      total: result.total,
      page: page,
      pageSize: limit,
      totalPages: Math.ceil(result.total / limit),
    });
  } catch (error) {
    console.error('Error fetching entities:', error);
    next(error);
  }
});

// Entity name validation patterns - reject common extraction artifacts
const JUNK_ENTITY_PATTERNS = [
  /^(The|A|An|Of|To|In|For|And|Or|But|With|At|By|From|On|As|Is|Was|Although|Actually)\s/i,
  /^.{1,2}$/, // Too short (1-2 chars)
  /^\d+$/, // Numbers only
  /^[^a-zA-Z]*$/, // No letters
  /^Page\s+\d+/i,
  /^Section\s+\d+/i,
  /^Document\s+/i,
  /^(Unknown|None|Null|N\/A|TBD)$/i,
];

app.post('/api/entities', async (req, res, next) => {
  try {
    const { full_name } = req.body;

    // Validate entity name to prevent junk data
    if (full_name) {
      for (const pattern of JUNK_ENTITY_PATTERNS) {
        if (pattern.test(full_name)) {
          return res.status(400).json({
            error: 'Invalid entity name',
            message: 'Name appears to be an extraction artifact rather than a valid entity',
          });
        }
      }
    }

    const id = entitiesRepository.createEntity(req.body);
    logAudit('create_entity', (req as any).user?.id, 'entity', String(id), {
      name: req.body.full_name,
    });
    res.status(201).json({ id });
  } catch (e) {
    next(e);
  }
});

app.patch('/api/entities/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const changes = entitiesRepository.updateEntity(id, req.body);
    if (changes === 0) return res.status(404).json({ error: 'Not found or no changes' });
    logAudit('update_entity', (req as any).user?.id, 'entity', String(id), req.body);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// Get all entities for document linking
app.get('/api/entities/all', cacheMiddleware(300), async (_req, res, next) => {
  try {
    const entities = entitiesRepository.getAllEntities();
    res.json(entities);
  } catch (error) {
    console.error('Error fetching all entities:', error);
    next(error);
  }
});

// Get single entity with error handling
app.get('/api/entities/:id', async (req, res, next) => {
  try {
    const entityId = req.params.id;

    // Validate ID format
    if (!/^\d+$/.test(entityId)) {
      // Special case: if id is 'all', return all entities
      if (entityId === 'all') {
        const entities = entitiesRepository.getAllEntities();
        return res.json(entities);
      }
      return res.status(400).json({ error: 'Invalid entity ID format' });
    }

    const entity = entitiesRepository.getEntityById(entityId) as any;

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    // Transform entity to match expected API format
    const transformedEntity = {
      id: entity.id,
      name: entity.fullName,
      fullName: entity.fullName,
      entity_type: entity.entityType || 'Person',
      primaryRole: entity.primaryRole,
      secondaryRoles: entity.secondaryRoles || [],
      mentions: entity.mentions,
      files: entity.documentCount || (entity.fileReferences ? entity.fileReferences.length : 0),
      contexts: entity.contexts || [],
      evidence_types: entity.evidence_types || entity.evidenceTypes || [],
      evidenceTypes: entity.evidence_types || entity.evidenceTypes || [],
      spicy_passages: entity.spicyPassages || [],
      likelihood_score: (entity.risk_level || entity.riskLevel || 'LOW').toUpperCase(),
      red_flag_score: entity.red_flag_score !== undefined ? entity.red_flag_score : 0,
      red_flag_rating: entity.red_flag_rating !== undefined ? entity.red_flag_rating : 0,
      red_flag_peppers:
        entity.redFlagRating !== undefined ? '🚩'.repeat(entity.redFlagRating) : '🏳️',
      red_flag_description:
        entity.redFlagDescription ||
        `Red Flag Index ${entity.redFlagRating !== undefined ? entity.redFlagRating : 0}`,
      connectionsToEpstein: entity.connectionsSummary || '',
      fileReferences: entity.fileReferences || [],
      timelineEvents: entity.timelineEvents || [],
      networkConnections: entity.networkConnections || [],
      // Include Black Book information if available
      blackBookEntry: entity.blackBookEntry || null,
    };
    res.json(transformedEntity);
  } catch (error) {
    console.error('Error fetching entity:', error);
    next(error);
  }
});

// Communications for an entity (email-based)
app.get('/api/entities/:id/communications', async (req, res, next) => {
  try {
    const entityId = req.params.id;
    if (!/^\d+$/.test(entityId)) {
      return res.status(400).json({ error: 'Invalid entity ID format' });
    }

    const topic = (req.query.topic as string | undefined) || undefined;
    const from = (req.query.from as string | undefined) || undefined;
    const to = (req.query.to as string | undefined) || undefined;
    const start = (req.query.start as string | undefined) || undefined;
    const end = (req.query.end as string | undefined) || undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    const events = communicationsRepository.getCommunicationsForEntity(entityId, {
      topic,
      from,
      to,
      start,
      end,
      limit,
    });

    res.json({ data: events, total: events.length });
  } catch (error) {
    console.error('Error fetching entity communications:', error);
    next(error);
  }
});

// Mount Articles Routes
app.use('/api/articles', articlesRoutes);

// Get documents for a specific entity
app.get('/api/entities/:id/documents', async (req, res, next) => {
  try {
    const entityId = req.params.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));

    // Get entity name first
    const entity = getDb()
      .prepare('SELECT full_name as name FROM entities WHERE id = ?')
      .get(entityId) as { name: string };

    if (!entity) {
      return res.json({ data: [], total: 0, page, pageSize: limit, totalPages: 0 });
    }

    // Query documents that mention this entity (using simple name search)
    const offset = (page - 1) * limit;
    const searchTerm = `%${entity.name}%`;

    const query = `
      SELECT 
        d.id,
        d.file_name as fileName,
        d.file_path as filePath,
        d.file_type as fileType,
        d.file_size as fileSize,
        d.date_created as dateCreated,
        substr(d.content, 1, 300) as contentPreview,
        d.evidence_type as evidenceType,
        0 as mentionsCount,
        d.content,
        d.metadata_json as metadata,
        d.word_count as wordCount,
        d.red_flag_rating as redFlagRating,
        d.content_hash as contentHash,
        d.file_name as title,
        0 as entityMentions
      FROM documents d
      WHERE d.content LIKE ? OR d.file_name LIKE ?
      ORDER BY d.red_flag_rating DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM documents d
      WHERE d.content LIKE ? OR d.file_name LIKE ?
    `;

    let documents = getDb().prepare(query).all(searchTerm, searchTerm, limit, offset) as any[];

    // Map file paths to URLs
    documents = documents.map((doc) => {
      if (doc.filePath && doc.filePath.startsWith(CORPUS_BASE_PATH)) {
        doc.filePath = doc.filePath.replace(CORPUS_BASE_PATH, '/files');
      }
      return doc;
    });

    const totalResult = getDb().prepare(countQuery).get(searchTerm, searchTerm) as {
      total: number;
    };

    res.json({
      data: documents,
      total: totalResult.total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(totalResult.total / limit),
    });
  } catch (error) {
    console.error('Error fetching entity documents:', error);
    next(error);
  }
});

// Black Book endpoint - returns entries from Black Book table
app.get('/api/black-book', cacheMiddleware(300), async (req, res, next) => {
  try {
    const filters = {
      letter: req.query.letter as string | undefined,
      search: req.query.search as string | undefined,
      hasPhone: req.query.hasPhone === 'true',
      hasEmail: req.query.hasEmail === 'true',
      hasAddress: req.query.hasAddress === 'true',
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };

    // Get data
    const entries = blackBookRepository.getBlackBookEntries(filters);

    // Get total count (inefficient but accurate for now - better to add a count method to repo)
    // Actually, let's just do a quick count query here or modify repo.
    // For now, removing limit to get total would be slow.
    // Let's use the repository to get the count if possible, or just hack it:
    // We'll create a lightweight count query using existing filters but no limit.
    // OR just use SQL here directly since we have getDb.

    const db = getDb();
    // Reconstruct where clause logic roughly or use repo?
    // Repo doesn't expose count. Let's add count support to repo or just query all IDs.
    // Simplest fix: Just query a count.
    const countQuery = `SELECT COUNT(*) as total FROM black_book_entries`;
    // Note: this ignores filters. But AboutPage uses it for "Total Black Book entries", so ignoring filters is actually CORRECT behavior for the stats use case!
    // The About Page calls it with limit=1 but wants "Total Entries in DB".

    const totalResult = db.prepare(countQuery).get() as { total: number };

    res.json({
      data: entries,
      total: totalResult.total,
      page: 1,
      pageSize: entries.length,
      totalPages: Math.ceil(totalResult.total / (filters.limit || totalResult.total || 1)),
    });
  } catch (error) {
    console.error('Error fetching Black Book:', error);
    next(error);
  }
});

// Get database statistics
app.get('/api/stats', cacheMiddleware(300), async (_req, res, next) => {
  try {
    const stats = statsRepository.getStatistics();
    res.set('Cache-Control', 'public, max-age=300'); // 5 min cache
    res.json(stats);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    next(error);
  }
});

// ============ DATA QUALITY & PROVENANCE APIs ============
// These endpoints support the audit/trust features of the platform

// Get comprehensive data quality metrics
app.get('/api/data-quality/metrics', async (_req, res, next) => {
  try {
    const db = getDb();

    // 1. Basic Document Stats
    const totalDocs = db.prepare('SELECT COUNT(*) as c FROM documents').get() as { c: number };
    const docsWithProvenance = db
      .prepare(
        "SELECT COUNT(*) as c FROM documents WHERE source_collection IS NOT NULL AND source_collection != ''",
      )
      .get() as { c: number };

    const sourceCollections = db
      .prepare(
        `
      SELECT COALESCE(source_collection, 'Unknown/Untagged') as name, COUNT(*) as count
      FROM documents GROUP BY source_collection ORDER BY count DESC LIMIT 20
    `,
      )
      .all();

    const evidenceTypes = db
      .prepare(
        `
      SELECT COALESCE(evidence_type, 'unclassified') as type, COUNT(*) as count
      FROM documents GROUP BY evidence_type ORDER BY count DESC
    `,
      )
      .all();

    // 2. Entity Quality Metrics
    const entityStats = db
      .prepare(
        `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN primary_role IS NOT NULL AND primary_role != 'Unknown' AND primary_role != '' THEN 1 ELSE 0 END) as withRoles,
        SUM(CASE WHEN red_flag_description IS NOT NULL AND red_flag_description != '' THEN 1 ELSE 0 END) as withDescription,
        SUM(CASE WHEN (red_flag_rating IS NULL OR red_flag_rating = 0) AND mentions > 0 THEN 1 ELSE 0 END) as missingRatings,
        SUM(CASE WHEN red_flag_rating IS NULL THEN 1 ELSE 0 END) as nullRedFlagRating
      FROM entities
    `,
      )
      .get() as any;

    // 3. Data Integrity & Junk Detection
    const orphanedMentions = db
      .prepare(
        `
      SELECT COUNT(*) as c FROM entity_mentions em
      LEFT JOIN entities e ON em.entity_id = e.id
      WHERE e.id IS NULL
    `,
      )
      .get() as { c: number };

    // Optimized junk detection (one query instead of many)
    const junkPatterns = [
      'On %',
      'And %',
      'The %',
      'Although %',
      'Actually %',
      'Mr %',
      'Ms %',
      'Dr %',
      'However %',
      'But %',
      'If %',
      'When %',
      'Then %',
      'So %',
      'Yet %',
      'Or %',
      'As %',
      'At %',
      'In %',
      'To %',
      'For %',
      'Of %',
      'With %',
      'By %',
      'About %',
      'Into %',
      'Through %',
      'During %',
      'Before %',
      'After %',
      'Above %',
      'Below %',
      'Between %',
      'Among %',
      'Within %',
      'Without %',
      'Under %',
      'Over %',
      'Near %',
      'Since %',
      'Until %',
      'Against %',
      'Throughout %',
      'Despite %',
      'Upon %',
      'Besides %',
      'Beyond %',
      'Inside %',
      'Outside %',
    ];

    // Build a single query to count all junk patterns at once
    const junkWhereClause = junkPatterns.map(() => 'full_name LIKE ?').join(' OR ');
    const junkEntities = db
      .prepare(
        `
      SELECT COUNT(*) as c FROM entities
      WHERE LENGTH(full_name) <= 2
        OR ${junkWhereClause}
        OR full_name GLOB '[0-9]*' -- Starts with a number
    `,
      )
      .get(...junkPatterns) as { c: number };

    // 4. Score Calculation
    const totalEntities = entityStats.total || 1;
    const junkRatio = junkEntities.c / totalEntities;
    const orphanedRatio = orphanedMentions.c / Math.max(1, totalDocs.c);

    const dataQualityScore = Math.max(0, Math.min(100, 100 - junkRatio * 50 - orphanedRatio * 30));

    res.json({
      totalDocuments: totalDocs.c,
      documentsWithProvenance: docsWithProvenance.c,
      provenanceCoverage:
        totalDocs.c > 0 ? Math.round((docsWithProvenance.c / totalDocs.c) * 100 * 10) / 10 : 0,
      sourceCollections,
      evidenceTypeDistribution: evidenceTypes,
      entityQuality: {
        total: entityStats.total,
        withRoles: entityStats.withRoles,
        withRedFlagDescription: entityStats.withDescription,
        nullRedFlagRating: entityStats.nullRedFlagRating || 0,
        missingRedFlagRatings: entityStats.missingRatings,
      },
      dataIntegrity: {
        orphanedEntityMentions: orphanedMentions.c,
        potentialJunkEntities: junkEntities.c,
        dataQualityScore: Math.round(dataQualityScore * 10) / 10,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching data quality metrics:', error);
    next(error);
  }
});

// Get document lineage/provenance
app.get('/api/documents/:id/lineage', async (req, res, next) => {
  try {
    const db = getDb();
    const docId = req.params.id;

    const doc = db
      .prepare(
        `
      SELECT d.*, orig.file_name as original_file_name, orig.file_path as original_file_path
      FROM documents d
      LEFT JOIN documents orig ON d.original_file_id = orig.id
      WHERE d.id = ?
    `,
      )
      .get(docId) as any;

    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const children = db
      .prepare(
        `
      SELECT id, file_name, page_number FROM documents WHERE parent_id = ? ORDER BY page_number ASC
    `,
      )
      .all(docId);

    const auditEntries = db
      .prepare(
        `
      SELECT timestamp, user_id, action, payload_json FROM audit_log
      WHERE object_type = 'document' AND object_id = ? ORDER BY timestamp DESC LIMIT 20
    `,
      )
      .all(String(docId));

    res.json({
      document: {
        id: doc.id,
        fileName: doc.file_name,
        sourceCollection: doc.source_collection,
        sourceOriginalUrl: doc.source_original_url,
        credibilityScore: doc.credibility_score,
        ocrEngine: doc.ocr_engine,
        ocrQualityScore: doc.ocr_quality_score,
        processedAt: doc.ocr_processed_at,
      },
      originalDocument: doc.original_file_id
        ? { id: doc.original_file_id, fileName: doc.original_file_name }
        : null,
      childDocuments: children,
      auditTrail: auditEntries.map((e: any) => ({
        timestamp: e.timestamp,
        user: e.user_id,
        action: e.action,
        details: e.payload_json ? JSON.parse(e.payload_json) : null,
      })),
    });
  } catch (error) {
    console.error('Error fetching document lineage:', error);
    next(error);
  }
});

// Get entity confidence scoring
app.get('/api/entities/:id/confidence', async (req, res, next) => {
  try {
    const db = getDb();
    const entityId = req.params.id;

    const entity = db
      .prepare('SELECT id, full_name FROM entities WHERE id = ?')
      .get(entityId) as any;
    if (!entity) return res.status(404).json({ error: 'Entity not found' });

    const mentionsByType = db
      .prepare(
        `
      SELECT d.evidence_type, COUNT(*) as count FROM entity_mentions em
      JOIN documents d ON em.document_id = d.id WHERE em.entity_id = ? GROUP BY d.evidence_type
    `,
      )
      .all(entityId) as { evidence_type: string; count: number }[];

    const typeWeights: Record<string, number> = {
      legal: 1.0,
      testimony: 0.9,
      flight_log: 0.85,
      financial: 0.8,
      email: 0.7,
      document: 0.6,
      photo: 0.5,
    };
    let weightedScore = 0,
      totalWeight = 0;
    for (const m of mentionsByType) {
      const w = typeWeights[m.evidence_type] || 0.5;
      weightedScore += w * m.count;
      totalWeight += m.count;
    }
    const confidence =
      totalWeight > 0 ? Math.min(100, Math.round((weightedScore / totalWeight) * 100)) : 0;

    res.json({
      entityId,
      entityName: entity.full_name,
      confidenceScore: confidence,
      evidenceBreakdown: mentionsByType,
      totalMentions: totalWeight,
      confidenceLevel: confidence >= 80 ? 'High' : confidence >= 50 ? 'Medium' : 'Low',
    });
  } catch (error) {
    console.error('Error calculating entity confidence:', error);
    next(error);
  }
});

// Enhanced Analytics API - Aggregated data for visualizations
// Forensic Metrics Summary (Tier 3 - Advanced Analytics)

// Forensic Metrics Summary (Tier 3 - Advanced Analytics)

// Documents endpoint - returns paginated documents
app.get('/api/documents', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50000, Math.max(1, parseInt(req.query.limit as string) || 50));
    const sortBy = (req.query.sortBy as string) || 'red_flag';
    const search = req.query.search as string;
    const fileType = req.query.fileType as string;
    const evidenceType = req.query.evidenceType as string;
    const minRedFlag = parseInt(req.query.minRedFlag as string) || 0;
    const maxRedFlag = parseInt(req.query.maxRedFlag as string) || 5;

    // Build WHERE clause
    const whereConditions: string[] = [];
    const params: any[] = [];

    if (search && search.trim()) {
      whereConditions.push('(file_name LIKE ? OR content LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    if (fileType && fileType !== 'all') {
      const types = fileType.split(',');
      whereConditions.push(`file_type IN (${types.map(() => '?').join(',')})`);
      params.push(...types);
    }

    // Evidence type filter (category)
    if (evidenceType && evidenceType !== 'all') {
      whereConditions.push('evidence_type = ?');
      params.push(evidenceType);
    }

    // Only apply Red Flag filter if explicitly requested (not default values)
    if (req.query.minRedFlag || req.query.maxRedFlag) {
      whereConditions.push(
        '(red_flag_rating IS NULL OR (red_flag_rating >= ? AND red_flag_rating <= ?))',
      );
      params.push(minRedFlag, maxRedFlag);
    }

    // Filter for documents with failed redactions
    if (req.query.hasFailedRedactions === 'true') {
      whereConditions.push('has_failed_redactions = 1');
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Build ORDER BY clause (kept for future use; currently unused in query construction)
    const _orderByClause = (() => {
      switch (sortBy) {
        case 'date':
          return 'date_created DESC';
        case 'title':
          return 'file_name ASC';
        case 'red_flag':
        default:
          return 'red_flag_rating DESC, date_created DESC';
      }
    })();

    // Query documents from database
    const offset = (page - 1) * limit;

    // Use simple count
    const countQuery = `SELECT COUNT(*) as total FROM documents ${whereClause}`;

    params.push(limit, offset);
    // Use try-catch for the query itself to catch column errors specifically
    const result = documentsRepository.getDocuments(page, limit, {
      search: search,
      fileType: fileType,
      evidenceType: evidenceType,
      minRedFlag: minRedFlag,
      maxRedFlag: maxRedFlag,
      sortBy: sortBy,
    });

    // Map file paths to URLs
    const mappedDocuments = result.documents.map((doc: any) => {
      if (doc.filePath && doc.filePath.startsWith(CORPUS_BASE_PATH)) {
        doc.filePath = doc.filePath.replace(CORPUS_BASE_PATH, '/files');
      }
      return doc;
    });

    // Remove limit/offset for count query
    const countParams = params.slice(0, -2);
    const totalResult = getDb()
      .prepare(countQuery)
      .get(...countParams) as { total: number };

    res.json({
      data: mappedDocuments,
      total: totalResult.total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(totalResult.total / limit),
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    next(error);
  }
});

// Get single document by ID
app.get('/api/documents/:id', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const doc = documentsRepository.getDocumentById(id) as any;
    if (!doc) {
      return res.status(404).json({ error: 'not_found' });
    }

    // Transform file paths to accessible URLs
    // First check if it's in the local data directory (using loose check for migrated paths)
    if (doc.file_path && (doc.file_path.includes('/data/') || doc.file_path.includes('\\data\\'))) {
      // Replace everything up to and including /data/ with /data/
      doc.fileUrl = doc.file_path.replace(/^.*[/\\]data[/\\]/, '/data/').replace(/\\/g, '/');
    } else if (doc.file_path && doc.file_path.startsWith(CORPUS_BASE_PATH)) {
      doc.fileUrl = doc.file_path.replace(CORPUS_BASE_PATH, '/files');
    }

    if (doc.original_file_path) {
      if (
        doc.original_file_path.includes('/data/') ||
        doc.original_file_path.includes('\\data\\')
      ) {
        doc.originalFileUrl = doc.original_file_path
          .replace(/^.*[/\\]data[/\\]/, '/data/')
          .replace(/\\/g, '/');
      } else if (doc.original_file_path.startsWith(CORPUS_BASE_PATH)) {
        doc.originalFileUrl = doc.original_file_path.replace(CORPUS_BASE_PATH, '/files');
      } else if (doc.original_file_path.startsWith('data/')) {
        // Handle relative paths like 'data/originals/filename.pdf'
        doc.originalFileUrl = '/' + doc.original_file_path;
      } else {
        // Fallback: serve from /files
        doc.originalFileUrl = '/files/' + doc.original_file_path;
      }
    }

    // Also check if this is an image with OCR content - provide link to view original
    if (doc.file_type === 'image' || doc.file_type === 'pdf') {
      doc.isScannedDocument = true;
    }

    res.json(doc);
  } catch (error) {
    console.error('Error fetching document by id:', error);
    next(error);
  }
});

// Email thread context for a document
app.get('/api/documents/:id/thread', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const thread = communicationsRepository.getThreadForDocument(id);
    if (!thread) {
      return res.status(404).json({ error: 'thread_not_found' });
    }
    res.json(thread);
  } catch (error) {
    console.error('Error fetching email thread for document:', error);
    next(error);
  }
});

// Get failed redactions for a document
app.get('/api/documents/:id/redactions', async (req, res, next) => {
  try {
    const id = req.params.id as string;

    const doc = getDb()
      .prepare(
        `
      SELECT 
        id,
        has_failed_redactions,
        failed_redaction_count,
        failed_redaction_data
      FROM documents
      WHERE id = ?
    `,
      )
      .get(id) as any;

    if (!doc) {
      return res.status(404).json({ error: 'not_found' });
    }

    if (!doc.has_failed_redactions) {
      return res.json({
        hasFailedRedactions: false,
        count: 0,
        redactions: [],
      });
    }

    let redactions = [];
    try {
      redactions = doc.failed_redaction_data ? JSON.parse(doc.failed_redaction_data) : [];
    } catch (e) {
      console.error('Error parsing redaction data:', e);
    }

    res.json({
      hasFailedRedactions: true,
      count: doc.failed_redaction_count || redactions.length,
      redactions,
    });
  } catch (error) {
    console.error('Error fetching document redactions:', error);
    next(error);
  }
});

// Get original pages for a document
app.get('/api/documents/:id/pages', async (req, res, next) => {
  try {
    const id = req.params.id as string;

    // First check if there's a document_pages table entry (if table exists)
    let dbPages: any[] = [];
    try {
      dbPages = getDb()
        .prepare('SELECT * FROM document_pages WHERE document_id = ? ORDER BY page_number ASC')
        .all(id) as any[];
    } catch {
      // Table doesn't exist, continue with other methods
    }

    if (dbPages.length > 0) {
      // Return pages from the document_pages table
      const pages = dbPages.map((p: any) => {
        if (p.page_path && p.page_path.startsWith(CORPUS_BASE_PATH)) {
          return p.page_path.replace(CORPUS_BASE_PATH, '/files');
        }
        return p.page_path || p.page_url;
      });
      return res.json({ pages, total: pages.length });
    }

    // Otherwise, check if request is an OCR document and find its original image
    const doc = documentsRepository.getDocumentById(id) as any;
    if (!doc) {
      return res.status(404).json({ error: 'not_found' });
    }

    // Check for "House Oversight XXX-OCR.txt" pattern
    // Also check for explicit image folder path in metadata
    let imageFolder = null;
    try {
      if (doc.metadataJson) {
        const meta = JSON.parse(doc.metadataJson);
        if (meta.image_folder_path) {
          imageFolder = meta.image_folder_path;
        }
      }
    } catch {
      // Ignore JSON parse errors - imageFolder remains empty
    }

    const oversightMatch = doc.fileName.match(/^House Oversight (\d+)-OCR\.txt$/i);

    if (imageFolder || oversightMatch) {
      const folderNum = imageFolder ? path.basename(imageFolder) : oversightMatch![1]; // e.g., "001"

      // Construct path to images folder
      // Assuming structure: CORPUS_BASE_PATH/Epstein Estate Documents - Seventh Production/IMAGES/{folderNum}/
      const pathLib = path;

      let imagesBase = '';
      if (imageFolder) {
        // If we have an explicit path (e.g. /IMAGES/001), try to construct full path
        // The stored path is relative to the "root" of the corpus usually, or just the folder name.
        // Let's assume it's relative to CORPUS_BASE_PATH + 'Epstein Estate Documents - Seventh Production'
        // OR just relative to CORPUS_BASE_PATH.
        // The migration script set it to `/IMAGES/${volNum}`.
        imagesBase = pathLib.join(
          CORPUS_BASE_PATH,
          'Epstein Estate Documents - Seventh Production',
          imageFolder,
        );
        if (!fs.existsSync(imagesBase)) {
          imagesBase = pathLib.join(CORPUS_BASE_PATH, imageFolder);
        }
      } else {
        // Fallback to old logic
        imagesBase = pathLib.join(
          CORPUS_BASE_PATH,
          'Epstein Estate Documents - Seventh Production',
          'IMAGES',
          folderNum,
        );
      }

      if (!fs.existsSync(imagesBase)) {
        // Try without the "Seventh Production" folder just in case
        // If folderNum is derived from regex
        if (folderNum) {
          imagesBase = pathLib.join(CORPUS_BASE_PATH, 'IMAGES', folderNum);
        }
      }

      if (fs.existsSync(imagesBase)) {
        try {
          const files = fs.readdirSync(imagesBase);
          const imageFiles = files
            .filter((f: string) => /\.(jpg|jpeg|png)$/i.test(f))
            .sort() // Ensure alphanumeric sort
            .map((f: string) => {
              // Construct URL relative to /files
              // We need to map absolute path to /files URL
              const absPath = pathLib.join(imagesBase, f);
              if (absPath.startsWith(CORPUS_BASE_PATH)) {
                return absPath.replace(CORPUS_BASE_PATH, '/files').replace('//', '/');
              }
              return '/files/' + pathLib.relative(CORPUS_BASE_PATH, absPath);
            });

          if (imageFiles.length > 0) {
            return res.json({ pages: imageFiles, total: imageFiles.length });
          }
        } catch (e) {
          console.error('Error reading image directory:', e);
        }
      }
    }

    // Check for linked original file
    if (doc.original_file_path) {
      let url = doc.original_file_path;
      if (CORPUS_BASE_PATH && url.startsWith(CORPUS_BASE_PATH)) {
        url = url.replace(CORPUS_BASE_PATH, '/files');
      }
      // Handle potential double slashes
      url = url.replace('//', '/');
      return res.json({ pages: [url], total: 1 });
    }

    // If this document IS an image/PDF, return its own path
    if (doc.file_type === 'image' || doc.file_type === 'pdf') {
      let url = doc.file_path;
      if (url && url.startsWith(CORPUS_BASE_PATH)) {
        url = url.replace(CORPUS_BASE_PATH, '/files');
      }
      if (url) {
        return res.json({ pages: [url], total: 1 });
      }
    }

    // No pages found
    res.json({ pages: [], total: 0 });
  } catch (error) {
    console.error('Error fetching document pages:', error);
    next(error);
  }
});

// Get original file for a document (images, PDFs, etc.)
app.get('/api/documents/:id/file', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const doc = documentsRepository.getDocumentById(id) as any;
    if (!doc) {
      return res.status(404).json({ error: 'not_found' });
    }

    // Try to find the original file
    const filePath = doc.filePath || doc.file_path;
    if (!filePath) {
      return res.status(404).json({ error: 'no_file_path' });
    }

    // Resolve the file path using existing imports

    // Check various possible locations
    const possiblePaths = [
      path.resolve(filePath),
      path.resolve('data', filePath),
      path.resolve('data', 'documents', filePath),
      path.resolve('public', filePath),
    ];

    for (const tryPath of possiblePaths) {
      if (fs.existsSync(tryPath)) {
        return res.sendFile(tryPath);
      }
    }

    res.status(404).json({ error: 'file_not_found', tried: possiblePaths });
  } catch (error) {
    console.error('Error fetching document file:', error);
    next(error);
  }
});

// Evidence search endpoint with Red Flag Index support
app.get('/api/evidence/search', async (req, res, next) => {
  try {
    const query = req.query.query as string;
    const redFlagMin = parseInt(req.query.redFlagMin as string) || 0;
    const redFlagMax = parseInt(req.query.redFlagMax as string) || 5;
    const limit = parseInt(req.query.limit as string) || 50;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const result = await searchRepository.search(query, limit);

    // Filter by Red Flag Index range
    const filteredEntities = result.entities.filter((entity: any) => {
      const redFlagRating = entity.redFlagRating || 0;
      return redFlagRating >= redFlagMin && redFlagRating <= redFlagMax;
    });

    // Transform entities to match expected API format with Red Flag Index
    const transformedEntities = filteredEntities.map((entity: any) => {
      const redFlagRating = entity.redFlagRating || 0;
      const redFlagIndicators = ['⚪', '🟡', '🟠', '🔴', '🟣', '⚫'][redFlagRating] || '⚪';
      const redFlagDescriptions = [
        'No Red Flags',
        'Minor Red Flags',
        'Moderate Red Flags',
        'Significant Red Flags',
        'Major Red Flags',
        'Critical Red Flags',
      ];

      return {
        id: entity.id,
        name: entity.fullName,
        fullName: entity.fullName,
        primaryRole: entity.primaryRole,
        secondaryRoles: entity.secondaryRoles || [],
        mentions: entity.mentions,
        files: entity.documentCount || (entity.fileReferences ? entity.fileReferences.length : 0),
        contexts: entity.contexts || [],
        evidence_types: entity.evidence_types || entity.evidenceTypes || [],
        spicy_passages: entity.spicyPassages || [],
        likelihood_score: (entity.risk_level || entity.riskLevel || 'LOW').toUpperCase(),
        red_flag_score: entity.red_flag_score !== undefined ? entity.red_flag_score : 0,
        red_flag_rating: redFlagRating,
        red_flag_peppers:
          redFlagRating !== undefined ? redFlagIndicators.repeat(redFlagRating) : '🏳️',
        red_flag_description: redFlagDescriptions[redFlagRating] || 'No Red Flags',
        connectionsToEpstein: entity.connectionsSummary || '',
      };
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedEntities = transformedEntities.slice(startIndex, endIndex);

    res.json({
      data: paginatedEntities,
      total: transformedEntities.length,
      page: page,
      pageSize: limit,
      totalPages: Math.ceil(transformedEntities.length / limit),
    });
  } catch (error) {
    console.error('Error searching evidence:', error);
    next(error);
  }
});

// Legacy search endpoint for backward compatibility
app.get('/api/search', async (req, res, next) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const type = (req.query.type as string) || 'all';
    const evidenceType = req.query.evidenceType as string | undefined;
    const redFlagBand = req.query.redFlagBand as string | undefined;
    const snippets = ((req.query.snippets as string) || 'true') === 'true';
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const result = await searchRepository.search(query, limit);

    const transformedEntities = result.entities.map((entity: any) => ({
      id: entity.id,
      name: entity.fullName,
      fullName: entity.fullName,
      primaryRole: entity.primaryRole,
      secondaryRoles: entity.secondaryRoles || [],
      mentions: entity.mentions,
      files: entity.documentCount || (entity.fileReferences ? entity.fileReferences.length : 0),
      contexts: entity.contexts || [],
      evidence_types: entity.evidence_types || entity.evidenceTypes || [],
      spicy_passages: entity.spicyPassages || [],
      likelihood_score: entity.likelihoodLevel,
      red_flag_score: entity.redFlagScore !== undefined ? entity.redFlagScore : 0,
      red_flag_rating: entity.redFlagRating !== undefined ? entity.redFlagRating : 0,
      red_flag_peppers:
        entity.redFlagRating !== undefined ? '🚩'.repeat(entity.redFlagRating) : '🏳️',
      red_flag_description:
        entity.redFlagDescription ||
        `Red Flag Index ${entity.redFlagRating !== undefined ? entity.redFlagRating : 0}`,
      connectionsToEpstein: entity.connectionsSummary || '',
    }));

    let transformedDocuments = result.documents.map((doc: any) => ({
      id: doc.id,
      fileName: doc.fileName,
      filePath: doc.filePath,
      fileType: doc.fileType,
      evidenceType: doc.evidenceType,
      snippet: snippets ? doc.snippet : undefined,
      contentPreview: snippets ? doc.snippet || doc.contentPreview : doc.contentPreview,
      createdAt: doc.createdAt,
      redFlagBand:
        typeof doc.redFlagRating === 'number'
          ? doc.redFlagRating >= 5
            ? 'critical'
            : doc.redFlagRating >= 4
              ? 'high'
              : doc.redFlagRating >= 2
                ? 'medium'
                : 'low'
          : 'unknown',
    }));

    if (type === 'entity') {
      transformedDocuments = [];
    }

    if (evidenceType) {
      transformedDocuments = transformedDocuments.filter(
        (d: any) => (d.evidenceType || '').toLowerCase() === evidenceType.toLowerCase(),
      );
    }
    if (redFlagBand) {
      transformedDocuments = transformedDocuments.filter((d: any) => d.redFlagBand === redFlagBand);
    }
    if (from) {
      transformedDocuments = transformedDocuments.filter(
        (d: any) => d.createdAt && d.createdAt >= from,
      );
    }
    if (to) {
      transformedDocuments = transformedDocuments.filter(
        (d: any) => d.createdAt && d.createdAt <= to,
      );
    }

    res.json({
      entities: transformedEntities,
      documents: transformedDocuments,
    });
  } catch (error) {
    next(error);
  }
});

// Analytics endpoint
app.get('/api/analytics', async (_req, res, next) => {
  try {
    const stats = statsRepository.getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    next(error);
  }
});

// Get timeline events
app.get('/api/timeline', async (_req, res, next) => {
  try {
    const events = timelineRepository.getTimelineEvents();
    res.set('Cache-Control', 'public, max-age=300'); // 5 min cache
    res.json(events);
  } catch (error) {
    console.error('Error fetching timeline events:', error);
    next(error);
  }
});

// ============================================
// Photo Browser API Endpoints
// ============================================

// Get all albums
app.get('/api/media/albums', async (_req, res, next) => {
  try {
    const albums = mediaService.getAllAlbums();
    res.set('Cache-Control', 'public, max-age=120'); // 2 min cache
    res.json(albums);
  } catch (error) {
    console.error('Error fetching albums:', error);
    next(error);
  }
});

// Get single album by ID
app.get('/api/media/albums/:id', async (req, res, next) => {
  try {
    const albumId = parseInt(req.params.id);
    if (isNaN(albumId)) {
      return res.status(400).json({ error: 'Invalid album ID' });
    }

    const album = mediaService.getAlbumById(albumId);
    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }

    res.json(album);
  } catch (error) {
    console.error('Error fetching album:', error);
    next(error);
  }
});

// Get images in an album
app.get('/api/media/albums/:id/images', async (req, res, next) => {
  try {
    const albumId = parseInt(req.params.id);
    if (isNaN(albumId)) {
      return res.status(400).json({ error: 'Invalid album ID' });
    }

    const images = mediaService.getAllImages({ albumId });
    res.json(images);
  } catch (error) {
    console.error('Error fetching album images:', error);
    next(error);
  }
});
// Get albums for audio
app.get('/api/media/audio/albums', async (_req, res, next) => {
  try {
    const albums = mediaRepository.getAlbumsByMediaType('audio');
    res.json(albums);
  } catch (error) {
    console.error('Error fetching audio albums:', error);
    next(error);
  }
});

// Get audio files
app.get('/api/media/audio', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 24);
    const albumId = req.query.albumId ? parseInt(req.query.albumId as string) : undefined;
    const transcriptQuery = (req.query.transcriptQuery as string | undefined)?.trim() || undefined;

    // Use mediaRepository with fileType='audio'
    // Note: getMediaItemsPaginated on mediaRepository queries the media_items table
    const result = await mediaRepository.getMediaItemsPaginated(page, limit, {
      fileType: 'audio',
      entityId: req.query.entityId as string,
      albumId,
      sortBy: req.query.sortBy as 'title' | 'date' | 'rating' | undefined,
      transcriptQuery,
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching audio:', error);
    next(error);
  }
});

// Get single audio item metadata by ID (used for deep-linking into AudioBrowser)
app.get('/api/media/audio/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid audio ID' });
    }

    const item = mediaRepository.getMediaItemById(id);
    if (!item) {
      return res.status(404).json({ error: 'Audio not found' });
    }

    res.json(item);
  } catch (error) {
    console.error('Error fetching audio item by id:', error);
    next(error);
  }
});

app.get('/api/media/audio/:id/stream', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const item = mediaRepository.getMediaItemById(id);
    if (!item) return res.status(404).json({ error: 'Audio not found' });

    // Resolve path similar to images
    // Resolve path robustly
    let filePath = item.file_path || item.filePath;

    // If path is relative, resolve it against CWD
    if (!path.isAbsolute(filePath)) {
      // Remove leading slash if present to avoid joining issues (though path.join handles it usually, consistent logic is better)
      if (filePath.startsWith('/')) filePath = filePath.slice(1);
      filePath = path.join(process.cwd(), filePath);
    }

    console.log(`[Stream] Resolved path for ID ${id}: ${filePath}`); // Debug log

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Audio file not found on server' });
    }

    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

// Get albums for video
app.get('/api/media/video/albums', async (_req, res, next) => {
  try {
    const albums = mediaRepository.getAlbumsByMediaType('video');
    res.json(albums);
  } catch (error) {
    console.error('Error fetching video albums:', error);
    next(error);
  }
});

// Get video files
app.get('/api/media/video', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 24);
    const albumId = req.query.albumId ? parseInt(req.query.albumId as string) : undefined;
    const transcriptQuery = (req.query.transcriptQuery as string | undefined)?.trim() || undefined;

    // Use mediaRepository with fileType='video'
    const result = await mediaRepository.getMediaItemsPaginated(page, limit, {
      fileType: 'video',
      entityId: req.query.entityId as string,
      albumId,
      sortBy: req.query.sortBy as 'title' | 'date' | 'rating' | undefined,
      transcriptQuery,
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching video:', error);
    next(error);
  }
});

app.get('/api/media/video/:id/stream', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const item = mediaRepository.getMediaItemById(id);
    if (!item) return res.status(404).json({ error: 'Video not found' });

    // Resolve path similar to images
    // Resolve path robustly
    let filePath = item.file_path || item.filePath;

    // If path is relative, resolve it against CWD
    if (!path.isAbsolute(filePath)) {
      if (filePath.startsWith('/')) filePath = filePath.slice(1);
      filePath = path.join(process.cwd(), filePath);
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Video file not found on server' });
    }

    // sendFile handles Range requests automatically
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

app.get('/api/media/video/:id/thumbnail', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const item = mediaRepository.getMediaItemById(id);
    if (!item) return res.status(404).json({ error: 'Video not found' });

    // Check metadata for thumbnail path
    const thumbnailPath = item.metadata?.thumbnailPath;

    if (!thumbnailPath) {
      // Fallback or 404?
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    // Resolve path robustly
    const filePath = thumbnailPath;

    // Check various possible locations
    const candidates: string[] = [];

    // If it starts with /data/ or data/, try resolving relative to CWD
    if (filePath.startsWith('/data/')) {
      candidates.push(path.join(process.cwd(), filePath.substring(1)));
      candidates.push(path.join('/data', filePath.substring('/data/'.length)));
    } else if (filePath.startsWith('data/')) {
      candidates.push(path.join(process.cwd(), filePath));
      candidates.push(path.join('/data', filePath.substring('data/'.length)));
    } else if (path.isAbsolute(filePath)) {
      candidates.push(filePath);
      // Also try stripping root if it looks like a container path
      if (filePath.startsWith('/')) {
        candidates.push(path.join(process.cwd(), filePath.substring(1)));
      }
    } else {
      candidates.push(path.join(process.cwd(), 'data', filePath));
      candidates.push(path.join('/data', filePath));
    }

    const absPath = candidates.find((c) => fs.existsSync(c)) || candidates[0];

    if (!fs.existsSync(absPath)) {
      console.error(
        `[Thumbnail] Failed to resolve video thumbnail for ID ${id}. Tried:`,
        candidates,
      );
      return res.status(404).json({ error: 'Thumbnail file not found on server' });
    }

    res.sendFile(absPath);
  } catch (error) {
    next(error);
  }
});

// Get all images with filtering and sorting
app.get('/api/media/images', async (req, res, next) => {
  try {
    const filter: any = {};
    const sort: any = {};
    const slim = req.query.slim === 'true'; // Return minimal fields for grid view

    // Pagination params - apply defaults if not provided to prevent loading all images
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;
    filter.limit = limit;
    filter.offset = offset;

    if (req.query.albumId) {
      filter.albumId = parseInt(req.query.albumId as string);
    }
    if (req.query.format) {
      filter.format = req.query.format as string;
    }
    if (req.query.dateFrom) {
      filter.dateFrom = req.query.dateFrom as string;
    }
    if (req.query.dateTo) {
      filter.dateTo = req.query.dateTo as string;
    }
    if (req.query.search) {
      filter.searchQuery = req.query.search as string;
    }
    if (req.query.tagId) {
      filter.tagId = parseInt(req.query.tagId as string);
    }
    if (req.query.personId) {
      filter.personId = parseInt(req.query.personId as string);
    }
    if (req.query.hasPeople === 'true') {
      filter.hasPeople = true;
    }

    if (req.query.sortField) {
      sort.field = req.query.sortField as string;
    }
    if (req.query.sortOrder) {
      sort.order = req.query.sortOrder as 'asc' | 'desc';
    }

    const images = mediaService.getAllImages(filter, sort);
    const totalCount = mediaService.getImageCount(filter);
    res.set('X-Total-Count', totalCount.toString());
    res.set('Access-Control-Expose-Headers', 'X-Total-Count');

    // If slim mode, return only essential fields for grid view (minimize payload)
    if (slim && Array.isArray(images)) {
      const slimImages = images.map((img: any) => ({
        id: img.id,
        title: img.title,
        isSensitive: img.is_sensitive,
        albumId: img.album_id,
        dateTaken: img.date_taken,
        dateAdded: img.date_added,
        dateModified: img.date_modified,
        fileSize: img.file_size,
      }));
      return res.json(slimImages);
    }

    res.json(images);
  } catch (error) {
    console.error('Error fetching images:', error);
    next(error);
  }
});

// Get single image by ID
app.get('/api/media/images/:id', async (req, res, next) => {
  try {
    const imageId = parseInt(req.params.id);
    if (isNaN(imageId)) {
      return res.status(400).json({ error: 'Invalid image ID' });
    }

    const image = mediaService.getImageById(imageId);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json(image);
  } catch (error) {
    console.error('Error fetching image:', error);
    next(error);
  }
});

app.get('/api/media/images/:id/file', async (req, res, next) => {
  try {
    const imageId = parseInt(req.params.id);
    if (isNaN(imageId)) {
      return res.status(400).json({ error: 'Invalid image ID' });
    }
    const image = mediaService.getImageById(imageId);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    const p = ((image as any).path || (image as any).file_path || '').toString();
    if (!p) {
      return res.status(404).json({ error: 'Image path missing' });
    }

    // Since all real data is in /data, we'll resolve paths relative to that
    let absPath = p;
    const candidates: string[] = [];
    if (p.startsWith('/data/')) {
      candidates.push(path.join(process.cwd(), p.substring(1)));
      candidates.push(path.join('/data', p.substring('/data/'.length)));
    } else if (p.startsWith('data/')) {
      candidates.push(path.join(process.cwd(), p));
      candidates.push(path.join('/data', p.substring('data/'.length)));
    } else if (path.isAbsolute(p)) {
      candidates.push(p);
    } else {
      candidates.push(path.join(process.cwd(), 'data', p));
      candidates.push(path.join('/data', p));
    }
    absPath = candidates.find((c) => fs.existsSync(c)) || candidates[0];

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ error: 'Image file not found' });
    }
    res.sendFile(absPath);
  } catch (error) {
    next(error);
  }
});

app.get('/api/media/images/:id/raw', async (req, res, next) => {
  try {
    const imageId = parseInt(req.params.id);
    if (isNaN(imageId)) {
      return res.status(400).json({ error: 'Invalid image ID' });
    }
    const image = mediaService.getImageById(imageId);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    const p = ((image as any).path || (image as any).file_path || '').toString();
    if (!p) {
      return res.status(404).json({ error: 'Image path missing' });
    }

    // Since all real data is in /data, we'll resolve paths relative to that
    let absPath = p;
    const candidates: string[] = [];
    if (p.startsWith('/data/')) {
      candidates.push(path.join(process.cwd(), p.substring(1)));
      candidates.push(path.join('/data', p.substring('/data/'.length)));
    } else if (p.startsWith('data/')) {
      candidates.push(path.join(process.cwd(), p));
      candidates.push(path.join('/data', p.substring('data/'.length)));
    } else if (path.isAbsolute(p)) {
      candidates.push(p);
    } else {
      candidates.push(path.join(process.cwd(), 'data', p));
      candidates.push(path.join('/data', p));
    }
    absPath = candidates.find((c) => fs.existsSync(c)) || candidates[0];

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ error: 'Image file not found' });
    }
    res.sendFile(absPath);
  } catch (error) {
    next(error);
  }
});

// Get thumbnail for an image (smaller, faster loading)
app.get('/api/media/images/:id/thumbnail', async (req, res, next) => {
  try {
    const imageId = parseInt(req.params.id);
    if (isNaN(imageId)) {
      return res.status(400).json({ error: 'Invalid image ID' });
    }
    const image = mediaService.getImageById(imageId);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Check for thumbnail path first
    const thumbnailPath = ((image as any).thumbnail_path || '').toString();
    let absPath = '';

    if (thumbnailPath && thumbnailPath.includes('thumbnails')) {
      // Use the thumbnail
      const candidates: string[] = [];
      if (thumbnailPath.startsWith('/data/')) {
        candidates.push(path.join(process.cwd(), thumbnailPath.substring(1)));
        candidates.push(path.join('/data', thumbnailPath.substring('/data/'.length)));
      } else if (thumbnailPath.startsWith('data/')) {
        candidates.push(path.join(process.cwd(), thumbnailPath));
        candidates.push(path.join('/data', thumbnailPath.substring('data/'.length)));
      } else if (thumbnailPath.startsWith('/thumbnails/')) {
        candidates.push(path.join(process.cwd(), 'data', thumbnailPath.substring(1)));
        candidates.push(path.join('/data', thumbnailPath.substring(1)));
      } else if (path.isAbsolute(thumbnailPath)) {
        candidates.push(thumbnailPath);
      } else {
        candidates.push(path.join(process.cwd(), 'data', thumbnailPath));
        candidates.push(path.join('/data', thumbnailPath));
      }
      absPath = candidates.find((c) => fs.existsSync(c)) || candidates[0];
    }

    // Fall back to original image if thumbnail doesn't exist
    if (!absPath || !fs.existsSync(absPath)) {
      const p = ((image as any).path || (image as any).file_path || '').toString();
      const candidates: string[] = [];
      if (p.startsWith('/data/')) {
        candidates.push(path.join(process.cwd(), p.substring(1)));
        candidates.push(path.join('/data', p.substring('/data/'.length)));
      } else if (p.startsWith('data/')) {
        candidates.push(path.join(process.cwd(), p));
        candidates.push(path.join('/data', p.substring('data/'.length)));
      } else if (path.isAbsolute(p)) {
        candidates.push(p);
      } else {
        candidates.push(path.join(process.cwd(), 'data', p));
        candidates.push(path.join('/data', p));
      }
      absPath = candidates.find((c) => fs.existsSync(c)) || candidates[0];
    }

    if (!absPath || !fs.existsSync(absPath)) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    // Set aggressive cache headers for thumbnails (immutable - never change)
    const stat = fs.statSync(absPath);
    const etag = `"${imageId}-${stat.mtime.getTime()}"`;

    res.set({
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Type': 'image/jpeg',
      ETag: etag,
      'Last-Modified': stat.mtime.toUTCString(),
    });

    // Handle conditional GET requests (304 Not Modified)
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    res.sendFile(absPath);
  } catch (error) {
    next(error);
  }
});

// Search images

// ============================================================================
// BATCH OPERATIONS (Must be defined BEFORE single image routes with :id)
// ============================================================================

// Batch rotate images (Admin only)
app.put(
  '/api/media/images/batch/rotate',
  authenticateRequest,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { imageIds, direction } = req.body;

      if (!Array.isArray(imageIds) || imageIds.length === 0) {
        return res.status(400).json({ error: 'Invalid image IDs' });
      }

      if (!['left', 'right'].includes(direction)) {
        return res.status(400).json({ error: 'Invalid rotation direction' });
      }

      const rotationAngle = direction === 'left' ? -90 : 90;
      const results = [];

      // Rotate each image
      for (const imageId of imageIds) {
        try {
          const id = parseInt(imageId.toString());
          if (isNaN(id)) continue;

          const image = mediaService.getImageById(id);
          if (!image) continue;

          // Rotate the image
          await mediaService.rotateImage(id, rotationAngle);

          // Regenerate thumbnail
          const thumbnailDir = path.dirname(
            (image as any).thumbnail_path ||
              image.thumbnailPath ||
              path.join(path.dirname(image.path), 'thumbnails'),
          );
          await mediaService.generateThumbnail(image.path, thumbnailDir, {
            force: true,
            orientation: 1,
          });

          // Get updated image
          const updatedImage = mediaService.getImageById(id);
          results.push({ id, success: true, image: updatedImage });
        } catch (err) {
          console.error(`Error rotating image ${imageId}:`, err);
          results.push({ id: imageId, success: false, error: (err as Error).message });
        }
      }

      res.json({ results });
    } catch (error) {
      console.error('Error batch rotating images:', error);
      next(error);
    }
  },
);

// Batch rate images
app.put(
  '/api/media/images/batch/rate',
  authenticateRequest,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { imageIds, rating } = req.body;

      if (!Array.isArray(imageIds) || imageIds.length === 0) {
        return res.status(400).json({ error: 'Invalid image IDs' });
      }

      if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Invalid rating value' });
      }

      const results = [];

      // Rate each image
      for (const imageId of imageIds) {
        try {
          const id = parseInt(imageId.toString());
          if (isNaN(id)) continue;

          // Update rating in database
          const db = getDb();
          const result = db.prepare('UPDATE images SET rating = ? WHERE id = ?').run(rating, id);

          if (result.changes === 0) {
            results.push({ id, success: false, error: 'Image not found' });
          } else {
            results.push({ id, success: true });
          }
        } catch (err) {
          console.error(`Error rating image ${imageId}:`, err);
          results.push({ id: imageId, success: false, error: (err as Error).message });
        }
      }

      res.json({ results });
    } catch (error) {
      console.error('Error batch rating images:', error);
      next(error);
    }
  },
);

// Batch tag images
app.put(
  '/api/media/images/batch/tags',
  authenticateRequest,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { imageIds, tagIds, action } = req.body; // action: 'add' or 'remove'

      if (!Array.isArray(imageIds) || imageIds.length === 0) {
        return res.status(400).json({ error: 'Invalid image IDs' });
      }

      if (!Array.isArray(tagIds) || tagIds.length === 0) {
        return res.status(400).json({ error: 'Invalid tag IDs' });
      }

      if (!['add', 'remove'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
      }

      const results = [];
      const db = getDb();

      // Process each image
      for (const imageId of imageIds) {
        try {
          const id = parseInt(imageId.toString());
          if (isNaN(id)) continue;

          // Process each tag
          for (const tagId of tagIds) {
            const tid = parseInt(tagId.toString());
            if (isNaN(tid)) continue;

            if (action === 'add') {
              // Add tag to image
              db.prepare('INSERT OR IGNORE INTO image_tags (image_id, tag_id) VALUES (?, ?)').run(
                id,
                tid,
              );
            } else {
              // Remove tag from image
              db.prepare('DELETE FROM image_tags WHERE image_id = ? AND tag_id = ?').run(id, tid);
            }
          }

          results.push({ id, success: true });
        } catch (err) {
          console.error(`Error tagging image ${imageId}:`, err);
          results.push({ id: imageId, success: false, error: (err as Error).message });
        }
      }

      res.json({ results });
    } catch (error) {
      console.error('Error batch tagging images:', error);
      next(error);
    }
  },
);

// Batch tagging for Audio/Video (Media Items)
app.put(
  '/api/media/items/batch/tags',
  authenticateRequest,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { itemIds, tagIds, action } = req.body;

      if (!Array.isArray(itemIds) || itemIds.length === 0)
        return res.status(400).json({ error: 'Invalid item IDs' });
      if (!Array.isArray(tagIds) || tagIds.length === 0)
        return res.status(400).json({ error: 'Invalid tag IDs' });
      if (!['add', 'remove'].includes(action))
        return res.status(400).json({ error: 'Invalid action' });

      const results = [];

      for (const itemId of itemIds) {
        try {
          const id = parseInt(itemId);
          if (isNaN(id)) continue;

          for (const tagId of tagIds) {
            const tid = parseInt(tagId);
            if (isNaN(tid)) continue;

            if (action === 'add') {
              mediaService.addTagToItem(id, tid);
            } else {
              mediaService.removeTagFromItem(id, tid);
            }
          }
          results.push({ id, success: true });
        } catch (err) {
          results.push({ id: itemId, success: false, error: (err as Error).message });
        }
      }
      res.json({ results });
    } catch (error) {
      console.error('Error batch tagging items:', error);
      next(error);
    }
  },
);

app.put(
  '/api/media/items/batch/people',
  authenticateRequest,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { itemIds, personIds, action } = req.body;

      if (!Array.isArray(itemIds) || itemIds.length === 0)
        return res.status(400).json({ error: 'Invalid item IDs' });
      if (!Array.isArray(personIds) || personIds.length === 0)
        return res.status(400).json({ error: 'Invalid person IDs' });
      if (!['add', 'remove'].includes(action))
        return res.status(400).json({ error: 'Invalid action' });

      const results = [];

      for (const itemId of itemIds) {
        try {
          const id = parseInt(itemId);
          if (isNaN(id)) continue;

          for (const personId of personIds) {
            const pid = parseInt(personId);
            if (isNaN(pid)) continue;

            if (action === 'add') {
              mediaService.addPersonToItem(id, pid);
            } else {
              mediaService.removePersonFromItem(id, pid);
            }
          }
          results.push({ id, success: true });
        } catch (err) {
          results.push({ id: itemId, success: false, error: (err as Error).message });
        }
      }
      res.json({ results });
    } catch (error) {
      console.error('Error batch adding people to items:', error);
      next(error);
    }
  },
);

// Batch update metadata
app.put(
  '/api/media/images/batch/metadata',
  authenticateRequest,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { imageIds, updates } = req.body; // updates: { title?, description? }

      if (!Array.isArray(imageIds) || imageIds.length === 0) {
        return res.status(400).json({ error: 'Invalid image IDs' });
      }

      if (!updates || typeof updates !== 'object') {
        return res.status(400).json({ error: 'Invalid updates' });
      }

      const results = [];
      const db = getDb();

      // Build update query dynamically based on provided fields
      const fields = [];
      const values = [];

      if (updates.title !== undefined) {
        fields.push('title = ?');
        values.push(updates.title);
      }

      if (updates.description !== undefined) {
        fields.push('description = ?');
        values.push(updates.description);
      }

      if (fields.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      // Process each image
      for (const imageId of imageIds) {
        try {
          const id = parseInt(imageId.toString());
          if (isNaN(id)) continue;

          // Update image metadata
          const stmt = db.prepare(`UPDATE images SET ${fields.join(', ')} WHERE id = ?`);
          const result = stmt.run(...values, id);

          if (result.changes === 0) {
            results.push({ id, success: false, error: 'Image not found' });
          } else {
            results.push({ id, success: true });
          }
        } catch (err) {
          console.error(`Error updating metadata for image ${imageId}:`, err);
          results.push({ id: imageId, success: false, error: (err as Error).message });
        }
      }

      res.json({ results });
    } catch (error) {
      console.error('Error batch updating metadata:', error);
      next(error);
    }
  },
);

// Batch tag people in images (Admin only)
app.put(
  '/api/media/images/batch/people',
  authenticateRequest,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { imageIds, entityIds, action } = req.body; // action: 'add' or 'remove'

      if (!Array.isArray(imageIds) || imageIds.length === 0) {
        return res.status(400).json({ error: 'Invalid image IDs' });
      }

      if (!Array.isArray(entityIds) || entityIds.length === 0) {
        return res.status(400).json({ error: 'Invalid entity IDs' });
      }

      if (!['add', 'remove'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
      }

      const results = [];
      const db = getDb();

      // Process each image
      for (const imageId of imageIds) {
        try {
          const id = parseInt(imageId.toString());
          if (isNaN(id)) continue;

          // Process each entity
          for (const entityId of entityIds) {
            const eid = parseInt(entityId.toString());
            if (isNaN(eid)) continue;

            if (action === 'add') {
              // Add person to image
              db.prepare(
                'INSERT OR IGNORE INTO media_people (media_id, entity_id) VALUES (?, ?)',
              ).run(id, eid);
            } else {
              // Remove person from image
              db.prepare('DELETE FROM media_people WHERE media_id = ? AND entity_id = ?').run(
                id,
                eid,
              );
            }
          }

          results.push({ id, success: true });
        } catch (err) {
          console.error(`Error tagging people in image ${imageId}:`, err);
          results.push({ id: imageId, success: false, error: (err as Error).message });
        }
      }

      res.json({ results });
    } catch (error) {
      console.error('Error batch tagging people in images:', error);
      next(error);
    }
  },
);

app.put(
  '/api/media/images/:id',
  authenticateRequest,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const imageId = parseInt((req.params as { id: string }).id);
      if (isNaN(imageId)) {
        return res.status(400).json({ error: 'Invalid image ID' });
      }

      // Only allow specific fields to be updated
      const updates: any = {};
      if (req.body.title !== undefined) updates.title = req.body.title;
      if (req.body.description !== undefined) updates.description = req.body.description;

      mediaService.updateImage(imageId, updates);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating image:', error);
      next(error);
    }
  },
);

// Rotate image (Admin only)
app.put(
  '/api/media/images/:id/rotate',
  authenticateRequest,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const imageId = parseInt((req.params as { id: string }).id);
      const direction = req.body.direction === 'left' ? -90 : 90; // Default to right/clockwise

      if (isNaN(imageId)) {
        return res.status(400).json({ error: 'Invalid image ID' });
      }

      const image = mediaService.getImageById(imageId);
      if (!image) {
        return res.status(404).json({ error: 'Image not found' });
      }

      // Use MediaService to physically rotate the image file
      // This solves the "Double Rotation" display issues by normalizing
      // the image pixels and resetting EXIF orientation to 1.
      await mediaService.rotateImage(imageId, direction);

      // Regenerate thumbnail with new orientation
      const thumbnailDir = path.dirname(
        (image as any).thumbnail_path ||
          image.thumbnailPath ||
          path.join(path.dirname(image.path), 'thumbnails'),
      );
      // Ensure we have a valid thumbnail directory. If image.thumbnail_path exists, use its dir.
      // If not, assume 'thumbnails' subdir of image path (standard structure)

      try {
        await mediaService.generateThumbnail(image.path, thumbnailDir, {
          force: true,
          orientation: 1,
        });
      } catch (err) {
        console.error('Failed to regenerate thumbnail during rotation:', err);
        // Continue, as the DB update was successful
      }

      // Return the updated image so frontend can reflect changes immediately
      const updatedImage = mediaService.getImageById(imageId);
      res.json(updatedImage);
    } catch (error) {
      console.error('Error rotating image:', error);
      next(error);
    }
  },
);

// Delete image (Admin only)
app.delete(
  '/api/media/images/:id',
  authenticateRequest,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const imageId = parseInt((req.params as { id: string }).id);
      if (isNaN(imageId)) {
        return res.status(400).json({ error: 'Invalid image ID' });
      }

      mediaService.deleteImage(imageId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting image:', error);
      next(error);
    }
  },
);

// Search images
app.get('/api/media/search', async (req, res, next) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const images = mediaService.searchImages(query);
    res.json(images);
  } catch (error) {
    console.error('Error searching images:', error);
    next(error);
  }
});

// Get all media tags
app.get('/api/media/tags', async (_req, res, next) => {
  try {
    const tags = mediaService.getAllTags();
    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    next(error);
  }
});

// Get media statistics
app.get('/api/media/stats', async (_req, res, next) => {
  try {
    const stats = mediaService.getMediaStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching media stats:', error);
    next(error);
  }
});

// ============================================
// TAGS API - Global tagging system
// ============================================

// Get all tags
app.get('/api/tags', async (_req, res, next) => {
  try {
    const db = getDb();
    const tags = db.prepare('SELECT * FROM tags ORDER BY name ASC').all();
    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    next(error);
  }
});

// Create a new tag
app.post('/api/tags', authenticateRequest, async (req, res, next) => {
  try {
    const { name, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const db = getDb();
    const result = db
      .prepare('INSERT INTO tags (name, color) VALUES (?, ?)')
      .run(name.trim(), color || '#6366f1');

    res
      .status(201)
      .json({ id: result.lastInsertRowid, name: name.trim(), color: color || '#6366f1' });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Tag already exists' });
    }
    console.error('Error creating tag:', error);
    next(error);
  }
});

// Delete a tag
app.delete('/api/tags/:id', authenticateRequest, requireRole('admin'), async (req, res, next) => {
  try {
    const tagId = parseInt((req.params as { id: string }).id);
    if (isNaN(tagId)) return res.status(400).json({ error: 'Invalid tag ID' });

    const db = getDb();
    const result = db.prepare('DELETE FROM tags WHERE id = ?').run(tagId);

    if (result.changes === 0) return res.status(404).json({ error: 'Tag not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting tag:', error);
    next(error);
  }
});

// ============================================
// MEDIA TAGS API
// ============================================

// Get tags for an image
app.get('/api/media/images/:id/tags', async (req, res, next) => {
  try {
    const imageId = parseInt((req.params as { id: string }).id);
    if (isNaN(imageId)) return res.status(400).json({ error: 'Invalid image ID' });

    const db = getDb();
    const tags = db
      .prepare(
        `
      SELECT t.* FROM tags t
      JOIN image_tags it ON t.id = it.tag_id
      WHERE it.image_id = ?
      ORDER BY t.name ASC
    `,
      )
      .all(imageId);

    res.json(tags);
  } catch (error) {
    console.error('Error fetching image tags:', error);
    next(error);
  }
});

// Add tag to image
app.post('/api/media/images/:id/tags', authenticateRequest, async (req, res, next) => {
  try {
    const imageId = parseInt((req.params as { id: string }).id);
    const { tagId } = req.body;

    if (isNaN(imageId) || !tagId) return res.status(400).json({ error: 'Invalid image or tag ID' });

    const db = getDb();
    db.prepare('INSERT OR IGNORE INTO image_tags (image_id, tag_id) VALUES (?, ?)').run(
      imageId,
      tagId,
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding tag to image:', error);
    next(error);
  }
});

// Remove tag from image
app.delete('/api/media/images/:id/tags/:tagId', authenticateRequest, async (req, res, next) => {
  try {
    const imageId = parseInt((req.params as { id: string }).id);
    const tagId = parseInt((req.params as { tagId: string }).tagId);

    if (isNaN(imageId) || isNaN(tagId)) return res.status(400).json({ error: 'Invalid IDs' });

    const db = getDb();
    db.prepare('DELETE FROM image_tags WHERE image_id = ? AND tag_id = ?').run(imageId, tagId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing tag from image:', error);
    next(error);
  }
});

// ============================================
// MEDIA PEOPLE API - Link entities to images
// ============================================

// Get people in an image
app.get('/api/media/images/:id/people', async (req, res, next) => {
  try {
    const imageId = parseInt((req.params as { id: string }).id);
    if (isNaN(imageId)) return res.status(400).json({ error: 'Invalid image ID' });

    const db = getDb();
    const people = db
      .prepare(
        `
      SELECT e.id, e.full_name as name, e.primary_role as role, e.red_flag_rating as redFlagRating
      FROM entities e
      JOIN media_people mp ON e.id = mp.entity_id
      WHERE mp.media_id = ?
      ORDER BY e.full_name ASC
    `,
      )
      .all(imageId);

    res.json(people);
  } catch (error) {
    console.error('Error fetching image people:', error);
    next(error);
  }
});

// Add person to image
app.post('/api/media/images/:id/people', authenticateRequest, async (req, res, next) => {
  try {
    const imageId = parseInt((req.params as { id: string }).id);
    const { entityId } = req.body;

    if (isNaN(imageId) || !entityId)
      return res.status(400).json({ error: 'Invalid image or entity ID' });

    const db = getDb();
    db.prepare('INSERT OR IGNORE INTO media_people (media_id, entity_id) VALUES (?, ?)').run(
      imageId,
      entityId,
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding person to image:', error);
    next(error);
  }
});

// Remove person from image
app.delete(
  '/api/media/images/:id/people/:entityId',
  authenticateRequest,
  async (req, res, next) => {
    try {
      const imageId = parseInt((req.params as { id: string }).id);
      const entityId = parseInt((req.params as { entityId: string }).entityId);

      if (isNaN(imageId) || isNaN(entityId)) return res.status(400).json({ error: 'Invalid IDs' });

      const db = getDb();
      db.prepare('DELETE FROM media_people WHERE media_id = ? AND entity_id = ?').run(
        imageId,
        entityId,
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error removing person from image:', error);
      next(error);
    }
  },
);

// ============ PALM BEACH PROPERTIES API ============
import { propertiesRepository } from './server/db/propertiesRepository.js';

// Get properties with filtering and pagination
app.get('/api/properties', async (req, res, next) => {
  try {
    const filters = {
      page: parseInt(req.query.page as string) || 1,
      limit: Math.min(100, parseInt(req.query.limit as string) || 50),
      ownerSearch: req.query.owner as string,
      minValue: req.query.minValue ? parseFloat(req.query.minValue as string) : undefined,
      maxValue: req.query.maxValue ? parseFloat(req.query.maxValue as string) : undefined,
      propertyUse: req.query.propertyUse as string,
      knownAssociatesOnly: req.query.knownAssociatesOnly === 'true',
      sortBy: (req.query.sortBy as 'value' | 'owner' | 'year') || 'value',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const result = propertiesRepository.getProperties(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching properties:', error);
    next(error);
  }
});

// Get property statistics
app.get('/api/properties/stats', async (req, res, next) => {
  try {
    const stats = propertiesRepository.getPropertyStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching property stats:', error);
    next(error);
  }
});

// Get known associate properties
app.get('/api/properties/known-associates', async (req, res, next) => {
  try {
    const properties = propertiesRepository.getKnownAssociateProperties();
    res.json(properties);
  } catch (error) {
    console.error('Error fetching known associate properties:', error);
    next(error);
  }
});

// Get Epstein properties
app.get('/api/properties/epstein', async (req, res, next) => {
  try {
    const properties = propertiesRepository.getEpsteinProperties();
    res.json(properties);
  } catch (error) {
    console.error('Error fetching Epstein properties:', error);
    next(error);
  }
});

// Get property value distribution
app.get('/api/properties/value-distribution', async (req, res, next) => {
  try {
    const distribution = propertiesRepository.getValueDistribution();
    res.json(distribution);
  } catch (error) {
    console.error('Error fetching value distribution:', error);
    next(error);
  }
});

// Get top property owners
app.get('/api/properties/top-owners', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const owners = propertiesRepository.getTopOwners(limit);
    res.json(owners);
  } catch (error) {
    console.error('Error fetching top owners:', error);
    next(error);
  }
});

// Get single property by ID
app.get('/api/properties/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid property ID' });

    const property = propertiesRepository.getPropertyById(id);
    if (!property) return res.status(404).json({ error: 'Property not found' });

    res.json(property);
  } catch (error) {
    console.error('Error fetching property:', error);
    next(error);
  }
});

// ============ FLIGHT TRACKER API ============
import { flightsRepository } from './server/db/flightsRepository.js';

// Get flights with filtering and pagination
app.get('/api/flights', async (req, res, next) => {
  try {
    const filters = {
      page: parseInt(req.query.page as string) || 1,
      limit: Math.min(100, parseInt(req.query.limit as string) || 50),
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      passenger: req.query.passenger as string,
      airport: req.query.airport as string,
    };

    const result = flightsRepository.getFlights(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching flights:', error);
    next(error);
  }
});

// Get flight statistics
app.get('/api/flights/stats', async (req, res, next) => {
  try {
    const stats = flightsRepository.getFlightStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching flight stats:', error);
    next(error);
  }
});

// Get airport coordinates for map
app.get('/api/flights/airports', async (req, res, next) => {
  try {
    const coords = flightsRepository.getAirportCoords();
    res.json(coords);
  } catch (error) {
    next(error);
  }
});

// Get unique passengers list
app.get('/api/flights/passengers', async (req, res, next) => {
  try {
    const passengers = flightsRepository.getUniquePassengers();
    res.json(passengers);
  } catch (error) {
    next(error);
  }
});

// Get single flight by ID
app.get('/api/flights/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid flight ID' });

    const flight = flightsRepository.getFlightById(id);
    if (!flight) return res.status(404).json({ error: 'Flight not found' });

    res.json(flight);
  } catch (error) {
    next(error);
  }
});

// Get flights for specific passenger
app.get('/api/flights/passenger/:name', async (req, res, next) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const flights = flightsRepository.getPassengerFlights(name);
    res.json(flights);
  } catch (error) {
    next(error);
  }
});

// Get passenger co-occurrences (who flew together)
app.get('/api/flights/co-occurrences', async (req, res, next) => {
  try {
    const minFlights = parseInt(req.query.minFlights as string) || 2;
    const coOccurrences = flightsRepository.getPassengerCoOccurrences(minFlights);
    res.json(coOccurrences);
  } catch (error) {
    console.error('Error fetching co-occurrences:', error);
    next(error);
  }
});

// Get co-passengers for a specific person
app.get('/api/flights/co-passengers/:name', async (req, res, next) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const coPassengers = flightsRepository.getCoPassengers(name);
    res.json(coPassengers);
  } catch (error) {
    console.error('Error fetching co-passengers:', error);
    next(error);
  }
});

// Get frequent routes
app.get('/api/flights/routes', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const routes = flightsRepository.getFrequentRoutes(limit);
    res.json(routes);
  } catch (error) {
    console.error('Error fetching routes:', error);
    next(error);
  }
});

// Get passenger date ranges (first/last flight)
app.get('/api/flights/passenger-ranges', async (req, res, next) => {
  try {
    const ranges = flightsRepository.getPassengerDateRanges();
    res.json(ranges);
  } catch (error) {
    console.error('Error fetching passenger ranges:', error);
    next(error);
  }
});

// Get flights by aircraft
app.get('/api/flights/aircraft', async (req, res, next) => {
  try {
    const aircraft = flightsRepository.getFlightsByAircraft();
    res.json(aircraft);
  } catch (error) {
    console.error('Error fetching aircraft stats:', error);
    next(error);
  }
});

// Get destinations for a passenger
app.get('/api/flights/destinations/:name', async (req, res, next) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const destinations = flightsRepository.getPassengerDestinations(name);
    res.json(destinations);
  } catch (error) {
    console.error('Error fetching destinations:', error);
    next(error);
  }
});

// Advanced Analytics API routes
app.use('/api/advanced-analytics', advancedAnalyticsRoutes);

// Investigative Tasks API routes
app.use('/api/investigative-tasks', investigativeTasksRoutes);

// Memory API routes
app.get('/api/memory', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const memoryType = req.query.memoryType as string;
    const status = req.query.status as string;
    const searchQuery = req.query.q as string;

    const filters: any = {};
    if (memoryType) filters.memoryType = memoryType;
    if (status) filters.status = status;
    if (searchQuery) filters.searchQuery = searchQuery;

    const result = memoryRepository.searchMemoryEntries(getDb(), filters, page, limit);

    res.json({
      data: result.data,
      total: result.total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(result.total / limit),
    });
  } catch (error) {
    console.error('Error fetching memory entries:', error);
    next(error);
  }
});

app.get('/api/memory/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid memory ID' });
    }

    const memoryEntry = memoryRepository.getMemoryEntryById(getDb(), id);
    if (!memoryEntry) {
      return res.status(404).json({ error: 'Memory entry not found' });
    }

    res.json(memoryEntry);
  } catch (error) {
    console.error('Error fetching memory entry:', error);
    next(error);
  }
});

app.post('/api/memory', async (req, res, next) => {
  try {
    const {
      memoryType,
      content,
      metadata,
      contextTags,
      importanceScore,
      sourceId,
      sourceType,
      provenance,
    } = req.body;

    if (!memoryType || !content) {
      return res.status(400).json({ error: 'memoryType and content are required' });
    }

    const input = {
      memoryType,
      content,
      metadata,
      contextTags,
      importanceScore,
      sourceId,
      sourceType,
      provenance,
    };

    const newMemoryEntry = memoryRepository.createMemoryEntry(getDb(), input);

    res.status(201).json(newMemoryEntry);
  } catch (error) {
    console.error('Error creating memory entry:', error);
    next(error);
  }
});

app.put('/api/memory/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid memory ID' });
    }

    const updates = req.body;
    const updatedMemoryEntry = memoryRepository.updateMemoryEntry(getDb(), id, updates);

    if (!updatedMemoryEntry) {
      return res.status(404).json({ error: 'Memory entry not found' });
    }

    res.json(updatedMemoryEntry);
  } catch (error) {
    console.error('Error updating memory entry:', error);
    next(error);
  }
});

app.delete('/api/memory/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid memory ID' });
    }

    const result = memoryRepository.updateMemoryEntry(getDb(), id, { status: 'deprecated' });

    if (!result) {
      return res.status(404).json({ error: 'Memory entry not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting memory entry:', error);
    next(error);
  }
});

app.get('/api/memory/:id/relationships', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid memory ID' });
    }

    const relationships = memoryRepository.getMemoryRelationships(getDb(), id);

    res.json(relationships);
  } catch (error) {
    console.error('Error fetching memory relationships:', error);
    next(error);
  }
});

app.get('/api/memory/:id/audit', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid memory ID' });
    }

    const auditLogs = memoryRepository.getMemoryAuditLogs(getDb(), id);

    res.json(auditLogs);
  } catch (error) {
    console.error('Error fetching memory audit logs:', error);
    next(error);
  }
});

app.get('/api/memory/:id/quality', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid memory ID' });
    }

    const qualityMetrics = memoryRepository.getQualityMetrics(getDb(), id);

    res.json(qualityMetrics);
  } catch (error) {
    console.error('Error fetching memory quality metrics:', error);
    next(error);
  }
});

app.post('/api/memory/:id/quality', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid memory ID' });
    }

    const { sourceReliability, evidenceStrength, temporalRelevance, entityConfidence } = req.body;

    const dimensions = {
      sourceReliability: sourceReliability || 0.5,
      evidenceStrength: evidenceStrength || 0.5,
      temporalRelevance: temporalRelevance || 0.5,
      entityConfidence: entityConfidence || 0.5,
    };

    memoryRepository.updateQualityMetrics(getDb(), id, dimensions);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating memory quality metrics:', error);
    next(error);
  }
});

// Error handling middleware (must be last)
app.use(globalErrorHandler);

// Helper to inject Open Graph tags and Page Title into HTML
function injectOgTags(
  html: string,
  ogData: { title: string; description: string; imageUrl: string; url: string },
) {
  const safeTitle = ogData.title
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const safeDesc = ogData.description
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const ogTags = `
    <!-- Dynamic Open Graph Tags -->
    <title>${safeTitle} | Epstein Files Archive</title>
    <meta property="og:title" content="${safeTitle} | Epstein Files Archive" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:image" content="${ogData.imageUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${ogData.url}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle} | Epstein Files Archive" />
    <meta name="twitter:description" content="${safeDesc}" />
    <meta name="twitter:image" content="${ogData.imageUrl}" />
  `;

  // 1. Handle <title> tag replacement
  if (html.includes('<title>')) {
    html = html.replace(
      /<title>.*?<\/title>/,
      `<title>${safeTitle} | Epstein Files Archive</title>`,
    );
  }

  // 2. Handle Meta tag replacement
  const defaultTagsRegex =
    /<!-- Default Open Graph Tags -->[\s\S]*?<!-- End Default Open Graph Tags -->/;
  const metaRegexFull =
    /<!-- Dynamic Open Graph Tags -->[\s\S]*?<!-- End Dynamic Open Graph Tags -->/;

  if (defaultTagsRegex.test(html)) {
    return html.replace(defaultTagsRegex, ogTags);
  } else if (metaRegexFull.test(html)) {
    return html.replace(metaRegexFull, ogTags);
  } else {
    return html.replace('</head>', `${ogTags}</head>`);
  }
}

// Ensure articles repository-like access (quick inline helper since no repo file exists yet)
// Ensure articles repository-like access (quick inline helper since no repo file exists yet)
function getArticleById(id: number | string) {
  try {
    return articlesRepository.getArticleById(id);
  } catch (e) {
    console.error('Error fetching article for OG tags:', e);
    return null;
  }
}

// SPA fallback to index.html for non-API routes
app.get('*', async (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();

  const indexFile = path.join(distPath, 'index.html');
  if (fs.existsSync(indexFile)) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const defaultOgImage = `${baseUrl}/og-image.png`;
    let html = fs.readFileSync(indexFile, 'utf8');
    const routePath = req.path;

    try {
      // =================================================================
      // SOCIAL PREVIEW: DEEP LINING LOGIC
      // =================================================================

      // 1. Photos (Query param: ?photoId=123) - Existing
      const photoId = req.query.photoId;
      if (photoId) {
        const id = parseInt(photoId as string);
        if (!isNaN(id)) {
          const image = mediaService.getImageById(id);
          if (image) {
            const imageUrl = `${baseUrl}/api/media/images/${id}/raw?v=${new Date(image.dateModified || image.dateAdded || 0).getTime()}`;
            html = injectOgTags(html, {
              title: image.title || image.filename || 'Photo - Epstein Files Archive',
              description:
                image.description || `Photo from Epstein Files Archive - ${image.filename}`,
              imageUrl,
              url: `${baseUrl}${req.originalUrl}`,
            });
            return res.send(html);
          }
        }
      }

      // 2. Photos (Path-based: /media/photos/123)
      const photoPathMatch = routePath.match(/^\/media\/photos\/(\d+)$/);
      if (photoPathMatch) {
        const id = parseInt(photoPathMatch[1]);
        if (!isNaN(id)) {
          const image = mediaService.getImageById(id);
          if (image) {
            const imageUrl = `${baseUrl}/api/media/images/${id}/raw?v=${new Date(image.dateModified || image.dateAdded || 0).getTime()}`;
            html = injectOgTags(html, {
              title: image.title || image.filename || 'Photo - Epstein Files Archive',
              description:
                image.description || `Photo from Epstein Files Archive - ${image.filename}`,
              imageUrl,
              url: `${baseUrl}${req.originalUrl}`,
            });
            return res.send(html);
          }
        }
      }

      // 3. Audio/Media Items (Query param: ?id=123 on /media/audio or Generic)
      // Note: AudioBrowser uses ?id= for deep linking
      if (routePath.startsWith('/media/audio') || routePath.startsWith('/media/items')) {
        const audioId = req.query.id || req.query.audioId;
        if (audioId) {
          const id = parseInt(audioId as string);
          if (!isNaN(id)) {
            const item = mediaRepository.getMediaItemById(id);
            if (item) {
              // Use a generic audio placeholder or specific if available
              const thumbnail =
                item.metadata_json && JSON.parse(item.metadata_json)?.thumbnailPath
                  ? `${baseUrl}/api/static?path=${encodeURIComponent(JSON.parse(item.metadata_json).thumbnailPath)}`
                  : `${baseUrl}/og-image.png`; // Fallback

              html = injectOgTags(html, {
                title: item.title || 'Audio Recording - Epstein Files Archive',
                description: item.description || `Audio recording: ${item.title}`,
                imageUrl: thumbnail,
                url: `${baseUrl}${req.originalUrl}`,
              });
              return res.send(html);
            }
          }
        }
      }

      // 4. Investigations (Path-based: /investigations/123)
      const invMatch = routePath.match(/^\/investigations\/(\d+)$/);
      if (invMatch) {
        const id = parseInt(invMatch[1]);
        if (!isNaN(id)) {
          const inv = await investigationsRepository.getInvestigationById(id);
          if (inv) {
            html = injectOgTags(html, {
              title: `Investigation: ${inv.title}`,
              description: inv.description || `Investigation into ${inv.title}`,
              imageUrl: defaultOgImage, // Investigations don't have covers yet
              url: `${baseUrl}${req.originalUrl}`,
            });
            return res.send(html);
          }
        }
      }

      // Check for entity deep links (e.g., /subjects?entity=123 or /entity/123)
      const entityId = req.query.entity || req.query.entityId;
      if (entityId) {
        const entity = entitiesRepository.getEntityById(String(entityId));
        if (entity) {
          const entityName = entity.fullName || entity.full_name || 'Unknown Entity';
          const role = entity.primaryRole || entity.primary_role || '';
          html = injectOgTags(html, {
            title: `${entityName} - Epstein Files Archive`,
            description: role
              ? `${entityName} (${role}) - View connections, documents and evidence in the Epstein Files Archive`
              : `${entityName} - View connections, documents and evidence in the Epstein Files Archive`,
            imageUrl: defaultOgImage,
            url: `${baseUrl}${req.originalUrl}`,
          });
          return res.send(html);
        }
      }

      // Check for article deep links (e.g., /media/articles?articleId=123)
      const articleId = req.query.article || req.query.articleId;
      if (articleId) {
        const article = getArticleById(articleId as string);
        if (article) {
          const articleTitle = article.title || 'Article';
          const summary =
            article.description ||
            article.summary ||
            `Read "${articleTitle}" in the Epstein Files Archive.`;

          html = injectOgTags(html, {
            title: `${articleTitle} - Epstein Files Archive`,
            description: summary.length > 200 ? summary.substring(0, 197) + '...' : summary,
            imageUrl: article.image_url || defaultOgImage,
            url: `${baseUrl}${req.originalUrl}`,
          });
          return res.send(html);
        }
      }

      // Check for document deep links (e.g., /documents?doc=123)
      const docId = req.query.doc || req.query.documentId;
      if (docId) {
        const doc = documentsRepository.getDocumentById(String(docId));
        if (doc) {
          const docTitle = doc.file_name || doc.title || 'Document';
          html = injectOgTags(html, {
            title: `${docTitle} - Epstein Files Archive`,
            description:
              doc.summary ||
              doc.content?.slice(0, 200) ||
              `View document: ${docTitle} in the Epstein Files Archive`,
            imageUrl: defaultOgImage,
            url: `${baseUrl}${req.originalUrl}`,
          });
          return res.send(html);
        }
      }

      // Check for entity path deep links (e.g., /entity/123 or /entities/123)
      const entityPathMatch = req.path.match(/^\/(?:entity|entities)\/(\d+)/);
      if (entityPathMatch) {
        const entity = entitiesRepository.getEntityById(entityPathMatch[1]);
        if (entity) {
          const entityName = entity.fullName || entity.full_name || 'Unknown';
          const role = entity.primaryRole || entity.primary_role || '';
          const rating = entity.redFlagRating || entity.red_flag_rating || 0;
          const ratingText =
            rating >= 4 ? '🔴 High Risk' : rating >= 2 ? '🟡 Medium Risk' : '🟢 Low Risk';
          html = injectOgTags(html, {
            title: `${entityName} - Epstein Files Archive`,
            description: role
              ? `${entityName} (${role}) ${ratingText} - Explore connections, documents, and evidence in the Epstein Files Archive.`
              : `${entityName} ${ratingText} - Explore connections, documents, and evidence in the Epstein Files Archive.`,
            imageUrl: defaultOgImage,
            url: `${baseUrl}${req.originalUrl}`,
          });
          return res.send(html);
        }
      }

      // Check for document path deep links (e.g. /documents/123)
      // Note: Frontend likely uses /documents/:id
      const docPathMatch = req.path.match(/^\/(?:document|documents)\/(\d+)/);
      if (docPathMatch) {
        const doc = documentsRepository.getDocumentById(docPathMatch[1]);
        if (doc) {
          const docTitle = doc.title || doc.file_name || 'Document';
          html = injectOgTags(html, {
            title: `${docTitle} - Epstein Files Archive`,
            description:
              doc.summary ||
              doc.content?.slice(0, 200) ||
              `View document: ${docTitle} in the Epstein Files Archive`,
            imageUrl: defaultOgImage,
            url: `${baseUrl}${req.originalUrl}`,
          });
          return res.send(html);
        }
      }

      // Route-based OG tags for specific pages
      // Route-based OG tags for specific pages

      // Timeline
      if (routePath === '/timeline' || routePath.startsWith('/timeline')) {
        html = injectOgTags(html, {
          title: 'Timeline - Epstein Files Archive',
          description:
            "Interactive chronological timeline spanning decades of events: from Epstein's rise in the 1980s through trials, investigations, and ongoing revelations.",
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      // Flights
      if (routePath === '/flights' || routePath.startsWith('/flights')) {
        html = injectOgTags(html, {
          title: 'Flight Logs - Epstein Files Archive',
          description:
            'Track the "Lolita Express" and other aircraft. Interactive map visualization of flight routes, passenger manifests, and destinations including Little St. James Island.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      // Media sub-routes
      if (routePath === '/media/articles' || routePath.startsWith('/media/articles')) {
        html = injectOgTags(html, {
          title: 'Articles - Epstein Files Archive',
          description:
            'Curated investigative journalism from Miami Herald, Vanity Fair, The Guardian, and original research. Deep dives into the Epstein network and cover-ups.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      if (routePath === '/media/photos' || routePath.startsWith('/media/photos')) {
        html = injectOgTags(html, {
          title: 'Photos - Epstein Files Archive',
          description:
            'Evidence photos, historical images, and documentation from the Epstein investigation. Browse by album, date, or location.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      if (routePath === '/media/audio' || routePath.startsWith('/media/audio')) {
        html = injectOgTags(html, {
          title: 'Audio - Epstein Files Archive',
          description: 'Audio recordings, depositions, and testimony related to the Epstein case.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      if (routePath === '/media/video' || routePath.startsWith('/media/video')) {
        html = injectOgTags(html, {
          title: 'Video - Epstein Files Archive',
          description:
            'Video evidence, interviews, and documentary footage related to the Epstein investigation.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      // Generic /media route
      if (routePath === '/media') {
        html = injectOgTags(html, {
          title: 'Media - Epstein Files Archive',
          description:
            'Browse photos, videos, audio recordings, and curated articles about the Epstein investigation.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      // Subjects / People
      if (routePath === '/' || routePath === '/people' || routePath.startsWith('/people')) {
        html = injectOgTags(html, {
          title: 'Subjects - Epstein Files Archive',
          description:
            'Explore individuals connected to Jeffrey Epstein. Evidence-based risk ratings, document connections, and relationship mapping for 1,000+ subjects.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      // Documents
      if (routePath === '/documents' || routePath.startsWith('/documents')) {
        html = injectOgTags(html, {
          title: 'Documents - Epstein Files Archive',
          description:
            'Search thousands of court filings, emails, financial records, and depositions. Full-text search with OCR-processed scanned documents.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      // Black Book
      if (
        routePath === '/blackbook' ||
        routePath.startsWith('/blackbook') ||
        routePath === '/black-book' ||
        routePath.startsWith('/black-book')
      ) {
        html = injectOgTags(html, {
          title: 'Black Book - Epstein Files Archive',
          description:
            "Explore Jeffrey Epstein's infamous address book containing 1,700+ contacts. Search names, view connections, and cross-reference with flight logs.",
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      // Search
      if (routePath === '/search' || routePath.startsWith('/search')) {
        const searchQuery = req.query.q as string;
        html = injectOgTags(html, {
          title: searchQuery
            ? `"${searchQuery}" - Search Results - Epstein Files Archive`
            : 'Search - Epstein Files Archive',
          description: searchQuery
            ? `Search results for "${searchQuery}" in the Epstein Files Archive. Find entities, documents, and evidence.`
            : 'Search across entities, documents, flight logs, and evidence in the comprehensive Epstein Files Archive.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      // Investigations
      if (routePath === '/investigations' || routePath.startsWith('/investigations')) {
        html = injectOgTags(html, {
          title: 'Investigations - Epstein Files Archive',
          description:
            'Research workspace for building investigation threads. Create hypotheses, link evidence, and export findings.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      // Analytics
      if (routePath === '/analytics' || routePath.startsWith('/analytics')) {
        html = injectOgTags(html, {
          title: 'Analytics - Epstein Files Archive',
          description:
            'Data visualizations and network analysis. Explore connection graphs, document timelines, and statistical breakdowns of the evidence.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      // Emails
      if (routePath === '/emails' || routePath.startsWith('/emails')) {
        html = injectOgTags(html, {
          title: 'Email Browser - Epstein Files Archive',
          description:
            'Browse email communications with threaded conversations, sender analysis, and attachment tracking.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      // About
      if (routePath === '/about' || routePath.startsWith('/about')) {
        html = injectOgTags(html, {
          title: 'Live Ingestion Dashboard & Methodology',
          description:
            'Monitor the real-time ingestion of 1.3M new DOJ files. Explore our database methodology, data sources, and forensic analysis tools.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      // Admin
      if (routePath === '/admin' || routePath.startsWith('/admin')) {
        html = injectOgTags(html, {
          title: 'Admin - Epstein Files Archive',
          description: 'Administration dashboard for the Epstein Files Archive.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }

      // Login
      if (routePath === '/login') {
        html = injectOgTags(html, {
          title: 'Login - Epstein Files Archive',
          description:
            'Sign in to access investigation features and contribute to the Epstein Files Archive.',
          imageUrl: defaultOgImage,
          url: `${baseUrl}${req.originalUrl}`,
        });
        return res.send(html);
      }
    } catch (err) {
      console.error('Error injecting OG tags:', err);
      // Fallback to sending file normally
    }

    res.sendFile(indexFile);
  } else {
    next();
  }
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
// Ensure migrations are run before starting
try {
  validateStartup();
  runMigrations();
} catch (err) {
  console.error('Failed to run migrations:', err);
  // Continue anyway? Or exit? For now, log and continue as per plan to be robust.
}

const server = app.listen(config.apiPort, () => {
  console.log(`🚀 Production API server running on port ${config.apiPort}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);

  // CRITICAL STARTUP ASSERTIONS
  if (config.nodeEnv === 'production' && config.apiPort !== 8080 && config.apiPort !== 3012) {
    console.warn(`⚠️  [DEPLOYMENT WARNING] Production expects PORT 8080 or 3012!`);
    console.warn(`⚠️  Current PORT is ${config.apiPort} - API calls may return 404!`);
  }

  // Log startup diagnostics for debugging
  console.log('--- Startup Warnings ---');
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    console.log(
      '[INFO] Production mode: Authentication is FORCED regardless of ENABLE_AUTH setting.',
    );
  }
  console.log('[INFO] Authentication is now forced to be enabled in all environments');
  console.log('------------------------');
});

// === GRACEFUL SHUTDOWN ===
// Close database connection properly to prevent "database is locked" errors
const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  server.close(() => {
    console.log('HTTP server closed.');

    try {
      // Close database connection
      const db = getDb();
      if (db) {
        db.close();
        console.log('Database connection closed.');
      }
    } catch (e) {
      console.error('Error closing database:', e);
    }

    console.log('Graceful shutdown complete.');
    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;
