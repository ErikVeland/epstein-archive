import { z } from 'zod';

const timelineEntitySchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  name: z.string(),
  type: z.string().optional(),
  role: z.string().optional(),
});

const timelineRelatedDocumentSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string().optional(),
  title: z.string().optional(),
});

export const timelineEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  type: z.string(),
  date: z.string().nullable().optional(),
  entities: z.array(timelineEntitySchema),
  // snake_case keys as returned by the repository (no global transform middleware)
  significance_score: z.string().nullable().optional(),
  file_path: z.null().optional(),
  original_file_path: z.null().optional(),
  is_curated: z.boolean().optional(),
  source: z.string().nullable().optional(),
  related_document: z.union([timelineRelatedDocumentSchema, z.null()]).optional(),
  support: z.record(z.unknown()).optional(),
});

// Schema for GET /api/timeline
export const timelineEventsResponseSchema = z.array(timelineEventSchema);
