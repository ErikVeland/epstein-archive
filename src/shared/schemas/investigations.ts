import { z } from 'zod';

export const investigationEvidenceListItemSchema = z.object({
  id: z.number(),
  type: z.string(),
  title: z.string(),
  description: z.string(),
  sourcePath: z.string(),
  metadataJson: z.string().nullable(),
  investigationEvidenceId: z.number(),
  relevance: z.string(),
  extractedAt: z.string(),
  extractedBy: z.string().nullable(),
});

export const investigationEvidenceListResponseSchema = z.object({
  data: z.array(investigationEvidenceListItemSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export const investigationCaseEvidenceItemSchema = z.object({
  id: z.number(),
  type: z.string(),
  title: z.string(),
  description: z.string(),
  sourcePath: z.string(),
  metadataJson: z.string().nullable(),
  investigationEvidenceId: z.number().optional(),
  documentId: z.number().nullable().optional(),
  mediaItemId: z.number().nullable().optional(),
  redFlagRating: z.number(),
  relevance: z.string(),
  addedAt: z.string(),
  addedBy: z.string().nullable(),
  notes: z.string(),
  targetType: z.enum(['document', 'entity', 'media']).nullable().optional(),
  targetId: z.number().nullable().optional(),
  ingestRunId: z.union([z.string(), z.number()]).nullable().optional(),
  evidenceLadder: z.string().nullable().optional(),
  pipelineVersion: z.string().nullable().optional(),
  evidencePack: z.unknown().optional(),
  wasAgentic: z.boolean().optional(),
});

export const investigationEvidenceByTypeResponseSchema = z.object({
  all: z.array(investigationCaseEvidenceItemSchema),
  byType: z.record(z.array(investigationCaseEvidenceItemSchema)),
  counts: z.record(z.number()),
  total: z.number(),
});
