import express from 'express';
import { intelligenceRepository } from '../db/intelligenceRepository.js';
import { cacheResponse } from '../middleware/cache.js';
import { logger } from '../services/Logger.js';

const router = express.Router();

/**
 * GET /api/intelligence/review
 *
 * Returns all post-ingest quality queues and their total counts.
 * Each queue is capped server-side; counts reflect the full corpus total.
 * Optional tables (OCR, aliases, financial, claims) degrade gracefully when absent.
 *
 * Cache: 5 minutes — counts are not real-time critical but should not be stale overnight.
 */
router.get('/review', cacheResponse(300), async (_req, res, next) => {
  try {
    logger.info('[Intelligence] Fetching review queues');
    const data = await intelligenceRepository.getFullReview();
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
router.get('/readiness', cacheResponse(120), async (_req, res, next) => {
  try {
    logger.info('[Intelligence] Fetching release readiness state');
    const data = await intelligenceRepository.getReleaseReadiness();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export { router as intelligenceRoutes };
