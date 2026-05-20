import express from 'express';
import { articlesRepository } from '../db/articlesRepository.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { logger } from '../services/Logger.js';
import { rejectDeepOffset } from '../utils/paginationGuards.js';

const router = express.Router();

// Schemas
const getArticlesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    search: z.string().optional(),
    publication: z.string().optional(),
    sort: z.enum(['date', 'redFlag']).default('redFlag'),
  }),
});

const articleIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

// GET /api/articles
router.get('/', validate(getArticlesSchema), async (req, res) => {
  try {
    type ArticlesQuery = z.infer<typeof getArticlesSchema>['query'];
    const { page, limit, search, publication, sort } = req.query as unknown as ArticlesQuery;
    if (rejectDeepOffset(res, 'Article', page, limit)) return;
    const offset = (page - 1) * limit;

    const result = await articlesRepository.getArticles(limit, offset, search, publication, sort);

    res.json({
      data: result.articles,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching articles');
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// GET /api/articles/:id
router.get('/:id', validate(articleIdSchema), async (req, res) => {
  try {
    const article = await articlesRepository.getArticleById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json(article);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching article');
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

export default router;
