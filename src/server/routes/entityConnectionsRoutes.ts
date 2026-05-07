import { Router, Request, Response } from 'express';
import { entityConnectionsRepository } from '../db/entityConnectionsRepository.js';
import { logger } from '../services/Logger.js';

const router = Router();

// GET /api/entities/:id/connections
router.get('/:id/connections', async (req: Request, res: Response) => {
  const entityId = Number(req.params.id);
  if (!Number.isFinite(entityId)) {
    return res.status(400).json({ error: 'Invalid entity id' });
  }

  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const minScore = Number(req.query.minScore ?? 0);

  try {
    const connections = await entityConnectionsRepository.getConnections(entityId, {
      limit,
      minScore,
    });
    return res.json({ connections, totalCount: connections.length });
  } catch (err) {
    logger.error({ err }, 'Error fetching entity connections');
    return res.status(500).json({ error: 'Failed to load connections' });
  }
});

export default router;
