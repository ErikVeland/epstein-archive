import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authenticateRequest } from '../auth/middleware.js';
import { getApiPool } from '../db/connection.js';
import { logger } from '../services/Logger.js';

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapLead(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    investigationId: Number(row.investigation_id),
    title: row.title as string,
    description: (row.description as string) ?? null,
    status: row.status as string,
    priority: row.priority as string,
    sourceDocumentId: row.source_document_id ? Number(row.source_document_id) : null,
    sourceEftaRef: (row.source_efta_ref as string) ?? null,
    assignedTo: (row.assigned_to as string) ?? null,
    createdBy: (row.created_by as string) ?? null,
    resolvedAt: row.resolved_at ?? null,
    resolutionNotes: (row.resolution_notes as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET all leads for an investigation
router.get('/', async (req, res, next) => {
  try {
    const routeParams = req.params as { id: string };
    const investigationId = Number(routeParams.id);
    const { status } = req.query;
    const pool = getApiPool();

    let sql = `
      SELECT l.*, d.title AS document_title
      FROM investigation_leads l
      LEFT JOIN documents d ON l.source_document_id = d.id
      WHERE l.investigation_id = $1
    `;
    const queryParams: unknown[] = [investigationId];

    if (status && typeof status === 'string' && status !== 'all') {
      sql += ` AND l.status = $2`;
      queryParams.push(status);
    }

    sql += ` ORDER BY
      CASE l.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      l.created_at DESC`;

    const result = await pool.query(sql, queryParams);
    res.json(result.rows.map((r: Record<string, unknown>) => mapLead(r)));
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

    const pool = getApiPool();
    const result = await pool.query(
      `INSERT INTO investigation_leads
          (investigation_id, title, description, status, priority,
           source_document_id, source_efta_ref, assigned_to, created_by, resolution_notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
      [
        investigationId,
        title,
        description ?? null,
        status,
        priority,
        source_document_id ?? null,
        source_efta_ref ?? null,
        assigned_to ?? null,
        'system',
        resolution_notes ?? null,
      ],
    );

    logger.info({ investigationId, title }, 'Investigation lead created');
    res.status(201).json(mapLead(result.rows[0]));
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

      const setClauses: string[] = ['updated_at = CURRENT_TIMESTAMP'];
      const values: unknown[] = [];
      let idx = 1;

      const fieldMap: Record<string, string> = {
        title: 'title',
        description: 'description',
        status: 'status',
        priority: 'priority',
        source_document_id: 'source_document_id',
        source_efta_ref: 'source_efta_ref',
        assigned_to: 'assigned_to',
        resolution_notes: 'resolution_notes',
      };

      for (const [key, col] of Object.entries(fieldMap)) {
        if (Object.prototype.hasOwnProperty.call(body, key)) {
          setClauses.push(`${col} = $${idx++}`);
          values.push((body as Record<string, unknown>)[key] ?? null);
        }
      }

      // Auto-set resolved_at when status becomes 'resolved'
      if (body.status === 'resolved') {
        setClauses.push(`resolved_at = CURRENT_TIMESTAMP`);
      }

      values.push(Number(leadId), Number(investigationId));
      const query = `
        UPDATE investigation_leads
        SET ${setClauses.join(', ')}
        WHERE id = $${idx++} AND investigation_id = $${idx}
        RETURNING *
      `;

      const pool = getApiPool();
      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      res.json(mapLead(result.rows[0]));
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
      const pool = getApiPool();
      const result = await pool.query(
        `DELETE FROM investigation_leads WHERE id = $1 AND investigation_id = $2`,
        [Number(leadId), Number(investigationId)],
      );
      if ((result.rowCount ?? 0) === 0) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
