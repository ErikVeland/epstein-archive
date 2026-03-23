import { Router, Request, Response } from 'express';
import { entityEvidenceRepository } from '../db/entityEvidenceRepository.js';
import crypto from 'crypto';
import { logger } from '../services/Logger.js';

const router = Router();

// GET /api/entities/:id/evidence
router.get('/:entityId/evidence', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params as { entityId: string };
    const result = await entityEvidenceRepository.getEntityMentionEvidence(entityId);

    if (!result) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching entity mention evidence');
    res.status(500).json({ error: 'Failed to fetch entity evidence' });
  }
});

// GET /api/entities/:id/relations
router.get('/:entityId/relations', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params as { entityId: string };
    const result = await entityEvidenceRepository.getRelationEvidenceForEntity(entityId);
    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching entity relation evidence');
    res.status(500).json({ error: 'Failed to fetch relation evidence' });
  }
});

const getEntityGraph = async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params as { entityId: string };
    const dbEntityId = parseInt(entityId, 10);
    if (Number.isNaN(dbEntityId)) {
      return res.status(400).json({ error: 'Invalid entity id' });
    }

    // Use the shared relationshipsRepository graph slice so analytics and
    // UI graph components stay consistent.
    const depth = req.query.depth
      ? Math.min(4, Math.max(1, parseInt(req.query.depth as string)))
      : 2;
    const { relationshipsRepository } = await import('../db/relationshipsRepository.js');
    const graph = await relationshipsRepository.getGraphSlice(dbEntityId, depth);
    res.json(graph);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching entity graph');
    res.status(500).json({ error: 'Failed to fetch entity graph' });
  }
};

// Canonical entity analytics route
router.get('/:entityId/analytics/graph', getEntityGraph);

// Legacy route alias (backward compatibility)
router.get('/:entityId/graph', getEntityGraph);

// GET /api/entities/:id/documents
router.get('/:entityId/documents', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params as { entityId: string };
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(200, parseInt(req.query.limit as string) || 50);
    const search = (req.query.search as string) || '';
    const source = (req.query.source as string) || 'all';
    const sort = (req.query.sort as string) || 'date';

    const { entitiesRepository } = await import('../db/entitiesRepository.js');

    const filters = { search, source, sort };
    const [docs, total] = await Promise.all([
      entitiesRepository.getEntityDocumentsPaginated(entityId, page, limit, filters),
      entitiesRepository.getEntityDocumentCount(entityId, filters),
    ]);

    res.json({
      data: docs,
      total,
      page,
      limit,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching entity documents');
    res.status(500).json({ error: 'Failed to fetch entity documents' });
  }
});

// GET /api/entities/:id/investigations
router.get('/:entityId/investigations', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params as { entityId: string };
    const { investigationsRepository } = await import('../db/investigationsRepository.js');
    const result = await investigationsRepository.getInvestigationsByEntityId(Number(entityId));
    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching entity investigations');
    res.status(500).json({ error: 'Failed to fetch entity investigations' });
  }
});

// GET /api/entities/:id/media
router.get('/:entityId/media', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params as { entityId: string };
    const { mediaRepository } = await import('../db/mediaRepository.js');
    const result = await mediaRepository.getMediaItems(entityId);

    if (!result || result.length === 0) {
      return res.status(204).send();
    }

    const jsonString = JSON.stringify(result);
    const etag = crypto.createHash('md5').update(jsonString).digest('hex');

    res.set('Cache-Control', 'public, max-age=86400, immutable');
    res.set('ETag', `"${etag}"`);

    // Basic Express ETag handling (304 Not Modified)
    if (req.headers['if-none-match'] === `"${etag}"`) {
      return res.status(304).send();
    }

    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching entity media');
    res.status(500).json({ error: 'Failed to fetch entity media' });
  }
});

export default router;
