/**
 * REVISION TOKEN ENDPOINT
 *
 * Admin endpoint to get canonical revision token
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getRevisionInfo } from '../revisionManager.js';
import { authenticateRequest, requireRole } from '../auth/middleware.js';

import { dataQualityRepository } from '../db/dataQualityRepository.js';

const router = Router();

/**
 * GET /api/admin/revision
 *
 * Get canonical dataset revision token
 * Requires admin role
 */
router.get(
  '/revision',
  authenticateRequest,
  requireRole('admin'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const revisionInfo = await getRevisionInfo();
      res.json(revisionInfo);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/admin/audit-logs
 *
 * Returns recent system audit logs for administrative review.
 * Requires admin role
 */
router.get(
  '/audit-logs',
  authenticateRequest,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 100, 1), 1000);
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
  },
);

export default router;
