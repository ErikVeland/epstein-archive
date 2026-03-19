import express from 'express';
import { mapRateLimiter } from '../middleware/rateLimit.js';
import { cacheResponse } from '../utils/perfCache.js';
import { getMapEntities } from '../db/routesDb.js';
import { logger } from '../services/Logger.js';

const router = express.Router();

// GET /api/map/entities
// Returns top 500 entities with valid coordinates
router.get('/entities', mapRateLimiter, cacheResponse(60), async (req, res) => {
  try {
    const limit = 500;

    // Filter params
    const minRisk = parseInt(req.query.minRisk as string) || 0;

    // Query:
    // 1. Must have valid coordinates (lat/lng != 0 and NOT NULL)
    // 2. Sort by Mentions DESC, Risk DESC
    // 3. Limit 500 for performance

    const entities = await getMapEntities(minRisk, limit);

    // Add debug headers
    res.set('X-Map-Debug-Count', entities.length.toString());

    res.json(entities);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching map entities');
    res.status(500).json({ error: 'Failed to fetch map data' });
  }
});

export default router;
