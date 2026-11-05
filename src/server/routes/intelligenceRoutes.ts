import express from 'express';
import { intelligenceRepository } from '../db/intelligenceRepository.js';
import { cacheService } from '../cache/cacheService.js';
import { logger } from '../services/Logger.js';
import { withTimeoutFallback } from '../utils/asyncTimeout.js';

const router = express.Router();
const DASHBOARD_TIMEOUT_MS = 5_000;

const withDashboardTimeout = async <T>(label: string, promise: Promise<T>) =>
  withTimeoutFallback<T | null>(promise, null, {
    timeoutMs: DASHBOARD_TIMEOUT_MS,
    onTimeout: () => logger.warn(`[Intelligence] ${label} timed out`),
  });

/**
 * GET /api/intelligence/review
 *
 * Returns all post-ingest quality queues and their total counts.
 * Each queue is capped server-side; counts reflect the full corpus total.
 * Optional tables (OCR, aliases, financial, claims) degrade gracefully when absent.
 *
 * Cache: 5 minutes — counts are not real-time critical but should not be stale overnight.
 */
router.get('/review', async (_req, res, next) => {
  try {
    logger.info('[Intelligence] Fetching review queues');
    const data = await withDashboardTimeout(
      'review queues',
      cacheService.getOrCompute(
        'query',
        'intelligence:review',
        () => intelligenceRepository.getFullReview(),
        300,
      ),
    );
    if (data === null)
      return res
        .status(503)
        .set('Retry-After', '5')
        .json({ error: 'Review data is still loading. Retry shortly.' });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/intelligence/readiness
 *
 * Returns the release readiness widget state:
 *   - semantic search availability (pgvector extension)
 *   - provenance coverage percentage
 *   - pending mention and claim review counts
 */
router.get('/readiness', async (_req, res, next) => {
  try {
    logger.info('[Intelligence] Fetching release readiness state');
    const data = await withDashboardTimeout(
      'release readiness',
      cacheService.getOrCompute(
        'query',
        'intelligence:readiness',
        () => intelligenceRepository.getReleaseReadiness(),
        120,
      ),
    );
    if (data === null)
      return res
        .status(503)
        .set('Retry-After', '5')
        .json({ error: 'Readiness data is still loading. Retry shortly.' });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export { router as intelligenceRoutes };
