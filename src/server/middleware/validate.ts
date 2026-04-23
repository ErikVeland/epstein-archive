import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, z } from 'zod';

interface ParsedQuery {
  [key: string]: string | string[] | ParsedQuery | ParsedQuery[] | undefined;
}

export const validate = (schema: AnyZodObject, target?: 'body' | 'query' | 'params') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (target) {
        req[target] = await schema.parseAsync(req[target]);
      } else {
        const parsed = (await schema.parseAsync({
          body: req.body,
          query: req.query,
          params: req.params,
        })) as {
          body?: Record<string, unknown>;
          query?: ParsedQuery;
          params?: Record<string, string>;
        };
        if (parsed.body) req.body = parsed.body;
        if (parsed.query) req.query = parsed.query;
        if (parsed.params) req.params = parsed.params;
      }
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }
      return next(error);
    }
  };
};

// Common Schemas
export const entitySchema = z.object({
  full_name: z.string().min(3).max(100),
  primary_role: z.string().min(2).max(100).optional(),
  entity_type: z.enum(['Person', 'Organization', 'Location', 'Event']).optional(),
  red_flag_rating: z.number().int().min(0).max(5).optional(),
  bio: z.string().max(2000).optional(),
});

export const searchSchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.preprocess((val) => Number(val), z.number().int().min(1).max(100)).optional(),
});

const ENTITY_SORT_BY_VALUES = [
  'red_flag',
  'rfi',
  'default',
  'risk',
  'mentions',
  'document_count',
  'document-count',
  'recent',
  'name',
] as const;

export const entitiesQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(24),
    search: z.string().max(100).optional(),
    role: z.string().optional(),
    likelihood: z.union([z.string(), z.array(z.string())]).optional(),
    type: z.string().optional(),
    sortBy: z.enum(ENTITY_SORT_BY_VALUES).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    includeJunk: z.preprocess((v) => v === 'true', z.boolean()).optional(),
  }),
});

export const subjectsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(24),
    search: z.string().optional(),
    role: z.string().optional(),
    entityType: z.string().optional(),
    likelihoodScore: z.union([z.string(), z.array(z.string())]).optional(),
    sortBy: z.enum(ENTITY_SORT_BY_VALUES).optional(),
    sortOrder: z.enum(['asc', 'desc', 'ASC', 'DESC']).optional(),
  }),
});

export const entityIdParamSchema = z.object({
  params: z.object({
    id: z.union([z.coerce.number().int().min(1), z.literal('all')]),
  }),
});

export const numericIdParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().min(1),
  }),
});

// ── Shared reusable schemas ───────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

export const dateRangeSchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional(),
});

export const flightsQuerySchema = z.object({
  query: paginationSchema.extend({
    startDate: dateRangeSchema.shape.startDate,
    endDate: dateRangeSchema.shape.endDate,
    passenger: z.string().max(100).optional(),
    airport: z.string().max(10).optional(),
    tailNumber: z.string().max(20).optional(),
  }),
});

export const timelineQuerySchema = z.object({
  query: paginationSchema.partial().extend({
    startDate: dateRangeSchema.shape.startDate,
    endDate: dateRangeSchema.shape.endDate,
    type: z.string().max(50).optional(),
    significance: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
    entityId: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(500).optional(),
  }),
});

export const blackBookQuerySchema = z.object({
  query: z.object({
    letter: z
      .string()
      .regex(/^[A-Z]$|^ALL$/)
      .optional(),
    search: z.string().max(100).optional(),
    category: z.enum(['original', 'contact', 'credential']).optional(),
    hasPhone: z
      .string()
      .optional()
      .transform((v) => v === 'true'),
    hasEmail: z
      .string()
      .optional()
      .transform((v) => v === 'true'),
    hasAddress: z
      .string()
      .optional()
      .transform((v) => v === 'true'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(10000).default(1000),
  }),
});

export const blackBookReviewSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().min(1),
  }),
  body: z.object({
    correctedName: z.string().max(200).optional().default(''),
    action: z.enum(['approve', 'skip', 'delete']),
  }),
});

export const propertiesQuerySchema = z.object({
  query: paginationSchema.extend({
    search: z.string().max(100).optional(),
    type: z.string().max(50).optional(),
    minValue: z.coerce.number().min(0).optional(),
    maxValue: z.coerce.number().min(0).optional(),
    associatesOnly: z
      .string()
      .optional()
      .transform((v) => v === 'true'),
    sortBy: z.enum(['value', 'owner', 'year']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export const graphGlobalQuerySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(10).max(2000).default(150),
    minRisk: z.coerce.number().int().min(0).default(0),
    mode: z.string().max(20).optional(),
    startDate: dateRangeSchema.shape.startDate,
    endDate: dateRangeSchema.shape.endDate,
    sourceId: z.string().max(50).optional(),
    targetId: z.string().max(50).optional(),
  }),
});

export const mapEntitiesQuerySchema = z.object({
  query: z.object({
    minRisk: z.coerce.number().int().min(0).default(0),
  }),
});

// ── Entity schemas ────────────────────────────────────────────────────────────

export const updateEntitySchema = z.object({
  params: z.object({
    id: z.coerce.number().int().min(1),
  }),
  body: z.object({
    full_name: z.string().min(3).max(100).optional(),
    primary_role: z.string().min(2).max(100).optional(),
    entity_type: z.string().optional(),
    red_flag_rating: z.number().int().min(0).max(5).optional(),
    bio: z.string().max(2000).optional(),
  }),
});
