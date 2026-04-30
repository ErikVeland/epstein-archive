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
    const filters = {
      mode: req.query.mode as 'web' | 'prefix' | 'lexical' | 'semantic' | 'hybrid' | undefined,
      evidenceType: req.query.evidenceType ? String(req.query.evidenceType) : undefined,
      sourceType: req.query.sourceType ? String(req.query.sourceType) : undefined,
      mediaType: req.query.mediaType ? String(req.query.mediaType) : undefined,
      entityType: req.query.entityType ? String(req.query.entityType) : undefined,
      reviewState: req.query.reviewState ? String(req.query.reviewState) : undefined,
      redFlagBand: req.query.redFlagBand as 'low' | 'medium' | 'high' | undefined,
      confidenceMin: req.query.confidenceMin == null ? undefined : Number(req.query.confidenceMin),
      confidenceMax: req.query.confidenceMax == null ? undefined : Number(req.query.confidenceMax),
      dateFrom: req.query.dateFrom ? String(req.query.dateFrom) : undefined,
      dateTo: req.query.dateTo ? String(req.query.dateTo) : undefined,
    };

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

    const result = await searchRepository.search(q, limit, filters);
    res.json(mapUnifiedSearchResponseDto(result));
  } catch (error) {
    logger.error({ err: error, query: req.query.q }, 'Global search failed');
    next(error);
  }
});

export default router;
