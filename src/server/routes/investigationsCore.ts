import { Router } from 'express';
import type { AuthRequest } from '../auth/middleware.js';
import { investigationsRepository } from '../db/investigationsRepository.js';
import { authenticateRequest } from '../auth/middleware.js';
import { mapInvestigationListItemDto } from '../mappers/investigationsDtoMapper.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { rejectDeepOffset } from '../utils/paginationGuards.js';
import { InvestigationRow } from '../db/rowTypes.js';

const router = Router();

const HARD_CAP_INVESTIGATIONS_LIMIT = Math.max(
  1,
  Number(process.env.HARD_CAP_INVESTIGATIONS_LIMIT || 100),
);

// Schemas
const getInvestigationsSchema = z.object({
  query: z.object({
    status: z.string().optional(),
    ownerId: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).default(20),
  }),
});

const getByTitleSchema = z.object({
  query: z.object({
    title: z.string().min(1, 'title required'),
  }),
});

const createInvestigationSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    // ownerId is intentionally excluded — always derived from the authenticated user
  }),
});

const idParamSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

const numericIdParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int(),
  }),
});

const updateInvestigationSchema = z.object({
  params: z.object({
    id: z.coerce.number().int(),
  }),
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    // ownerId intentionally excluded — ownership cannot be transferred via PATCH
  }),
});

// Get all investigations — intentionally public (no auth): this is a public research archive.
router.get('/', validate(getInvestigationsSchema), async (req, res, next) => {
  try {
    const { status, ownerId, page, limit } = req.query;
    const filters = {
      status: status ? String(status) : undefined,
      ownerId: ownerId ? String(ownerId) : undefined,
      page: Number(page),
      limit: Math.min(HARD_CAP_INVESTIGATIONS_LIMIT, Number(limit)),
    };
    if (rejectDeepOffset(res, 'Investigation', filters.page, filters.limit)) return;
    res.setHeader('X-Limit-Applied', String(filters.limit));

    const result = await investigationsRepository.getInvestigations(filters);
    res.json({
      ...result,
      data: Array.isArray(result.data)
        ? (result.data as unknown as InvestigationRow[]).map(mapInvestigationListItemDto)
        : [],
    });
  } catch (error) {
    next(error);
  }
});

// Find investigation by exact title
router.get('/by-title', validate(getByTitleSchema), async (req, res, next) => {
  try {
    const { title } = req.query;
    const match = await investigationsRepository.getInvestigationByTitle(String(title));
    if (!match) return res.status(404).json({ error: 'Investigation not found' });
    res.json(match);
  } catch (error) {
    next(error);
  }
});

// Create investigation
router.post(
  '/',
  authenticateRequest,
  validate(createInvestigationSchema),
  async (req, res, next) => {
    try {
      const { title, description } = req.body;
      const ownerId = (req as AuthRequest).user?.id as string;

      const investigation = await investigationsRepository.createInvestigation({
        title,
        description,
        ownerId,
      });

      res.status(201).json(investigation);
    } catch (error) {
      next(error);
    }
  },
);

// Get single investigation
router.get('/:id', validate(idParamSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const numericId = Number(id);
    let investigation = Number.isFinite(numericId)
      ? await investigationsRepository.getInvestigationById(numericId)
      : null;

    if (!investigation) {
      investigation = await investigationsRepository.getInvestigationByUuid(id);
    }

    if (!investigation) {
      return res.status(404).json({ error: 'Investigation not found' });
    }

    res.json(mapInvestigationListItemDto(investigation as unknown as InvestigationRow));
  } catch (error) {
    next(error);
  }
});

// Get investigation statistics
router.get('/:id/stats', validate(idParamSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const numericId = Number(id);
    const stats = await investigationsRepository.getInvestigationStats(numericId);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// Update investigation
router.put(
  '/:id',
  authenticateRequest,
  validate(updateInvestigationSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const numericId = Number(id);
      const user = (req as AuthRequest).user;

      // Authorization: Admin OR Owner (mirrors the DELETE guard)
      const existing = await investigationsRepository.getInvestigationById(numericId);
      if (!existing) {
        return res.status(404).json({ error: 'Investigation not found' });
      }
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      if (user.role !== 'admin' && existing.ownerId !== user.id) {
        return res.status(403).json({ error: 'Unauthorized: Only admins or owners can edit' });
      }

      const updated = await investigationsRepository.updateInvestigation(numericId, req.body);

      if (!updated) {
        return res.status(404).json({ error: 'Investigation not found' });
      }

      res.json(updated);
    } catch (error) {
      next(error);
    }
  },
);

// Delete investigation
router.delete(
  '/:id',
  authenticateRequest,
  validate(numericIdParamSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = (req as AuthRequest).user;
      const numericId = Number(id);

      // Check if investigation exists and get owner
      const investigation = await investigationsRepository.getInvestigationById(numericId);
      if (!investigation) {
        return res.status(404).json({ error: 'Investigation not found' });
      }
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Authorization: Admin OR Owner
      if (user.role !== 'admin' && investigation.ownerId !== user.id) {
        return res.status(403).json({ error: 'Unauthorized: Only admins or owners can delete' });
      }

      const success = await investigationsRepository.deleteInvestigation(numericId);

      if (!success) {
        return res.status(404).json({ error: 'Investigation not found' });
      }

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
