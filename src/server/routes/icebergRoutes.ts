import { Router } from 'express';
import { z } from 'zod';
import { authenticateRequest, type AuthRequest } from '../auth/middleware.js';
import { validate } from '../middleware/validate.js';
import { icebergRepository } from '../db/icebergRepository.js';
import { rejectOffset } from '../utils/paginationGuards.js';

const router = Router({ mergeParams: true });

const icebergLeadListSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(30),
    offset: z.coerce.number().int().min(0).default(0),
    motifType: z.string().optional(),
    harmType: z.string().optional(),
    reviewState: z.string().optional(),
    status: z.string().optional(),
    minConfidence: z.coerce.number().min(0).max(1).optional(),
    sourceType: z.string().optional(),
  }),
});

const icebergLeadDetailSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
    leadId: z.string().min(1),
  }),
});

const saveLeadSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
    leadId: z.string().min(1),
  }),
  body: z.object({
    itemType: z.enum(['lead', 'path', 'edge', 'document_context']).default('lead'),
    title: z.string().min(1).max(500).optional(),
    payload: z.unknown().optional(),
  }),
});

router.get('/leads', validate(icebergLeadListSchema), async (req, res, next) => {
  try {
    const params = req.params as unknown as { id: number };
    const query = req.query as unknown as z.infer<typeof icebergLeadListSchema>['query'];
    if (rejectOffset(res, 'Iceberg lead', query.offset)) return;
    const leads = await icebergRepository.getLeads(params.id, {
      limit: query.limit,
      offset: query.offset,
      motifType: query.motifType,
      harmType: query.harmType,
      reviewState: query.reviewState,
      status: query.status,
      minConfidence: query.minConfidence,
      sourceType: query.sourceType,
    });

    return res.json({
      data: leads,
      total: leads.length,
      limit: query.limit,
      offset: query.offset,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/leads/:leadId', validate(icebergLeadDetailSchema), async (req, res, next) => {
  try {
    const { id, leadId } = req.params as unknown as { id: number; leadId: string };
    const lead = await icebergRepository.getLead(Number(id), leadId);
    if (!lead) return res.status(404).json({ error: 'Iceberg lead not found' });
    return res.json(lead);
  } catch (error) {
    next(error);
  }
});

router.post(
  '/leads/:leadId/save',
  authenticateRequest,
  validate(saveLeadSchema),
  async (req, res, next) => {
    try {
      const { id, leadId } = req.params as unknown as { id: number; leadId: string };
      const body = req.body as z.infer<typeof saveLeadSchema>['body'];
      const lead = await icebergRepository.getLead(Number(id), leadId);
      const item = await icebergRepository.saveEvidenceChainItem({
        investigationId: Number(id),
        leadId,
        itemType: body.itemType,
        title: body.title || lead?.title || 'Saved iceberg finding',
        payload: body.payload || lead || { leadId },
        createdBy: (req as AuthRequest).user?.id || 'system',
      });
      return res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
