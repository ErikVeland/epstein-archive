import { Router } from 'express';
import { authenticateRequest } from '../auth/middleware.js';
import { financialRepository } from '../db/financialRepository.js';
import { validate, financialTransactionsQuerySchema } from '../middleware/validate.js';
import { z } from 'zod';

import {
  mapFinancialTransactionDto,
  mapFinancialSummaryDto,
} from '../mappers/financialDtoMapper.js';

const router = Router();

// Get all transactions (with limit)
router.get(
  '/transactions',
  authenticateRequest,
  validate(financialTransactionsQuerySchema),
  async (req, res, next) => {
    try {
      const { limit } = req.query as unknown as z.infer<
        typeof financialTransactionsQuerySchema
      >['query'];
      const transactions = await financialRepository.getTransactions(limit);
      res.json(transactions.map(mapFinancialTransactionDto));
    } catch (error) {
      next(error);
    }
  },
);

// Get financial stats
router.get('/stats', authenticateRequest, validate(z.object({})), async (_req, res, next) => {
  try {
    const summary = await financialRepository.getFinancialSummary();
    res.json(mapFinancialSummaryDto(summary));
  } catch (error) {
    next(error);
  }
});

// NOTE: The /seed endpoint has been removed to prevent non-corpus transaction records
// from entering the evidentiary workflow.

export default router;
