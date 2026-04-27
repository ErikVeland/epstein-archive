import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { relationshipsRepository } from '../db/relationshipsRepository.js';

const router = Router();

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
      return {
        entity_id: currentId,
        related_entity_id: neighborId,
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

export default router;
