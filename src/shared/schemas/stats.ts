import { z } from 'zod';

// Schema for GET /api/stats (shape from withSafeStatsContract())
export const statsResponseSchema = z.object({
  totalEntities: z.number(),
  totalDocuments: z.number(),
  totalRelationships: z.number(),
  totalMentions: z.number(),
  averageRedFlagRating: z.number(),
  totalUniqueRoles: z.number(),
  entitiesWithDocuments: z.number(),
  documentsWithMetadata: z.number(),
  documentsFixed: z.number(),
  activeInvestigations: z.number(),
  topRoles: z.array(z.unknown()),
  topEntities: z.array(z.unknown()),
  likelihoodDistribution: z.array(
    z.object({
      level: z.string(),
      count: z.number(),
    }),
  ),
  redFlagDistribution: z.array(z.unknown()),
  collectionCounts: z.array(z.unknown()),
  collectionStats: z.array(z.unknown()),
  // snake_case key — no global transform middleware
  pipeline_status: z.unknown().nullable(),
  _meta: z.object({
    degraded: z.boolean(),
    degradedSources: z.array(z.string()).optional(),
  }),
});

// Schema for GET /api/stats/health
export const healthResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  uptime: z.number(),
  database: z.string(),
  data: z.object({
    entities: z.number(),
    documents: z.number(),
  }),
  memory: z.record(z.unknown()),
  environment: z.string(),
});

export const archiveStatusSchema = z.object({
  lastIngestedAt: z.string().nullable(),
  status: z.enum(['current', 'stale', 'unknown']),
  documentCount: z.number().int(),
  entityCount: z.number().int(),
});

export type ArchiveStatusDto = z.infer<typeof archiveStatusSchema>;
