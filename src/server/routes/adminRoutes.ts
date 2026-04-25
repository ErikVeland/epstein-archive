/**
 * REVISION TOKEN ENDPOINT
 *
 * Admin endpoint to get canonical revision token
 */

import { Router, Request, Response } from 'express';
import { getRevisionInfo } from '../revisionManager';
import { authenticateRequest } from '../auth/middleware.js';

import { dataQualityRepository } from '../db/dataQualityRepository.js';

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

/**
 * GET /api/admin/audit-logs
 *
 * Returns recent system audit logs for administrative review.
 */
router.get('/audit-logs', authenticateRequest, async (req: Request, res: Response, next) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 100;
    const logs = await dataQualityRepository.getAuditLog({}, limit);

    // Map repository fields to client-expected shape
    const mappedLogs = logs.map((log) => ({
      id: log.id,
      user_id: log.actorId,
      performed_by: log.actorId,
      action: log.action,
      object_type: log.targetType,
      object_id: log.targetId,
      payload: log.payload || {},
      timestamp: log.timestamp,
    }));

    res.json(mappedLogs);
  } catch (error) {
    next(error);
  }
});

export default router;
