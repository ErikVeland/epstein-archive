/**
 * REVISION TOKEN ENDPOINT
 *
 * Admin endpoint to get canonical revision token
 */

import { Router, Request, Response } from 'express';
import { getRevisionInfo } from '../revisionManager';
import { authenticateRequest } from '../auth/middleware.js';

const router = Router();

/**
 * GET /api/admin/revision
 *
 * Get canonical dataset revision token
 */
router.get('/revision', authenticateRequest, async (_req: Request, res: Response) => {
  try {
    const revisionInfo = await getRevisionInfo();
    res.json(revisionInfo);
  } catch (_error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
