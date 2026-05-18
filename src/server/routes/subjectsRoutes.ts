import express from 'express';
import { z } from 'zod';
import { entitiesRepository } from '../db/entitiesRepository.js';
import { mapSubjectsListResponseDto } from '../mappers/entitiesDtoMapper.js';
import { validate, subjectsQuerySchema } from '../middleware/validate.js';
import type { SearchFilters, SortOption } from '../../types.js';

export const subjectsRouter = express.Router();

subjectsRouter.use((_req, res, next) => {
  if (res.req?.baseUrl === '/api/subjects') {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Link', '</api/entities/subjects>; rel="canonical"');
  }
  next();
});

subjectsRouter.get('/', validate(subjectsQuerySchema), async (req, res, next) => {
  try {
    const query = req.query as unknown as z.infer<typeof subjectsQuerySchema>['query'];
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 24);

    const likelihoodRaw = query.likelihoodScore;
    const likelihoodScore = Array.isArray(likelihoodRaw)
      ? (likelihoodRaw as ('HIGH' | 'MEDIUM' | 'LOW')[])
      : typeof likelihoodRaw === 'string' && likelihoodRaw.length > 0
        ? [likelihoodRaw as 'HIGH' | 'MEDIUM' | 'LOW']
        : undefined;
    const normalizedLikelihoodScore = likelihoodScore
      ? Array.from(new Set(likelihoodScore)).filter(
          (v): v is 'HIGH' | 'MEDIUM' | 'LOW' => v === 'HIGH' || v === 'MEDIUM' || v === 'LOW',
        )
      : undefined;

    const filters: SearchFilters = {
      searchTerm: typeof query.search === 'string' ? query.search : undefined,
      role: typeof query.role === 'string' ? query.role : undefined,
      entityType: typeof query.entityType === 'string' ? query.entityType : undefined,
      likelihoodScore: normalizedLikelihoodScore,
      sortOrder: String(query.sortOrder || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc',
    };

    const sortByRaw = String(query.sortBy || 'risk').toLowerCase();
    const sortByAliases: Record<string, SortOption> = {
      default: 'risk',
      rfi: 'red_flag',
      red_flag: 'red_flag',
      red_flag_rating: 'red_flag',
      risk: 'risk',
      mentions: 'mentions',
      name: 'name',
      recent: 'recent',
      relevance: 'relevance',
      'date-desc': 'date-desc',
      'date-asc': 'date-asc',
      document_count: 'document-count',
      'document-count': 'document-count',
    };
    const sortBy = sortByAliases[sortByRaw] || 'risk';

    const result = await entitiesRepository.getSubjectCards(page, limit, filters, sortBy);
    res.json(mapSubjectsListResponseDto(result));
  } catch (error) {
    next(error);
  }
});
