import { Router, Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../auth/middleware.js';
import { investigationsRepository } from '../db/investigationsRepository.js';
import { authenticateRequest } from '../auth/middleware.js';
import {
  mapInvestigationEvidenceListItemDto,
  mapInvestigationEvidenceByTypeResponseDto,
  mapInvestigationEvidenceListResponseDto,
} from '../mappers/investigationsDtoMapper.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';

const router = Router();
const DATA_ROOT = path.resolve(process.cwd(), 'data');
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

const timelineEventSchema = z.object({
  params: z.object({
    id: z.coerce.number().int(),
  }),
  body: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    event_date: z.string().optional(),
    event_type: z.string().optional(),
  }),
});

const updateTimelineEventSchema = z.object({
  params: z.object({
    id: z.coerce.number().int(),
    eventId: z.coerce.number().int(),
  }),
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    event_date: z.string().optional(),
    event_type: z.string().optional(),
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

const addEvidenceSchema = z.object({
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
    metadata: z.record(z.unknown()).optional(),
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
    metadata: z.record(z.any()).optional(),
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
      metadata: z.record(z.any()).optional(),
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

const activityQuerySchema = z.object({
  params: z.object({
    id: z.coerce.number().int(),
  }),
  query: z.object({
    limit: z.coerce.number().int().min(1).default(50),
  }),
});

const boardQuerySchema = z.object({
  params: z.object({
    id: z.coerce.number().int(),
  }),
  query: z.object({
    evidenceLimit: z.coerce.number().int().min(1).default(80),
    hypothesisLimit: z.coerce.number().int().min(1).default(20),
  }),
});

const notebookSchema = z.object({
  params: z.object({
    id: z.coerce.number().int(),
  }),
  body: z.object({
    order: z.array(z.string()).optional(),
    annotations: z.array(z.any()).optional(),
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
    res.setHeader('X-Limit-Applied', String(filters.limit));

    const result = await investigationsRepository.getInvestigations(filters);
    res.json(result);
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

    res.json(investigation);
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

// --- Timeline Events ---

router.get('/:id/timeline-events', validate(numericIdParamSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const events = await investigationsRepository.getTimelineEvents(Number(id));
    res.json(events);
  } catch (error) {
    next(error);
  }
});

router.post(
  '/:id/timeline-events',
  authenticateRequest,
  validate(timelineEventSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const eventId = await investigationsRepository.addTimelineEvent(Number(id), req.body);
      res.status(201).json({ id: eventId, ...req.body });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  '/:id/timeline-events/:eventId',
  authenticateRequest,
  validate(updateTimelineEventSchema),
  async (req, res, next) => {
    try {
      const { eventId } = req.params;
      const success = await investigationsRepository.updateTimelineEvent(Number(eventId), req.body);
      if (!success) return res.status(404).json({ error: 'Event not found' });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  '/:id/timeline-events/:eventId',
  authenticateRequest,
  validate(updateTimelineEventSchema),
  async (req, res, next) => {
    try {
      const { eventId } = req.params;
      const success = await investigationsRepository.deleteTimelineEvent(Number(eventId));
      if (!success) return res.status(404).json({ error: 'Event not found' });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

// --- Evidence ---

router.get('/:id/evidence', validate(evidenceParamsSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit, offset } = req.query;
    const evidence = await investigationsRepository.getEvidence(Number(id), {
      limit: limit !== undefined ? Number(limit) : undefined,
      offset: offset !== undefined ? Number(offset) : undefined,
    });
    if (Array.isArray(evidence)) {
      return res.json(evidence.map(mapInvestigationEvidenceListItemDto));
    }
    res.json(mapInvestigationEvidenceListResponseDto(evidence));
  } catch (error) {
    next(error);
  }
});

router.post(
  '/:id/evidence',
  authenticateRequest,
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

// Activity Feed
router.get('/:id/activity', validate(activityQuerySchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit } = req.query;
    const activity = await investigationsRepository.getActivity(Number(id), Number(limit));

    // Parse metadata JSON for each activity
    const parsed = activity.map(
      (a: { metadata_json?: string | null } & Record<string, unknown>) => {
        const metaJson = typeof a.metadata_json === 'string' ? a.metadata_json : null;
        return { ...a, metadata: metaJson ? JSON.parse(metaJson) : null };
      },
    );

    res.json(parsed);
  } catch (error) {
    next(error);
  }
});

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

router.get(
  '/:id/board',
  authenticateRequest,
  validate(boardQuerySchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { evidenceLimit, hypothesisLimit } = req.query;
      const snapshot = await investigationsRepository.getBoardSnapshot(Number(id), {
        evidenceLimit: evidenceLimit !== undefined ? Number(evidenceLimit) : undefined,
        hypothesisLimit: hypothesisLimit !== undefined ? Number(hypothesisLimit) : undefined,
      });
      res.json(snapshot);
    } catch (error) {
      next(error);
    }
  },
);

// Notebook persistence
router.get(
  '/:id/notebook',
  authenticateRequest,
  validate(numericIdParamSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const notebook = await investigationsRepository.getNotebook(Number(id));
      res.json(notebook);
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  '/:id/notebook',
  authenticateRequest,
  validate(notebookSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { order, annotations } = req.body || {};
      await investigationsRepository.saveNotebook(Number(id), { order, annotations });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

// Publish Briefing (Markdown)
router.get(
  '/:id/briefing',
  authenticateRequest,
  validate(numericIdParamSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const repoModule = await import('../db/evidenceRepository.js');
      const summary = await repoModule.evidenceRepository.getInvestigationEvidenceSummary(
        String(id),
      );
      const notebook = await investigationsRepository.getNotebook(Number(id));
      let md = `# Investigation Briefing\\n\\nTotal Evidence: ${summary.totalEvidence}\\n\\n`;
      const byType: Record<string, Record<string, unknown>[]> = {};
      for (const e of summary.evidence as Record<string, unknown>[]) {
        const t = String(e.evidence_type || 'unknown');
        byType[t] = byType[t] || [];
        byType[t].push(e);
      }
      for (const [type, list] of Object.entries(byType)) {
        md += `## ${type.toUpperCase()}\\n`;
        for (const e of list) {
          const title = String(e.title || 'Untitled');
          const desc = String(e.description || '');
          md += `- ${title}\\n`;
          if (desc) md += `  - ${desc}\\n`;
        }
        md += `\\n`;
      }

      const annotations = Array.isArray(notebook?.annotations)
        ? (notebook.annotations as Record<string, unknown>[])
        : [];
      const caseNotes =
        (
          annotations.find((a) => (a as Record<string, unknown>)?.id === 'case-notes') as
            | Record<string, unknown>
            | undefined
        )?.content || '';
      const evidenceAnnotations = annotations.filter(
        (a) => (a as Record<string, unknown>)?.source === 'evidence',
      );

      md += `## Notebook\\n\\n`;
      if (typeof caseNotes === 'string' && caseNotes.trim().length > 0) {
        md += `${caseNotes.trim()}\\n\\n`;
      } else {
        md += `_No case notes yet._\\n\\n`;
      }

      md += `### Evidence annotations\\n\\n`;
      if (evidenceAnnotations.length === 0) {
        md += `_No synced evidence annotations yet._\\n`;
      } else {
        const groupedByEvidenceId = evidenceAnnotations.reduce(
          (acc: Record<string, Record<string, unknown>[]>, ann: Record<string, unknown>) => {
            const evidenceId = String(ann?.evidenceId || 'unknown');
            if (!acc[evidenceId]) acc[evidenceId] = [];
            acc[evidenceId].push(ann);
            return acc;
          },
          {},
        );

        const sortedEvidenceIds = Object.keys(groupedByEvidenceId).sort((a, b) => {
          if (a === 'unknown') return 1;
          if (b === 'unknown') return -1;
          return Number(a) - Number(b);
        });

        for (const evidenceId of sortedEvidenceIds) {
          md += `- Evidence #${evidenceId}\\n`;
          for (const ann of groupedByEvidenceId[evidenceId]) {
            const typeLabel = String(
              (ann as Record<string, unknown>)?.type || 'note',
            ).toUpperCase();
            const content = String((ann as Record<string, unknown>)?.content || '').trim();
            if (content) {
              md += `  - [${typeLabel}] ${content}\\n`;
            } else {
              md += `  - [${typeLabel}]\\n`;
            }
          }
        }
      }
      res.header('Content-Type', 'text/markdown').send(md);
    } catch (error) {
      next(error);
    }
  },
);

// Export Case Bundle as ZIP
router.get(
  '/:id/export/zip',
  authenticateRequest,
  validate(numericIdParamSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const numericId = Number(id);
      const investigation = await investigationsRepository.getInvestigationById(numericId);

      if (!investigation) {
        return res.status(404).json({ error: 'Investigation not found' });
      }

      const ZIP_FILE_LIMIT = 100;
      const ZIP_SIZE_LIMIT_BYTES = 500 * 1024 * 1024; // 500 MB

      const evidence = await investigationsRepository.getEvidence(numericId, {
        limit: ZIP_FILE_LIMIT,
      });
      const archive = archiver('zip', { zlib: { level: 6 } });

      // Wire up error handler before piping so we can still send a 500 if headers not yet sent
      let headersSent = false;
      archive.on('error', (err) => {
        if (!headersSent) {
          next(err);
        } else {
          // Headers already sent — destroy the socket to signal a broken download
          res.destroy(err);
        }
      });

      res.attachment(`investigation-bundle-${numericId}.zip`);
      headersSent = true;
      archive.pipe(res);

      // Add investigation metadata
      archive.append(JSON.stringify(investigation, null, 2), { name: 'investigation.json' });

      // Add evidence metadata and files
      const evidenceList = Array.isArray(evidence)
        ? evidence
        : (evidence as { data?: unknown[] }).data || [];
      archive.append(JSON.stringify(evidenceList, null, 2), { name: 'evidence.json' });

      let totalBytes = 0;
      for (const item of evidenceList) {
        if (item.file_path) {
          // Strip null bytes before resolving to prevent null-byte injection
          const cleanedPath = String(item.file_path).replace(/\0/g, '');
          const absolutePath = path.resolve(cleanedPath);
          const isInDataRoot =
            absolutePath.startsWith(DATA_ROOT + path.sep) ||
            absolutePath.startsWith(DATA_ROOT + '/');
          if (!isInDataRoot) continue;

          let stat: import('fs').Stats;
          try {
            stat = await fs.promises.stat(absolutePath);
          } catch {
            continue; // file missing or unreadable — skip without blocking event loop
          }

          if (totalBytes + stat.size > ZIP_SIZE_LIMIT_BYTES) break;
          totalBytes += stat.size;
          const fileName = path.basename(absolutePath);
          archive.file(absolutePath, { name: `files/${fileName}` });
        }
      }

      await archive.finalize();
    } catch (error) {
      next(error);
    }
  },
);

export default router;
