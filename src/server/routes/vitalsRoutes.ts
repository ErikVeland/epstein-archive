/**
 * PRODUCTION WEB VITALS ENDPOINT
 *
 * Lightweight endpoint for collecting vitals
 * Stores daily p75 aggregates
 */

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getWebVitalsAggregates,
  getWebVitalsAggregatesAverage,
  recordWebVitals,
} from '../db/routesDb.js';
import { authenticateRequest, requireRole } from '../auth/middleware.js';
import { logger } from '../services/Logger.js';

const router = Router();

const vitalsPostLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

interface VitalsPayload {
  sessionId: string;
  route: string;
  cls: number;
  lcp: number;
  inp: number;
  longTaskCount: number;
  timestamp: number;
}

/**
 * POST /api/vitals
 *
 * Collect Web Vitals from production clients
 * 1% sampling, privacy-safe
 */
router.post('/', vitalsPostLimiter, async (req: Request, res: Response) => {
  try {
    const payload: VitalsPayload = req.body;

    // Validate payload
    if (!payload.sessionId || !payload.route || typeof payload.cls !== 'number') {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Check payload size < 2KB
    const payloadSize = JSON.stringify(payload).length;
    if (payloadSize > 2048) {
      return res.status(413).json({ error: 'Payload too large' });
    }

    // Fire-and-forget: respond immediately, log DB errors without affecting the client
    recordWebVitals(payload).catch((err) => logger.error('Failed to record vitals:', err));

    // Return 204 No Content (fastest response)
    res.status(204).send();
  } catch (error: unknown) {
    logger.error({ err: error }, 'Error collecting vitals');
    // Silent fail - don't affect client
    res.status(204).send();
  }
});

/**
 * GET /api/vitals/aggregates
 *
 * Get daily p75 aggregates (admin only)
 */
router.get(
  '/aggregates',
  authenticateRequest,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 7;

      const aggregates = getWebVitalsAggregates(days);

      res.json({ aggregates });
    } catch (_error: unknown) {
      // Fallback if PERCENTILE_CONT not supported
      try {
        const days = parseInt(req.query.days as string) || 7;

        const aggregates = getWebVitalsAggregatesAverage(days);

        res.json({ aggregates, note: 'Using averages (PERCENTILE_CONT not supported)' });
      } catch (fallbackError: unknown) {
        res.status(500).json({
          error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        });
      }
    }
  },
);

export default router;
