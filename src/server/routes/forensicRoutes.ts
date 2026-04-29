import express from 'express';
import { authenticateRequest } from '../auth/middleware.js';
import { forensicRepository } from '../db/forensicRepository.js';

const router = express.Router();

// Get forensic metrics summary
router.get('/metrics-summary', authenticateRequest, async (_req, res, next) => {
  try {
    const metrics = await forensicRepository.getMetricsSummary();
    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

export default router;
