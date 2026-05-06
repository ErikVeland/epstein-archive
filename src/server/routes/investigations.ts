import { Router, Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../auth/middleware.js';
import { investigationsRepository } from '../db/investigationsRepository.js';
import { authenticateRequest } from '../auth/middleware.js';
import {
  mapInvestigationEvidenceByTypeResponseDto,
  mapInvestigationEvidenceListResponseDto,
  mapInvestigationListItemDto,
} from '../mappers/investigationsDtoMapper.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { InvestigationIngestorService } from '../services/InvestigationIngestorService.js';
import { buildManifest, buildEvidenceCsv, buildBundleReadme } from '../utils/exportManifest.js';
import { buildExportFileInventory } from '../utils/investigationExportInventory.js';
import { InvestigationRow, InvestigationEvidenceRow } from '../db/rowTypes.js';

const router = Router();
const DATA_ROOT = path.resolve(process.cwd(), 'data');
const SCHEMA_HASH = process.env.SCHEMA_HASH || process.env.PG_SCHEMA_HASH || 'unknown';
const ZIP_FILE_LIMIT = 100;
const ZIP_SIZE_LIMIT_BYTES = 500 * 1024 * 1024; // 500 MB

// Read app version once at startup from package.json
const APP_VERSION: string = (() => {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'),
    ) as { version?: string };
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
})();

const HARD_CAP_INVESTIGATIONS_LIMIT = Math.max(
  1,
  Number(process.env.HARD_CAP_INVESTIGATIONS_LIMIT || 100),
);

async function buildExportPreview(investigation: InvestigationRow, investigationId: number) {
  const evidence = await investigationsRepository.getEvidence(investigationId, {
    limit: ZIP_FILE_LIMIT,
  });
  const evidenceList = Array.isArray(evidence)
    ? evidence
    : (evidence as { data?: unknown[] }).data || [];

  const { includedFiles, skippedFiles } = await buildExportFileInventory({
    evidenceList: evidenceList as Record<string, unknown>[],
    dataRoot: DATA_ROOT,
    fileCountCap: ZIP_FILE_LIMIT,
    sizeLimitBytes: ZIP_SIZE_LIMIT_BYTES,
  });

  let timelineEvents: unknown[] = [];
  try {
    timelineEvents = await investigationsRepository.getTimelineEvents(investigationId);
  } catch {
    timelineEvents = [];
  }

  let allAnnotations: unknown[] = [];
  try {
    allAnnotations = await investigationsRepository.getAllEvidenceAnnotations(investigationId);
  } catch {
    allAnnotations = [];
  }

  const evidenceIds = Array.from(
    new Set(
      (evidenceList as unknown as InvestigationEvidenceRow[])
        .map((e) => Number(e.id ?? e.investigation_evidence_id ?? 0))
        .filter((n) => n > 0),
    ),
  ).sort((a, b) => a - b);

  const warnings = [
    ...skippedFiles.map((file) => ({
      code: file.reason,
      message: `Evidence #${file.evidenceId} source file will be skipped: ${file.reason.replace(/_/g, ' ')}`,
      action: 'Review the evidence source path before exporting if this file is required.',
    })),
    ...(evidenceIds.length === 0
      ? [
          {
            code: 'no_evidence',
            message: 'This packet has no evidence items.',
            action: 'Add evidence before exporting a review-grade packet.',
          },
        ]
      : []),
  ];

  const readiness =
    evidenceIds.length === 0 ? 'blocked' : warnings.length > 0 ? 'warning' : 'ready';

  // Build preview-friendly response
  const included = includedFiles
    .filter((f): f is typeof f & { zipPath: string } => !!f.zipPath)
    .map((f) => ({
      name: f.zipPath,
      type: f.zipPath.endsWith('.pdf')
        ? 'document'
        : f.zipPath.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)
          ? 'image'
          : f.zipPath.match(/\.(mp4|avi|mov|mkv|webm)$/i)
            ? 'video'
            : f.zipPath.match(/\.(mp3|wav|ogg|m4a)$/i)
              ? 'audio'
              : 'file',
      size: f.sizeBytes,
    }));

  const omitted = warnings.map((w) => ({
    name: w.message,
    reason: w.code,
  }));

  const manifest = buildManifest({
    investigationId,
    title: investigation.title,
    status: investigation.status,
    appVersion: APP_VERSION,
    schemaHash: SCHEMA_HASH,
    exportLimits: {
      fileCountCap: ZIP_FILE_LIMIT,
      sizeLimitBytes: ZIP_SIZE_LIMIT_BYTES,
    },
    evidenceIds,
    includedFiles,
    skippedFiles,
  });

  return {
    readiness: readiness === 'ready',
    included,
    omitted,
    skippedFiles: skippedFiles.map((f) => f.reason),
    warnings: warnings.map((w) => w.message),
    summary: {
      evidenceCount: evidenceIds.length,
      includedFileCount: includedFiles.length,
      skippedFileCount: skippedFiles.length,
      timelineEventCount: timelineEvents.length,
      annotationCount: allAnnotations.length,
    },
    manifest,
  };
}

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
    metadata: z.record(z.unknown()).optional(),
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
      metadata: z.record(z.unknown()).optional(),
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
    annotations: z.array(z.unknown()).optional(),
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
    const parsed = activity.map((a) => {
      const metaJson = typeof a.metadata_json === 'string' ? a.metadata_json : null;
      let metadata = null;
      if (metaJson) {
        try {
          metadata = JSON.parse(metaJson);
        } catch {
          metadata = null;
        }
      }
      return { ...a, metadata };
    });

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

