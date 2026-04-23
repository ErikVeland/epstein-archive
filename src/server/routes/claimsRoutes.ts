import { Router } from 'express';
import { claimTriplesRepository } from '../db/claimTriplesRepository.js';
import { authenticateRequest, type AuthRequest } from '../auth/middleware.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const router = Router();

const verifyClaimSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    status: z.number().int().min(1).max(2), // 1=verified, 2=rejected
    rejectionReason: z.string().optional(),
  }),
});

// POST /api/claims/:id/verify
router.post(
  '/:id/verify',
  authenticateRequest,
  validate(verifyClaimSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status, rejectionReason } = req.body;
      const verifiedBy = (req as AuthRequest).user?.username || 'anonymous';

      await claimTriplesRepository.verify(id, verifiedBy, status, rejectionReason);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
