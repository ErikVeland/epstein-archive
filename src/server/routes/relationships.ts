import express from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { relationshipsRepository } from '../db/relationshipsRepository.js';

const router = express.Router();

// Schemas
const getRelationshipsSchema = z.object({
  query: z.object({
    entityId: z.string().min(1, 'entityId is required'),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    minWeight: z.coerce.number().optional(),
  }),
});

// Relationships API
router.get('/', validate(getRelationshipsSchema), async (req, res, next) => {
  try {
    type RelQuery = z.infer<typeof getRelationshipsSchema>['query'];
    const { entityId, limit, minWeight } = req.query as unknown as RelQuery;

    const result = await relationshipsRepository.getRelationships(entityId, {
      minWeight,
      limit,
    });

    const currentId = String(result.canonicalId);
    const mapped = result.relationships.map((r) => {
      const sourceId = String(r.source_id);
      const targetId = String(r.target_id);
      const neighborId = sourceId === currentId ? targetId : sourceId;
      const neighborName = sourceId === currentId ? r.target_entity_name : r.source_entity_name;
      return {
        entity_id: currentId,
        related_entity_id: neighborId,
        related_entity_name: neighborName,
        relationship_type: r.relationship_type,
        strength: r.proximity_score,
        confidence: r.confidence,
        weight: r.proximity_score,
      };
    });

    res.json({ relationships: mapped });
  } catch (error) {
    next(error);
  }
});

// GET /api/relationships/path
router.get('/path', async (req, res, next) => {
  try {
    const { source, target } = req.query;
    if (!source || !target) {
      return res.status(400).json({ error: 'source and target parameters are required' });
    }
    const path = await relationshipsRepository.findShortestPath(String(source), String(target));
    res.json({ path });
  } catch (error) {
    next(error);
  }
});

export default router;
