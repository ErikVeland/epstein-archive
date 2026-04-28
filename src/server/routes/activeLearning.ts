import express from 'express';
import { authenticateRequest, AuthRequest } from '../auth/middleware.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { reviewQueueRepository } from '../db/reviewQueueRepository.js';

const router = express.Router();

// validation schemas
const VerifySchema = z.object({
  body: z.object({
    verified_by: z.string().optional(),
  }),
});

const RejectSchema = z.object({
  body: z.object({
    verified_by: z.string().optional(),
    rejection_reason: z.string().min(1),
  }),
});

const QueueSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

const IdParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

// 1. Mentions Queue
// Fetch mentions that are high signal (entity relevant) but unverified
// Priority: Signal Score (via document/sentence) + Confidence < 1.0
router.get(
  '/mentions/queue',
  authenticateRequest,
  validate(QueueSchema),
  async (req, res, next) => {
    try {
      const { limit } = req.query as unknown as z.infer<typeof QueueSchema>['query'];

      const queue = await reviewQueueRepository.getMentionsQueue(limit);

      res.json(queue);
    } catch (e) {
      next(e);
    }
  },
);

// Verify Mention
router.post(
  '/mentions/:id/verify',
  authenticateRequest,
  validate(IdParamSchema),
  validate(VerifySchema),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof IdParamSchema>['params'];
      const { verified_by } = req.body as unknown as z.infer<typeof VerifySchema>['body'];
      const verifiedBy = verified_by || (req as AuthRequest).user?.username || 'reviewer';
      await reviewQueueRepository.verifyMention(Number(id), verifiedBy);

      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  },
);

// Reject Mention
router.post(
  '/mentions/:id/reject',
  authenticateRequest,
  validate(IdParamSchema),
  validate(RejectSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof IdParamSchema>['params'];
      const { verified_by, rejection_reason } = req.body as unknown as z.infer<
        typeof RejectSchema
      >['body'];
      const verifiedBy = verified_by || (req as AuthRequest).user?.username || 'reviewer';
      await reviewQueueRepository.rejectMention(Number(id), rejection_reason, verifiedBy);

      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  },
);

// 2. Claims Queue
router.get('/claims/queue', authenticateRequest, validate(QueueSchema), async (req, res, next) => {
  try {
    const { limit } = req.query as unknown as z.infer<typeof QueueSchema>['query'];

    const queue = await reviewQueueRepository.getClaimsQueue(limit);

    res.json(queue);
  } catch (e) {
    next(e);
  }
});

// Verify Claim
router.post(
  '/claims/:id/verify',
  authenticateRequest,
  validate(IdParamSchema),
  validate(VerifySchema),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof IdParamSchema>['params'];
      const { verified_by } = req.body as unknown as z.infer<typeof VerifySchema>['body'];
      const verifiedBy = verified_by || (req as AuthRequest).user?.username || 'reviewer';
      await reviewQueueRepository.verifyClaim(Number(id), verifiedBy);

      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  },
);

// Reject Claim
router.post(
  '/claims/:id/reject',
  authenticateRequest,
  validate(IdParamSchema),
  validate(RejectSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof IdParamSchema>['params'];
      const { verified_by, rejection_reason } = req.body as unknown as z.infer<
        typeof RejectSchema
      >['body'];
      const verifiedBy = verified_by || (req as AuthRequest).user?.username || 'reviewer';
      await reviewQueueRepository.rejectClaim(Number(id), rejection_reason, verifiedBy);

      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
