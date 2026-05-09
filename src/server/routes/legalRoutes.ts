import express from 'express';
import { legalProceedingsRepository } from '../db/legalProceedingsRepository.js';

const router = express.Router();

// GET /api/legal-proceedings
router.get('/', async (req, res, next) => {
  try {
    const limit = Number(req.query.limit || 50);
    const proceedings = await legalProceedingsRepository.getProceedings(limit);
    res.json({ proceedings });
  } catch (error) {
    next(error);
  }
});

export default router;
