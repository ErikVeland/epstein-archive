import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { vitalsPostLimiter } from '../middleware/rateLimit.js';
import { logger } from '../services/Logger.js';

const router = Router();

const productEventSchema = z.object({
  body: z.object({
    event: z.enum([
      'investigation_list_loaded',
      'investigation_case_opened',
      'investigation_create_started',
      'investigation_created',
      'investigation_view_opened',
      'investigation_evidence_added',
      'investigation_export_completed',
    ]),
    sessionId: z.string().uuid(),
    route: z.string().max(300),
    caseId: z.string().max(100).optional(),
    metadata: z
      .record(z.string(), z.union([z.string().max(200), z.number(), z.boolean()]))
      .optional(),
    timestamp: z.number().int().positive(),
  }),
});

router.post('/', vitalsPostLimiter, validate(productEventSchema), (req, res) => {
  logger.info(
    {
      productEvent: req.body.event,
      sessionId: req.body.sessionId,
      route: req.body.route,
      caseId: req.body.caseId,
      metadata: req.body.metadata,
      clientTimestamp: req.body.timestamp,
    },
    '[PRODUCT_EVENT]',
  );
  res.status(204).send();
});

export default router;