router.get(
  '/:id/export/preview',
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

      res.json(await buildExportPreview(investigation as InvestigationRow, numericId));
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

      const evidence = await investigationsRepository.getEvidence(numericId, {
        limit: ZIP_FILE_LIMIT,
      });

      const evidenceList = Array.isArray(evidence)
        ? evidence
        : (evidence as { data?: unknown[] }).data || [];

      // --- Build file inventory (included + skipped) before opening the archive ---
      type EvidenceRow = Record<string, unknown>;
      const { includedFiles, skippedFiles, filesToAdd } = await buildExportFileInventory({
        evidenceList: evidenceList as EvidenceRow[],
        dataRoot: DATA_ROOT,
        fileCountCap: ZIP_FILE_LIMIT,
        sizeLimitBytes: ZIP_SIZE_LIMIT_BYTES,
      });

      // --- Fetch timeline events and all evidence annotations ---
      let timelineEvents: unknown[] = [];
      try {
        timelineEvents = await investigationsRepository.getTimelineEvents(numericId);
      } catch {
        timelineEvents = [];
      }

      let allAnnotations: unknown[] = [];
      try {
        allAnnotations = await investigationsRepository.getAllEvidenceAnnotations(numericId);
      } catch {
        allAnnotations = [];
      }

      // --- Build manifest (includes checksum over sorted inventory) ---
      const evidenceIds = Array.from(
        new Set(
          (evidenceList as unknown as InvestigationEvidenceRow[])
            .map((e) => Number(e.id ?? e.investigation_evidence_id ?? 0))
            .filter((n) => n > 0),
        ),
      ).sort((a, b) => a - b);

      const manifest = buildManifest({
        investigationId: numericId,
        title: investigation.title,
        status: investigation.status,
        appVersion: APP_VERSION,
        schemaHash: SCHEMA_HASH,
        exportLimits: {
          fileCountCap: ZIP_FILE_LIMIT,
          sizeLimitBytes: ZIP_SIZE_LIMIT_BYTES,
        },
        evidenceIds,
        includedFiles,
        skippedFiles,
      });

      // --- Build evidence CSV ---
      const evidenceCsv = buildEvidenceCsv(evidenceList as unknown as InvestigationEvidenceRow[]);

      // --- Stream archive ---
      const archive = archiver('zip', { zlib: { level: 6 } });

      let headersSent = false;
      archive.on('error', (err) => {
        if (!headersSent) {
          next(err);
        } else {
          // Headers already sent — destroy socket to signal broken download
          res.destroy(err);
        }
      });

      res.setHeader('x-export-file-limit', String(ZIP_FILE_LIMIT));
      res.setHeader('x-export-size-limit', String(ZIP_SIZE_LIMIT_BYTES));
      res.setHeader('x-export-skipped-files', String(skippedFiles.length));

      res.attachment(`investigation-bundle-${numericId}.zip`);
      headersSent = true;
      archive.pipe(res);

      archive.append(
        buildBundleReadme({
          appVersion: APP_VERSION,
          schemaHash: SCHEMA_HASH,
          generatedAt: manifest.generatedAt,
        }),
        { name: 'README.md' },
      );
      archive.append(JSON.stringify(investigation, null, 2), { name: 'investigation.json' });
      archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
      archive.append(JSON.stringify(evidenceList, null, 2), { name: 'evidence.json' });
      archive.append(evidenceCsv, { name: 'evidence.csv' });
      archive.append(JSON.stringify(timelineEvents, null, 2), { name: 'timeline.json' });
      if (allAnnotations.length > 0) {
        archive.append(JSON.stringify(allAnnotations, null, 2), { name: 'annotations.json' });
      }

      for (const { absolutePath, zipPath } of filesToAdd) {
        archive.file(absolutePath, { name: zipPath });
      }

      await archive.finalize();
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/investigations/import-report
 * Parses a Markdown investigation report and syncs it into the database.
 * Requires auth (admin or owner).
 */
router.post(
  '/import-report',
  authenticateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const body = req.body as { markdown?: string; ownerId?: string };
      if (!body.markdown || typeof body.markdown !== 'string') {
        return res.status(400).json({ error: 'Missing required field: markdown (string)' });
      }
      if (body.markdown.length > 500_000) {
        return res.status(413).json({ error: 'Report too large (max 500 KB)' });
      }

      const ownerId = body.ownerId || authReq.user?.id || 'user-1';
      const result = await InvestigationIngestorService.ingestFromMarkdown(body.markdown, ownerId);
      return res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
