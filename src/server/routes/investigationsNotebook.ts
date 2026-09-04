import { Router } from 'express';
import { authenticateRequest, requireRole } from '../auth/middleware.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';
import { investigationsRepository } from '../db/investigationsRepository.js';

const router = Router();

// Schemas
const numericIdParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int(),
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
    order: z.array(z.coerce.number().int()).optional(),
    annotations: z.array(z.unknown()).optional(),
  }),
});

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
  requireRole('investigator'),
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

export default router;
