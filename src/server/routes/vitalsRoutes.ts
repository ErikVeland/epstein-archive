/**
 * PRODUCTION WEB VITALS ENDPOINT
 *
 * Lightweight endpoint for collecting vitals
 * Stores daily p75 aggregates
 */

import { Router, Request, Response } from 'express';
import { vitalsPostLimiter } from '../middleware/rateLimit.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import {
  getWebVitalsAggregates,
  getWebVitalsAggregatesAverage,
  recordWebVitals,
} from '../db/healthQueries.js';
import { authenticateRequest, requireRole } from '../auth/middleware.js';
import { logger } from '../services/Logger.js';

const router = Router();

const vitalsPayloadSchema = z.object({
  body: z.object({
    sessionId: z.string().min(1),
    route: z.string().min(1),
    cls: z.number(),
    lcp: z.number(),
    inp: z.number(),
    longTaskCount: z.number().int().min(0),
    timestamp: z.number().int().positive(),
  }),
});

const aggregatesQuerySchema = z.object({
  query: z.object({
    days: z.coerce.number().int().min(1).max(365).default(7),
  }),
});

/**
 * POST /api/vitals
 *
 * Collect Web Vitals from production clients
 * 1% sampling, privacy-safe
 */
router.post(
  '/',
  vitalsPostLimiter,
  validate(vitalsPayloadSchema),
  async (req: Request, res: Response) => {
    try {
      const payload = req.body;

      // Check payload size < 2KB (safety against spam)
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
  },
);

/**
 * GET /api/vitals/aggregates
 *
 * Get daily p75 aggregates (admin only)
 */
router.get(
  '/aggregates',
  authenticateRequest,
  requireRole('admin'),
  validate(aggregatesQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const { days } = req.query as unknown as z.infer<typeof aggregatesQuerySchema>['query'];

      const aggregates = await getWebVitalsAggregates(days);

      res.json({ aggregates });
    } catch (_error: unknown) {
      // Fallback if PERCENTILE_CONT not supported
      try {
        const { days } = req.query as unknown as z.infer<typeof aggregatesQuerySchema>['query'];
        const aggregates = await getWebVitalsAggregatesAverage(days);
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
