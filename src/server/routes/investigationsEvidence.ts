import { Router, Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../auth/middleware.js';
import { investigationsRepository } from '../db/investigationsRepository.js';
import { authenticateRequest, requireRole } from '../auth/middleware.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';
import {
  mapInvestigationEvidenceByTypeResponseDto,
  mapInvestigationEvidenceListResponseDto,
} from '../mappers/investigationsDtoMapper.js';

const router = Router();

// Schemas
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

const evidenceParamsSchema = z.object({
  params: z.object({
    id: z.coerce.number().int(),
  }),
  query: z.object({
    limit: z.coerce.number().int().min(1).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  }),
});

export const addEvidenceSchema = z.object({
  params: z.object({
    id: z.coerce.number().int(),
  }),
  body: z.object({
    title: z.string().min(1),
    type: z.string().optional(),
    evidence_type: z.string().optional(),
    description: z.string().optional(),
    url: z.string().url().optional().or(z.literal('')),
    relevance: z.string().optional(),
    notes: z.string().optional(),
    source_path: z.string().optional(),
    entity_id: z.union([z.string(), z.number()]).optional(),
    document_id: z.union([z.string(), z.number()]).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
});

const evidenceAnnotationParamsSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().min(1),
    evidenceId: z.coerce.number().int().min(1),
  }),
});

const evidenceAnnotationCreateSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().min(1),
    evidenceId: z.coerce.number().int().min(1),
  }),
  body: z.object({
    type: z.enum(['highlight', 'note', 'tag', 'classification']),
    content: z.string().min(1).max(5000),
    color: z.string().max(32).optional(),
    startOffset: z.number().int().min(0).optional(),
    endOffset: z.number().int().min(1).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
});

const evidenceAnnotationUpdateSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().min(1),
    evidenceId: z.coerce.number().int().min(1),
    annotationId: z.coerce.number().int().min(1),
  }),
  body: z
    .object({
      content: z.string().min(1).max(5000).optional(),
      color: z.string().max(32).nullable().optional(),
      startOffset: z.number().int().min(0).nullable().optional(),
      endOffset: z.number().int().min(1).nullable().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    })
    .refine(
      (body) =>
        Object.prototype.hasOwnProperty.call(body, 'content') ||
        Object.prototype.hasOwnProperty.call(body, 'color') ||
        Object.prototype.hasOwnProperty.call(body, 'startOffset') ||
        Object.prototype.hasOwnProperty.call(body, 'endOffset') ||
        Object.prototype.hasOwnProperty.call(body, 'metadata'),
      { message: 'At least one field is required' },
    ),
});

const evidenceAnnotationDeleteSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().min(1),
    evidenceId: z.coerce.number().int().min(1),
    annotationId: z.coerce.number().int().min(1),
  }),
});

const createHypothesisSchema = z.object({
  params: z.object({
    id: z.coerce.number().int(),
  }),
  body: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
  }),
});

const updateHypothesisSchema = z.object({
  params: z.object({
    id: z.coerce.number().int(),
    hypId: z.coerce.number().int(),
  }),
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
  }),
});

const hypothesisEvidenceSchema = z.object({
  params: z.object({
    id: z.coerce.number().int(),
    hypId: z.coerce.number().int(),
  }),
  body: z.object({
    evidenceId: z.coerce.number().int(),
    relevance: z.string().optional(),
  }),
});

const removeHypothesisEvidenceSchema = z.object({
  params: z.object({
    id: z.coerce.number().int(),
    hypId: z.coerce.number().int(),
    evidenceId: z.coerce.number().int(),
  }),
});

// --- Evidence ---

router.get('/:id/evidence', validate(evidenceParamsSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit, offset } = req.query;
    const evidence = await investigationsRepository.getEvidence(Number(id), {
      limit: limit !== undefined ? Number(limit) : undefined,
      offset: offset !== undefined ? Number(offset) : undefined,
    });
    res.json(mapInvestigationEvidenceListResponseDto(evidence));
  } catch (error) {
    next(error);
  }
});

