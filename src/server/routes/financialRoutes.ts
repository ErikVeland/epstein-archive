import { Router } from 'express';
import { authenticateRequest } from '../auth/middleware.js';
import { financialRepository } from '../db/financialRepository.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const router = Router();

// Schemas
const transactionsSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(500).default(100),
  }),
});

// Get all transactions (with limit)
router.get(
  '/transactions',
  authenticateRequest,
  validate(transactionsSchema),
  async (req, res, next) => {
    try {
      type TransQuery = z.infer<typeof transactionsSchema>['query'];
      const { limit } = req.query as unknown as TransQuery;
      const transactions = await financialRepository.getTransactions(limit);
      res.json(transactions);
    } catch (error) {
      next(error);
    }
  },
);

// Get financial stats
router.get('/stats', authenticateRequest, async (_req, res, next) => {
  try {
    const summary = await financialRepository.getFinancialSummary();
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// NOTE: The /seed endpoint has been removed to prevent non-corpus transaction records
// from entering the evidentiary workflow.

export default router;
