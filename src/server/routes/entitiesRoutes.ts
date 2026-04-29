import express from 'express';
import { z } from 'zod';
import { entitiesRepository } from '../db/entitiesRepository.js';
import { mediaRepository } from '../db/mediaRepository.js';
import {
  mapEntityDetailDto,
  mapEntityListResponseDto,
  mapSubjectsListResponseDto,
  mapEntityListItemDto,
} from '../mappers/entitiesDtoMapper.js';
import {
  validate,
  subjectsQuerySchema,
  entitiesQuerySchema,
  entityIdParamSchema,
  searchSchema,
} from '../middleware/validate.js';
import { resolveMediaPath } from '../utils/pathResolver.js';
import fs from 'fs';
import path from 'path';
import type { SearchFilters, SortOption } from '../../types.js';
import type { EntityRow } from '../db/rowTypes.js';

const router = express.Router();

router.get('/subjects', validate(subjectsQuerySchema), async (req, res, next) => {
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

    const filters: SearchFilters = {
      searchTerm: typeof query.search === 'string' ? query.search : undefined,
      role: typeof query.role === 'string' ? query.role : undefined,
      entityType: typeof query.entityType === 'string' ? query.entityType : undefined,
      likelihoodScore,
      sortOrder: String(query.sortOrder || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc',
    };
    const sortBy: SortOption =
      typeof query.sortBy === 'string' ? (query.sortBy as SortOption) : 'risk';
    const result = await entitiesRepository.getSubjectCards(page, limit, filters, sortBy);

    res.json(mapSubjectsListResponseDto(result));
  } catch (error) {
    next(error);
  }
});

router.get('/', validate(entitiesQuerySchema), async (req, res, next) => {
  try {
    const query = req.query as unknown as z.infer<typeof entitiesQuerySchema>['query'];
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(500, Math.max(1, Number(query.limit || 24)));
    const sortByRaw = String(query.sortBy || 'risk').toLowerCase();
    const sortByAliases: Record<string, SortOption> = {
      default: 'red_flag',
      red_flag: 'red_flag',
      red_flag_rating: 'red_flag',
      rfi: 'red_flag',
      risk: 'risk',
      mentions: 'mentions',
      name: 'name',
      recent: 'recent',
      relevance: 'relevance',
      document_count: 'document-count',
      'document-count': 'document-count',
    };
    const sortBy = sortByAliases[sortByRaw] || 'red_flag';

    const likelihoodRaw = query.likelihood || query.likelihoodScore;
    const likelihoodScore = Array.isArray(likelihoodRaw)
      ? (likelihoodRaw as ('HIGH' | 'MEDIUM' | 'LOW')[])
      : typeof likelihoodRaw === 'string' && likelihoodRaw.length > 0
        ? [likelihoodRaw as 'HIGH' | 'MEDIUM' | 'LOW']
        : undefined;

    const filters: SearchFilters = {
      searchTerm: typeof query.search === 'string' ? query.search : undefined,
      role: typeof query.role === 'string' ? query.role : undefined,
      likelihoodScore,
      minRedFlagIndex:
        query.minRedFlagIndex !== undefined ? Number(query.minRedFlagIndex) : undefined,
      maxRedFlagIndex:
        query.maxRedFlagIndex !== undefined ? Number(query.maxRedFlagIndex) : undefined,
      entityType: typeof query.type === 'string' ? query.type : undefined,
    };
    const result = await entitiesRepository.getEntities(page, limit, filters, sortBy);

    res.json(
      mapEntityListResponseDto({
        entities: result.entities as Record<string, unknown>[],
        total: result.total,
        page,
        pageSize: limit,
        photosByEntity: {},
      }),
    );
  } catch (error) {
    next(error);
  }
});

const allEntitiesSchema = z.object({
  query: z.object({ limit: z.coerce.number().int().min(1).max(10000).default(1000) }),
});

router.get('/all', validate(allEntitiesSchema), async (req, res, next) => {
  try {
    const { limit } = req.query as unknown as z.infer<typeof allEntitiesSchema>['query'];
    const entities = await entitiesRepository.getAllEntities(limit);
    res.json((entities as EntityRow[]).map((entity) => mapEntityListItemDto(entity)));
  } catch (error) {
    next(error);
  }
});

router.get('/search', validate(searchSchema), async (req, res, next) => {
  try {
    const query = req.query as unknown as z.infer<typeof searchSchema>['query'];
    const q = String(query.q || '').trim();
    const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
    const result = await entitiesRepository.getEntities(
      1,
      limit,
      q ? ({ searchTerm: q } as SearchFilters) : undefined,
      'relevance',
    );
    res.json({
      results: (result.entities as EntityRow[]).map((entity) => mapEntityListItemDto(entity)),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', validate(entityIdParamSchema), async (req, res, next) => {
  try {
    const entity = await entitiesRepository.getEntityById(req.params.id);
    if (!entity) return res.status(404).json({ error: 'Entity not found' });
    return res.json(mapEntityDetailDto(entity as unknown as Record<string, unknown>));
  } catch (error) {
    next(error);
  }
});

router.get('/:id/portrait', validate(entityIdParamSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const portraitPath = await mediaRepository.getEntityProfilePhoto(id);
    if (!portraitPath) {
      return res.status(404).json({ error: 'Portrait not found' });
    }

    const resolved = resolveMediaPath(portraitPath);
    if (!resolved || !fs.existsSync(resolved)) {
      return res.status(404).json({ error: 'Portrait file not found' });
    }

    res.type(path.extname(resolved) || 'image/jpeg');
    return res.sendFile(resolved);
  } catch (error) {
    next(error);
  }
});

const batchPortraitsSchema = z.object({ query: z.object({ ids: z.string().min(1) }) });

router.get('/batch/portraits', validate(batchPortraitsSchema), async (req, res, next) => {
  try {
    const { ids: idsStr } = req.query as unknown as z.infer<typeof batchPortraitsSchema>['query'];
    const rawIds = idsStr.split(',').filter(Boolean);
    if (rawIds.length > 100) {
      return res.status(400).json({ error: 'Max 100 ids allowed per batch request' });
    }

    const results = await Promise.all(
      rawIds.map(async (id: string) => {
        const portraitPath = await mediaRepository.getEntityProfilePhoto(id);
        return {
          entityId: id,
          url: portraitPath ? `/api/entities/${id}/portrait` : null,
        };
      }),
    );

    res.json({ items: results });
  } catch (error) {
    next(error);
  }
});

export default router;
