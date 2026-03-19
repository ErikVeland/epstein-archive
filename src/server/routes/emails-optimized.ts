/**
 * EMAIL HOT PATH OPTIMIZATION
 *
 * Optimized email endpoint that returns metadata only (no bodies)
 * Message bodies fetched lazily when thread is opened
 *
 * Ensures:
 * - No N+1 queries
 * - Lean payloads for list view
 * - Fast thread list rendering
 */

import { Router, Request, Response } from 'express';
import { performanceCache } from '../performanceCache';
import { logger } from '../services/Logger.js';
import {
  EmailCategoriesCounts,
  EmailMetadata,
  getEmailBodyById,
  getEmailCategoriesCounts,
  getEmailMetadataPage,
} from '../db/routesDb.js';

const router = Router();

/**
 * GET /api/emails
 *
 * Returns email thread metadata only (no bodies)
 * Optimized for fast list rendering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 500;
    const category = req.query.category as string;

    // Check cache
    const cacheKey = `emails:${category || 'all'}:page${page}:limit${limit}`;
    const cached = performanceCache.get<{ data: EmailMetadata[]; total: number }>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const result = getEmailMetadataPage({ page, limit, category });

    // Cache for 30s
    performanceCache.set(cacheKey, result, 30);

    res.json(result);
  } catch (error: any) {
    logger.error({ err: error }, 'Error fetching emails');
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

/**
 * GET /api/emails/:id/body
 *
 * Lazy-load message body when thread is opened
 * Only fetches body for specific message
 */
router.get('/:id/body', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check cache
    const cacheKey = `email:${id}:body`;
    const cached = performanceCache.get<{ body: string }>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const result = getEmailBodyById(id);

    if (!result) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Cache for 60s
    performanceCache.set(cacheKey, result, 60);

    res.json(result);
  } catch (error: any) {
    logger.error({ err: error }, 'Error fetching email body');
    res.status(500).json({ error: 'Failed to fetch email body' });
  }
});

/**
 * GET /api/emails/categories
 *
 * Get email counts by category
 */
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    // Check cache
    const cached = performanceCache.get<Record<string, number>>('email:categories');
    if (cached) {
      return res.json(cached);
    }

    const counts: EmailCategoriesCounts = await getEmailCategoriesCounts();

    // Cache for 60s
    performanceCache.set('email:categories', counts, 60);

    res.json(counts);
  } catch (error: any) {
    logger.error({ err: error }, 'Error fetching email categories');
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

export default router;
