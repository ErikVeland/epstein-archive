import { Router, Request, Response } from 'express';
import { entityEvidenceRepository } from '../db/entityEvidenceRepository.js';
import crypto from 'crypto';
import { logger } from '../services/Logger.js';
import { EntityIdError, resolveCanonicalEntityId } from '../utils/id_utils.js';

const router = Router();

router.param('entityId', async (req, res, next, value) => {
  try {
    const resolved = await resolveCanonicalEntityId(value);
    req.params.entityId = String(resolved.canonicalId);
    res.locals.rawEntityId = String(value);
    res.locals.canonicalId = String(resolved.canonicalId);
    next();
  } catch (error) {
    if (error instanceof EntityIdError) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

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
    const relations = Array.isArray(result.relations)
      ? result.relations.map((rel) => ({
          id: rel.id,
          subjectEntityId: rel.subject_entity_id,
          objectEntityId: rel.object_entity_id,
          predicate: rel.predicate,
          direction: rel.direction,
          weight: rel.weight,
          firstSeenAt: rel.first_seen_at,
          lastSeenAt: rel.last_seen_at,
          evidence: Array.isArray(rel.evidence)
            ? rel.evidence.map((ev) => ({
                id: ev.id,
                documentId: ev.document_id,
                spanId: ev.span_id,
                quoteText: ev.quote_text,
                confidence: ev.confidence,
                mentionIds: ev.mention_ids,
                documentTitle: ev.document_title,
                documentPath: ev.document_path,
              }))
            : [],
        }))
      : [];
    res.json({ relations });
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
    logger.error({ err: error }, 'Error building entity graph');
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
    logger.error({ err: error }, 'Error fetching entity photo path');
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
  } catch (_error) {
    logger.error({ err: _error }, 'Error fetching entity investigations');
    res.status(500).json({ error: 'Failed to fetch entity investigations' });
  }
});

// GET /api/entities/:id/media
router.get('/:entityId/media', async (req: Request, res: Response) => {
  const { entityId } = req.params as { entityId: string };
  try {
    const { mediaRepository } = await import('../db/mediaRepository.js');
    const result = await mediaRepository.getMediaItems(entityId);

    if (!result || result.length === 0) {
      // Return 200 OK with empty array instead of 204 No Content
      // to avoid breaking frontend fetch().json() parsing.
      return res.json([]);
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
  } catch (_error) {
    logger.error({ err: _error, entityId }, 'Error fetching entity media');
    res.status(500).json({ error: 'Failed to fetch entity media' });
  }
});

router.get('/:entityId/photo', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params as { entityId: string };
    const { mediaRepository } = await import('../db/mediaRepository.js');
    const preferredPhoto = await mediaRepository.getEntityProfilePhoto(entityId);

    if (!preferredPhoto) {
      return res.status(404).json({ error: 'No photo found for entity' });
    }

    // If it's a dedicated crop path, serve it; otherwise redirect to the media thumbnail route
    if (preferredPhoto.includes('crop')) {
      const path = await import('path');
      const fs = await import('fs');
      const resolved = preferredPhoto.startsWith('/')
        ? preferredPhoto
        : path.resolve(process.cwd(), preferredPhoto);

      if (fs.existsSync(resolved)) {
        res.type(path.extname(resolved) || 'image/jpeg');
        return res.sendFile(resolved);
      }
    }

    // Fallback to searching for the media item if we just have a thumbnail path fragment
    // For simplicity, we can redirect to the media images thumbnail endpoint if we can identify the ID
    // But since getEntityProfilePhoto returns the path, let's just serve it if it exists.
    const path = await import('path');
    const fs = await import('fs');
    const resolvedFallback = preferredPhoto.startsWith('/')
      ? preferredPhoto
      : path.resolve(process.cwd(), preferredPhoto);

    if (fs.existsSync(resolvedFallback)) {
      res.type(path.extname(resolvedFallback) || 'image/jpeg');
      return res.sendFile(resolvedFallback);
    }

    res.status(404).json({ error: 'Photo file not found on disk' });
  } catch (err) {
    logger.error({ err, entityId: req.params.entityId }, 'Error fetching entity photo');
    res.status(500).json({ error: 'Failed to fetch entity photo' });
  }
});

// GET /api/entities/:entityId/claims
router.get('/:entityId/claims', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params as { entityId: string };
    const { claimTriplesRepository } = await import('../db/claimTriplesRepository.js');
    const claims = await claimTriplesRepository.getByEntityId(entityId);
    res.json(claims);
  } catch (_error) {
    logger.error({ err: _error, entityId: req.params.entityId }, 'Error fetching entity claims');
    res.status(500).json({ error: 'Failed to fetch entity claims' });
  }
});

// GET /api/entities/:entityId/flights
router.get('/:entityId/flights', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params as { entityId: string };
    const flights = await entityEvidenceRepository.getFlightsForEntity(entityId);
    res.json({ flights });
  } catch (error) {
    logger.error({ err: error, entityId: req.params.entityId }, 'Error fetching entity flights');
    res.status(500).json({ error: 'Failed to fetch entity flights' });
  }
});

// GET /api/entities/:entityId/transactions
router.get('/:entityId/transactions', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params as { entityId: string };
    const result = await entityEvidenceRepository.getTransactionsForEntity(entityId);
    if (!result) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    res.json(result);
  } catch (error) {
    logger.error(
      { err: error, entityId: req.params.entityId },
      'Error fetching entity transactions',
    );
    res.status(500).json({ error: 'Failed to fetch entity transactions' });
  }
});

// GET /api/entities/:entityId/properties
router.get('/:entityId/properties', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params as { entityId: string };
    const properties = await entityEvidenceRepository.getPropertiesForEntity(entityId);
    res.json({ properties });
  } catch (error) {
    logger.error({ err: error, entityId: req.params.entityId }, 'Error fetching entity properties');
    res.status(500).json({ error: 'Failed to fetch entity properties' });
  }
});

export default router;
