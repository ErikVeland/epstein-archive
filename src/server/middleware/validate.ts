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
