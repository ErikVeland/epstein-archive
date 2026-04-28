import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authenticateRequest } from '../auth/middleware.js';
import { investigationsRepository } from '../db/investigationsRepository.js';
import { logger } from '../services/Logger.js';
import { InvestigativeLeadRow } from '../db/rowTypes.js';

import { mapInvestigativeLeadDto } from '../mappers/investigationsDtoMapper.js';

const router = Router({ mergeParams: true }); // mergeParams to access :id from parent

// ─── Schemas ────────────────────────────────────────────────────────────────

const leadStatusValues = ['open', 'pursued', 'dead_end', 'resolved'] as const;
const leadPriorityValues = ['low', 'medium', 'high', 'critical'] as const;

const createLeadSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    title: z.string().min(1).max(500),
    description: z.string().max(5000).optional(),
    status: z.enum(leadStatusValues).default('open'),
    priority: z.enum(leadPriorityValues).default('medium'),
    source_document_id: z.coerce.number().int().positive().optional().nullable(),
    source_efta_ref: z.string().max(20).optional().nullable(),
    assigned_to: z.string().max(255).optional().nullable(),
    resolution_notes: z.string().max(5000).optional().nullable(),
  }),
});

const updateLeadSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
    leadId: z.coerce.number().int().positive(),
  }),
  body: z
    .object({
      title: z.string().min(1).max(500).optional(),
      description: z.string().max(5000).optional().nullable(),
      status: z.enum(leadStatusValues).optional(),
      priority: z.enum(leadPriorityValues).optional(),
      source_document_id: z.coerce.number().int().positive().optional().nullable(),
      source_efta_ref: z.string().max(20).optional().nullable(),
      assigned_to: z.string().max(255).optional().nullable(),
      resolution_notes: z.string().max(5000).optional().nullable(),
    })
    .refine((b) => Object.keys(b).length > 0, { message: 'At least one field is required' }),
});

const deleteLeadSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
    leadId: z.coerce.number().int().positive(),
  }),
});

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET all leads for an investigation
router.get('/', async (req, res, next) => {
  try {
    const routeParams = req.params as { id: string };
    const investigationId = Number(routeParams.id);
    const { status } = req.query;

    const rows = await investigationsRepository.getLeads(investigationId, {
      status: typeof status === 'string' ? status : undefined,
    });
    res.json(rows.map((r: InvestigativeLeadRow) => mapInvestigativeLeadDto(r)));
  } catch (err) {
    next(err);
  }
});

// POST create a lead
router.post('/', authenticateRequest, validate(createLeadSchema), async (req, res, next) => {
  try {
    const investigationId = Number(req.params.id);
    const {
      title,
      description,
      status = 'open',
      priority = 'medium',
      source_document_id,
      source_efta_ref,
      assigned_to,
      resolution_notes,
    } = req.body as z.infer<typeof createLeadSchema>['body'];

    const result = await investigationsRepository.createLead(investigationId, {
      title,
      description,
      status,
      priority,
      source_document_id,
      source_efta_ref,
      assigned_to,
      created_by: 'system',
      resolution_notes,
    });

    logger.info({ investigationId, title }, 'Investigation lead created');
    res.status(201).json(mapInvestigativeLeadDto(result));
  } catch (err) {
    next(err);
  }
});

// PATCH update a lead
router.patch(
  '/:leadId',
  authenticateRequest,
  validate(updateLeadSchema),
  async (req, res, next) => {
    try {
      const { id: investigationId, leadId } = req.params;
      const body = req.body as z.infer<typeof updateLeadSchema>['body'];

      const result = await investigationsRepository.updateLead(
        Number(leadId),
        Number(investigationId),
        {
          title: body.title,
          description: body.description,
          status: body.status,
          priority: body.priority,
          source_document_id: body.source_document_id,
          source_efta_ref: body.source_efta_ref,
          assigned_to: body.assigned_to,
          resolution_notes: body.resolution_notes,
        },
      );

      if (!result) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      res.json(mapInvestigativeLeadDto(result));
    } catch (err) {
      next(err);
    }
  },
);

// DELETE a lead
router.delete(
  '/:leadId',
  authenticateRequest,
  validate(deleteLeadSchema),
  async (req, res, next) => {
    try {
      const { id: investigationId, leadId } = req.params;
      const deleted = await investigationsRepository.deleteLead(
        Number(leadId),
        Number(investigationId),
      );
      if (!deleted) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
