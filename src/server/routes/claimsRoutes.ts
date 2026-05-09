import express from 'express';
import { claimTriplesRepository } from '../db/claimTriplesRepository.js';
import { authenticateRequest, requireRole, type AuthRequest } from '../auth/middleware.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const verifyClaimSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    status: z.number().int().min(1).max(2), // 1=verified, 2=rejected
    rejectionReason: z.string().optional(),
  }),
});

// GET /api/claims/corroborated
router.get('/corroborated', async (req, res, next) => {
  try {
    const limit = Number(req.query.limit || 50);
    const corroborated = await claimTriplesRepository.getCorroboratedClaims(limit);
    return res.json({ corroborated });
  } catch (error) {
    return next(error);
  }
});

// GET /api/claims/:id
router.get('/:id', async (req, res, next) => {
  try {
    const claim = await claimTriplesRepository.getById(req.params.id);
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    return res.json(claim);
  } catch (error) {
    return next(error);
  }
});

// POST /api/claims/:id/verify
router.post(
  '/:id/verify',
  authenticateRequest,
  requireRole('admin'),
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
