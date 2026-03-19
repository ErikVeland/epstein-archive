import { Request, Response, NextFunction } from 'express';
import { getApiPool } from '../db/connection.js';
import { logAudit } from '../utils/auditLogger.js';
import { requireRole as canonicalRequireRole } from '../auth/middleware.js';
import { logger } from '../services/Logger.js';

// Extend Express Request to include user info
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    permissions: string[];
  };
}

/**
 * 2. Enforce Quarantine Middleware
 * Checks if the requested resource is quarantined.
 * Assumes route params contain :id and we know the type.
 */
export const enforceQuarantine = (resourceType: 'document' | 'media') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;
    if (!id) return next(); // Should not happen if route matches :id

    try {
      const pool = getApiPool();
      const table = resourceType === 'document' ? 'documents' : 'media_items';

      const { rows } = await pool.query(
        `SELECT is_quarantined, quarantine_reason FROM ${table} WHERE id = $1`,
        [id],
      );
      const item = rows[0];

      if (item && item.is_quarantined) {
        // Check if user has admin override
        const user = (req as AuthenticatedRequest).user;
        const isAdmin = user?.role === 'admin';

        if (!isAdmin) {
          await logAudit('quarantine', user?.id || null, resourceType, id, {
            reason: 'access_denied_quarantine',
          });
          return res.status(403).json({
            error: 'Resource unavailable',
          });
        }

        // Admin access to quarantined item - Log it!
        await logAudit('view', user?.id || null, resourceType, id, {
          reason: 'quarantine_override',
        });
      }

      next();
    } catch (err) {
      logger.error({ err: err }, 'Quarantine check failed');
      // Fail closed
      res.status(500).json({ error: 'Security check failed' });
    }
  };
};

/**
 * 3. Role-Based Access Control
 */
export const requireRole = canonicalRequireRole;

/**
 * 4. Audit Log Middleware
 * Logs successful access after the fact.
 */
export const auditAccess = (
  action: 'view' | 'download' | 'export',
  resourceType: 'document' | 'media',
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // We hook into the response 'finish' event to know if it sent 200 OK
    res.on('finish', () => {
      // If status is 2xx, logging success
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const id = req.params.id;
        if (id) {
          void logAudit(action, (req as any).user?.id || null, resourceType, id, {}).catch(
            (err) => {
              logger.error({ err: err }, 'Audit log write failed in auditAccess middleware');
            },
          );
        }
      }
    });
    next();
  };
};
