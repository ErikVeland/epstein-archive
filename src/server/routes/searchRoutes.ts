import express from 'express';
import { searchRepository } from '../db/searchRepository.js';
import { validate, searchSchema } from '../middleware/validate.js';
import { mapUnifiedSearchResponseDto } from '../mappers/searchDtoMapper.js';
import { logger } from '../services/Logger.js';

const router = express.Router();

router.get('/', validate(searchSchema), async (req, res, next) => {
  try {
    const q = String(req.query.q || req.query.query || '').trim();
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));

    if (!q) {
      return res.json({
        entities: [],
        documents: [],
        investigations: [],
        articles: [],
        media: [],
        didYouMean: [],
      });
    }

    const result = await searchRepository.search(q, limit);
    res.json(mapUnifiedSearchResponseDto(result));
  } catch (error) {
    logger.error({ err: error, query: req.query.q }, 'Global search failed');
    next(error);
  }
});

export default router;
