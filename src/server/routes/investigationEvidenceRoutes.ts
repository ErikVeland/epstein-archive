import { Router } from 'express';
import { z } from 'zod';
import { authenticateRequest } from '../auth/middleware.js';
import { evidenceRepository } from '../db/evidenceRepository.js';
import { logger } from '../services/Logger.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const entityIdParamSchema = z.object({
  params: z.object({
    entityId: z.string().min(1),
  }),
});

const addEvidenceSchema = z.object({
  body: z.object({
    investigationId: z.union([z.string(), z.number()]).transform((v) => String(v)),
    evidenceId: z.union([z.string(), z.number()]).transform((v) => String(v)),
    notes: z.string().max(8000).optional().nullable(),
    relevance: z.string().max(128).optional().nullable(),
  }),
});

const addMediaSchema = z.object({
  body: z.object({
    investigationId: z.union([z.string(), z.number()]).transform((v) => String(v)),
    mediaItemId: z.union([z.string(), z.number()]).transform((v) => String(v)),
    notes: z.string().max(8000).optional().nullable(),
    relevance: z.string().max(128).optional().nullable(),
  }),
});

const addSnippetSchema = z.object({
  body: z.object({
    investigationId: z.union([z.string(), z.number()]).transform((v) => String(v)),
    documentId: z.union([z.string(), z.number()]).transform((v) => String(v)),
    snippetText: z.string().min(1).max(20000),
    notes: z.string().max(8000).optional().nullable(),
    relevance: z.string().max(128).optional().nullable(),
  }),
});

/**
 * GET /api/investigation/evidence/:entityId
 * Get evidence summary for a specific entity
 */
router.get('/evidence/:entityId', validate(entityIdParamSchema), async (req, res) => {
  try {
    const { entityId } = req.params as { entityId: string };
    const result = await evidenceRepository.getEntityEvidence(entityId);

    if (!result) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching entity evidence');
    res.status(500).json({ error: 'Failed to fetch entity evidence' });
  }
});

/**
 * POST /api/investigation/add-evidence
 * Add evidence to an investigation session
 */
router.post('/add-evidence', authenticateRequest, validate(addEvidenceSchema), async (req, res) => {
  try {
    const { investigationId, evidenceId, notes, relevance } = req.body;
    const result = await evidenceRepository.addEvidenceToInvestigation(
      investigationId,
      evidenceId,
      notes,
      relevance,
    );
    res.json({ success: true, ...result });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Evidence not found') {
      return res.status(404).json({ error: 'Evidence not found' });
    }
    logger.error({ err: error }, 'Error adding evidence to investigation');
    res.status(500).json({ error: 'Failed to add evidence to investigation' });
  }
});

router.post('/add-media', authenticateRequest, validate(addMediaSchema), async (req, res) => {
  try {
    const { investigationId, mediaItemId, notes, relevance } = req.body;
    const result = await evidenceRepository.addMediaToInvestigation(
      investigationId,
      mediaItemId,
      notes,
      relevance,
    );
    res.json({ success: true, ...result });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Media not found') {
      return res.status(404).json({ error: 'Media not found' });
    }
    logger.error({ err: error }, 'Error adding media to investigation');
    res.status(500).json({ error: 'Failed to add media to investigation' });
  }
});

/**
 * POST /api/investigation/add-snippet
 * Add a text snippet from a document to an investigation
 */
router.post('/add-snippet', authenticateRequest, validate(addSnippetSchema), async (req, res) => {
  try {
    const { investigationId, documentId, snippetText, notes, relevance } = req.body;
    const result = await evidenceRepository.addSnippetToInvestigation(
      investigationId,
      documentId,
      snippetText,
      notes,
      relevance,
    );
    res.json({ success: true, ...result });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Document not found') {
      return res.status(404).json({ error: 'Document not found' });
    }
    logger.error({ err: error }, 'Error adding snippet to investigation');
    res.status(500).json({ error: 'Failed to add snippet to investigation' });
  }
});
/**
 * DELETE /api/investigation/remove-evidence/:investigationEvidenceId
 * Remove evidence from an investigation
 */
router.delete(
  '/remove-evidence/:investigationEvidenceId',
  authenticateRequest,
  async (req, res) => {
    try {
      const { investigationEvidenceId } = req.params as { investigationEvidenceId: string };

      const success =
        await evidenceRepository.removeEvidenceFromInvestigation(investigationEvidenceId);

      res.json({ success });
    } catch (error) {
      logger.error({ err: error }, 'Error removing evidence from investigation');
      res.status(500).json({ error: 'Failed to remove evidence from investigation' });
    }
  },
);

export default router;
