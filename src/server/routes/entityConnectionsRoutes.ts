import { Router, Request, Response, NextFunction } from 'express';
import { entityConnectionsRepository } from '../db/entityConnectionsRepository.js';
import { entitiesRepository } from '../db/entitiesRepository.js';
import { logger } from '../services/Logger.js';
import { EntityIdError, resolveCanonicalEntityId } from '../utils/id_utils.js';

const router = Router();

router.param('entityId', async (req, res, next, value) => {
  try {
    const resolved = await resolveCanonicalEntityId(value);
    req.params.entityId = String(resolved.canonicalId);
    res.locals.rawEntityId = String(value);
    res.locals.canonicalId = String(resolved.canonicalId);
    res.locals.entityFound = resolved.found;
    next();
  } catch (error) {
    if (error instanceof EntityIdError) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

// GET /api/entities/:entityId/connections
router.get('/:entityId/connections', async (req: Request, res: Response, next: NextFunction) => {
  const entityId = Number(req.params.entityId);
  if (!Number.isFinite(entityId)) {
    return res.status(400).json({ error: 'Invalid entity id' });
  }

  const rawLimit = Number(req.query.limit ?? 50);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 50;
  const rawMinScore = Number(req.query.minScore ?? 0);
  const minScore = Number.isFinite(rawMinScore) ? rawMinScore : 0;

  try {
    const connections = await entityConnectionsRepository.getConnections(entityId, {
      limit,
      minScore,
    });

    if (connections.length === 0) {
      const exists = await entitiesRepository.entityExists(entityId);
      if (!exists) {
        return res.status(404).json({ error: 'Entity not found' });
      }
    }

    return res.json({ connections, totalCount: connections.length });
  } catch (err) {
    logger.error({ err }, 'entityConnections: query failed');
    return next(err);
  }
});

export default router;