router.post(
  '/:id/evidence',
  authenticateRequest,
  requireRole('investigator'),
  validate(addEvidenceSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const evidenceId = await investigationsRepository.addEvidence(Number(id), req.body);
      res.status(201).json({ id: evidenceId, ...req.body });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/:id/evidence/:evidenceId/annotations',
  validate(evidenceAnnotationParamsSchema),
  async (req, res, next) => {
    try {
      const { id, evidenceId } = req.params;
      const annotations = await investigationsRepository.getEvidenceAnnotations(
        Number(id),
        Number(evidenceId),
      );
      res.json({ annotations });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/:id/evidence/:evidenceId/annotations',
  authenticateRequest,
  requireRole('investigator'),
  validate(evidenceAnnotationCreateSchema),
  async (req, res, next) => {
    try {
      const { id, evidenceId } = req.params;
      const { type, content, color, startOffset, endOffset, metadata } = req.body;
      if (
        (typeof startOffset === 'number' && typeof endOffset !== 'number') ||
        (typeof startOffset !== 'number' && typeof endOffset === 'number')
      ) {
        return res
          .status(400)
          .json({ error: 'Both startOffset and endOffset are required together' });
      }
      if (
        typeof startOffset === 'number' &&
        typeof endOffset === 'number' &&
        endOffset <= startOffset
      ) {
        return res.status(400).json({ error: 'Invalid highlight range' });
      }
      const created = await investigationsRepository.addEvidenceAnnotation(
        Number(id),
        Number(evidenceId),
        {
          type,
          content,
          color,
          startOffset,
          endOffset,
          metadata,
          createdBy:
            (req as AuthRequest).user?.username || (req as AuthRequest).user?.id || 'system',
        },
      );
      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  '/:id/evidence/:evidenceId/annotations/:annotationId',
  authenticateRequest,
  requireRole('investigator'),
  validate(evidenceAnnotationUpdateSchema),
  async (req, res, next) => {
    try {
      const { id, evidenceId, annotationId } = req.params;
      const { startOffset, endOffset } = req.body || {};
      if (
        (typeof startOffset === 'number' && typeof endOffset !== 'number') ||
        (typeof startOffset !== 'number' && typeof endOffset === 'number')
      ) {
        return res
          .status(400)
          .json({ error: 'Both startOffset and endOffset are required together' });
      }
      if (
        typeof startOffset === 'number' &&
        typeof endOffset === 'number' &&
        endOffset <= startOffset
      ) {
        return res.status(400).json({ error: 'Invalid highlight range' });
      }

      const updated = await investigationsRepository.updateEvidenceAnnotation(
        Number(id),
        Number(evidenceId),
        Number(annotationId),
        req.body,
      );
      if (!updated) {
        return res.status(404).json({ error: 'Annotation not found' });
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  '/:id/evidence/:evidenceId/annotations/:annotationId',
  authenticateRequest,
  requireRole('investigator'),
  validate(evidenceAnnotationDeleteSchema),
  async (req, res, next) => {
    try {
      const { id, evidenceId, annotationId } = req.params;
      const removed = await investigationsRepository.deleteEvidenceAnnotation(
        Number(id),
        Number(evidenceId),
        Number(annotationId),
      );
      if (!removed) {
        return res.status(404).json({ error: 'Annotation not found' });
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

const getInvestigationEvidenceSummary = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const repoModule = await import('../db/evidenceRepository.js');
    const summary = await repoModule.evidenceRepository.getInvestigationEvidenceSummary(id);
    res.json(summary);
  } catch (error) {
    next(error);
  }
};

// Canonical case analytics route
router.get(
  '/:id/analytics/evidence-summary',
  validate(idParamSchema),
  getInvestigationEvidenceSummary,
);

// Legacy route alias (backward compatibility)
router.get('/:id/evidence-summary', validate(idParamSchema), getInvestigationEvidenceSummary);

// --- Hypotheses ---

router.get('/:id/hypotheses', validate(numericIdParamSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const hypotheses = await investigationsRepository.getHypotheses(Number(id));
    res.json(hypotheses);
  } catch (error) {
    next(error);
  }
});

router.post(
  '/:id/hypotheses',
  authenticateRequest,
  requireRole('investigator'),
  validate(createHypothesisSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { title, description } = req.body;
      const newId = await investigationsRepository.addHypothesis(Number(id), {
        title,
        description,
      });
      res.status(201).json({ id: newId, title, description, investigationId: id, status: 'draft' });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  '/:id/hypotheses/:hypId',
  authenticateRequest,
  requireRole('investigator'),
  validate(updateHypothesisSchema),
  async (req, res, next) => {
    try {
      const { hypId } = req.params;
      const updates = req.body;
      const success = await investigationsRepository.updateHypothesis(Number(hypId), updates);
      if (!success) return res.status(404).json({ error: 'Hypothesis not found' });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  '/:id/hypotheses/:hypId',
  authenticateRequest,
  requireRole('investigator'),
  validate(updateHypothesisSchema),
  async (req, res, next) => {
    try {
      const { hypId } = req.params;
      const success = await investigationsRepository.deleteHypothesis(Number(hypId));
      if (!success) return res.status(404).json({ error: 'Hypothesis not found' });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/:id/hypotheses/:hypId/evidence',
  authenticateRequest,
  requireRole('investigator'),
  validate(hypothesisEvidenceSchema),
  async (req, res, next) => {
    try {
      const { hypId } = req.params;
      const { evidenceId, relevance } = req.body;
      await investigationsRepository.addEvidenceToHypothesis(
        Number(hypId),
        Number(evidenceId),
        relevance,
      );
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  '/:id/hypotheses/:hypId/evidence/:evidenceId',
  authenticateRequest,
  requireRole('investigator'),
  validate(removeHypothesisEvidenceSchema),
  async (req, res, next) => {
    try {
      const { hypId, evidenceId } = req.params;
      await investigationsRepository.removeEvidenceFromHypothesis(
        Number(hypId),
        Number(evidenceId),
      );
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

// Evidence grouped by type (for Case Folder)
router.get('/:id/evidence-by-type', validate(numericIdParamSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const evidence = await investigationsRepository.getEvidenceByType(Number(id));
    res.json(mapInvestigationEvidenceByTypeResponseDto(evidence));
  } catch (error) {
    next(error);
  }
});

export default router;
