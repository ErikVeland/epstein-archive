import express from 'express';
import { testimoniesRepository } from '../db/testimoniesRepository.js';

const router = express.Router();

// GET /api/testimonies
router.get('/', async (req, res, next) => {
  try {
    const limit = Number(req.query.limit || 20);
    const testimonies = await testimoniesRepository.getTestimonies(limit);
    res.json({ testimonies });
  } catch (error) {
    next(error);
  }
});

export default router;
