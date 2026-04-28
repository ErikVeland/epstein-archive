import { z } from 'zod';

const collaboratorSchema = z.object({
  userId: z.string(),
  permissionLevel: z.string(),
  joinedAt: z.string(),
});

export const investigationItemSchema = z.object({
  id: z.number(),
  uuid: z.string(),
  title: z.string(),
  description: z.string().optional(),
  ownerId: z.string(),
  status: z.enum(['active', 'archived', 'closed']),
  scope: z.string().optional(),
  collaborators: z.array(collaboratorSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const investigationListResponseSchema = z.object({
  data: z.array(investigationItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

export const investigationDetailResponseSchema = investigationItemSchema.nullable();

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
export const investigativeLeadSchema = z.object({
  id: z.number(),
  investigationId: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(['open', 'pursued', 'dead_end', 'resolved', 'in_progress']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  sourceDocumentId: z.number().nullable(),
  sourceEftaRef: z.string().nullable(),
  assignedTo: z.string().nullable(),
  createdBy: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  resolutionNotes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  forensicSignalId: z.number().nullable().optional(),
});

export const investigativeLeadResponseSchema = z.union([
  investigativeLeadSchema,
  z.array(investigativeLeadSchema),
]);

export const investigativeDiscoveryPayloadSchema = z.object({
  leads: z.array(investigativeLeadSchema),
  signals: z.array(z.unknown()),
  confidence: z.number(),
});
