import express from 'express';
import { memoryRepository } from '../db/memoryRepository.js';
import { getApiPool } from '../db/connection.js';
import { authenticateRequest } from '../auth/middleware.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { rejectDeepOffset } from '../utils/paginationGuards.js';

const router = express.Router();

const memoryQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    memoryType: z.enum(['declarative', 'episodic', 'working', 'procedural']).optional(),
    status: z.enum(['active', 'archived', 'deprecated']).optional(),
    q: z.string().optional(),
  }),
});

const createMemorySchema = z.object({
  body: z.object({
    memoryType: z.enum(['declarative', 'episodic', 'working', 'procedural']),
    content: z.string().min(1),
    contextTags: z.array(z.string()).optional(),
    importanceScore: z.number().min(0).max(1).optional(),
    sourceId: z.number().optional(),
    sourceType: z.string().optional(),
    provenance: z.record(z.string(), z.unknown()).optional(),
  }),
});

const updateMemorySchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    content: z.string().optional(),
    contextTags: z.array(z.string()).optional(),
    importanceScore: z.number().min(0).max(1).optional(),
    status: z.enum(['active', 'archived', 'deprecated']).optional(),
    provenance: z.record(z.string(), z.unknown()).optional(),
  }),
});

const memoryIdParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

router.get('/', authenticateRequest, validate(memoryQuerySchema), async (req, res, next) => {
  try {
    type MemoryQuery = z.infer<typeof memoryQuerySchema>['query'];
    const { page, limit, memoryType, status, q } = req.query as unknown as MemoryQuery;
    if (rejectDeepOffset(res, 'Memory entry', page, limit)) return;
    const pool = getApiPool();
    const result = await memoryRepository.searchMemoryEntries(
      pool,
      { memoryType, status, searchQuery: q },
      page,
      limit,
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticateRequest, validate(createMemorySchema), async (req, res, next) => {
  try {
    const pool = getApiPool();
    const newEntry = await memoryRepository.createMemoryEntry(pool, req.body);
    res.status(201).json(newEntry);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticateRequest, validate(updateMemorySchema), async (req, res, next) => {
  try {
    const pool = getApiPool();
    const id = parseInt(req.params.id, 10);
    const updatedEntry = await memoryRepository.updateMemoryEntry(pool, id, req.body);
    if (!updatedEntry) return res.status(404).json({ error: 'Memory entry not found' });
    res.json(updatedEntry);
  } catch (error) {
    next(error);
  }
});

router.delete(
  '/:id',
  authenticateRequest,
  validate(memoryIdParamSchema),
  async (req, res, next) => {
    try {
      const pool = getApiPool();
      const id = parseInt(req.params.id, 10);
      const success = await memoryRepository.deleteMemoryEntry(pool, id);
      if (!success) return res.status(404).json({ error: 'Memory entry not found' });
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  },
);

export default router;
