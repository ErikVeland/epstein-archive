import { z } from 'zod';

const relationshipItemSchema = z.object({
  entity_id: z.string(),
  related_entity_id: z.string(),
  relationship_type: z.string(),
  strength: z.number().nullable(),
  confidence: z.number(),
  weight: z.number().nullable(),
});

export const relationshipsResponseSchema = z.object({
  relationships: z.array(relationshipItemSchema),
});

// Schema for GET /api/entities/:id/analytics/graph (entity graph slice)
// Uses the same node/edge shape as /api/graph/global
const entityGraphNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.string(),
  risk: z.number(),
  image: z.string().optional(),
  isEgo: z.boolean().optional(),
  connectionCount: z.number().optional(),
});

const entityGraphEdgeSchema = z.object({
  id: z.string().optional(),
  source: z.string(),
  target: z.string(),
  type: z.string(),
  weight: z.number(),
  confidence: z.number(),
  docCount: z.number().optional(),
});

export const entityGraphResponseSchema = z.object({
  nodes: z.array(entityGraphNodeSchema),
  edges: z.array(entityGraphEdgeSchema),
});
