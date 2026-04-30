import express from 'express';
import { authenticateRequest, AuthRequest } from '../auth/middleware.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { reviewQueueRepository } from '../db/reviewQueueRepository.js';
import { dataQualityRepository } from '../db/dataQualityRepository.js';

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

const BulkReviewSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          type: z.enum(['mention', 'claim']),
          id: z.coerce.number().int().positive(),
          decision: z.enum(['accept', 'reject', 'defer', 'insufficient_evidence']),
          reason: z.string().max(1000).optional(),
        }),
      )
      .min(1)
      .max(100),
    reviewed_by: z.string().optional(),
  }),
});

const FlagSchema = z.object({
  body: z.object({
    targetType: z.enum(['entity', 'document', 'claim', 'evidence']),
    targetId: z.union([z.string().min(1), z.coerce.number().int().positive()]),
    reason: z.string().min(1).max(1000),
    note: z.string().max(5000).optional(),
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

router.post('/bulk', authenticateRequest, validate(BulkReviewSchema), async (req, res, next) => {
  try {
    const { items, reviewed_by } = req.body as unknown as z.infer<typeof BulkReviewSchema>['body'];
    const reviewer = reviewed_by || (req as AuthRequest).user?.username || 'reviewer';
    const results: Array<{ type: string; id: number; decision: string; success: boolean }> = [];

    for (const item of items) {
      if (item.decision === 'accept') {
        if (item.type === 'claim') {
          await reviewQueueRepository.verifyClaim(item.id, reviewer);
        } else {
          await reviewQueueRepository.verifyMention(item.id, reviewer);
        }
      } else if (item.decision === 'reject') {
        const reason = item.reason || 'Bulk rejected during review';
        if (item.type === 'claim') {
          await reviewQueueRepository.rejectClaim(item.id, reason, reviewer);
        } else {
          await reviewQueueRepository.rejectMention(item.id, reason, reviewer);
        }
      } else {
        await dataQualityRepository.logAudit({
          actorId: reviewer,
          action: `review_${item.decision}`,
          targetType: item.type,
          targetId: String(item.id),
          payload: { reason: item.reason || null, preservedSourceData: true },
        });
      }

      results.push({ type: item.type, id: item.id, decision: item.decision, success: true });
    }

    res.json({ success: true, processed: results.length, results });
  } catch (e) {
    next(e);
  }
});

router.post('/flag', authenticateRequest, validate(FlagSchema), async (req, res, next) => {
  try {
    const { targetType, targetId, reason, note } = req.body as unknown as z.infer<
      typeof FlagSchema
    >['body'];
    const actorId = (req as AuthRequest).user?.username || 'reviewer';
    const id = await dataQualityRepository.logAudit({
      actorId,
      action: 'user_flagged_for_review',
      targetType,
      targetId: String(targetId),
      payload: {
        reason,
        note: note || null,
        reviewState: 'unreviewed',
        preservedSourceData: true,
      },
    });

    res.status(201).json({ success: true, flagId: id, status: 'pending_review' });
  } catch (e) {
    next(e);
  }
});

export default router;
