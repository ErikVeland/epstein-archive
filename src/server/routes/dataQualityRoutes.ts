import express from 'express';
import { dataQualityRepository } from '../db/dataQualityRepository.js';
import { authenticateRequest } from '../auth/middleware.js';

const router = express.Router();

/**
 * GET /api/data-quality/metrics
 * Returns comprehensive data quality and coverage metrics.
 */
router.get('/metrics', authenticateRequest, async (_req, res, next) => {
  try {
    const metrics = await dataQualityRepository.getMetrics();
    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/data-quality/lineage/:id
 * Returns document provenance and lineage.
 */
router.get('/lineage/:id', authenticateRequest, async (req, res, next) => {
  try {
    const lineage = await dataQualityRepository.getDocumentLineage(req.params.id);
    if (!lineage) return res.status(404).json({ error: 'Document not found' });
    res.json(lineage);
  } catch (error) {
    next(error);
  }
});

export default router;
