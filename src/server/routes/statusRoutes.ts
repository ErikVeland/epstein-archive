import express from 'express';
import { statsRepository } from '../db/statsRepository.js';
import { archiveStatusSchema } from '../../shared/schemas/stats.js';

const router = express.Router();

router.get('/archive', async (_req, res, next) => {
  try {
    const status = await statsRepository.getArchiveStatus();
    res.json(archiveStatusSchema.parse(status));
  } catch (error) {
    next(error);
  }
});

export default router;
