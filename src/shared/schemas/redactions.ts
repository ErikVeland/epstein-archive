import { z } from 'zod';

export const RedactionFindingTypeSchema = z.enum([
  'overlay_text_exposed',
  'contextual_hypothesis',
  'unresolved_redaction',
]);

export const RedactionReviewStatusSchema = z.enum(['pending', 'corroborated', 'rejected']);

export const RedactionCandidateSchema = z.object({
  value: z.string(),
  category: z.enum(['name', 'identifier', 'date', 'location', 'organization', 'other']),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  entityId: z.string().nullable(),
  corroboratingDocumentCount: z.number().int().min(0),
});

export const RedactionFindingSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  pageNumber: z.number().int().positive().nullable(),
  spanStart: z.number().int().min(0).nullable(),
  spanEnd: z.number().int().min(0).nullable(),
  type: RedactionFindingTypeSchema,
  exposedText: z.string().nullable(),
  bbox: z.unknown(),
  inferredClass: z.string().nullable(),
  candidates: z.array(RedactionCandidateSchema),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()),
  method: z.string(),
  modelId: z.string().nullable(),
  promptVersion: z.string().nullable(),
  sourceSha256: z.string().nullable(),
  reviewStatus: RedactionReviewStatusSchema,
});

export const DocumentRedactionsSchema = z.object({
  documentId: z.string(),
  sourceFileUrl: z.string(),
  count: z.number().int().min(0),
  overlayRecoveryCount: z.number().int().min(0),
  hypothesisCount: z.number().int().min(0),
  unresolvedCount: z.number().int().min(0),
  findings: z.array(RedactionFindingSchema),
  disclaimer: z.string(),
});

export const RedactionIntelligenceSummarySchema = z.object({
  total: z.number().int().min(0),
  overlayRecoveries: z.number().int().min(0),
  contextualHypotheses: z.number().int().min(0),
  pendingReview: z.number().int().min(0),
  corroborated: z.number().int().min(0),
});

export const RedactionQueueItemSchema = z.object({
  documentId: z.string(),
  title: z.string(),
  fileName: z.string(),
  previewText: z.string(),
  findingCount: z.number().int().min(0),
  overlayRecoveryCount: z.number().int().min(0),
  hypothesisCount: z.number().int().min(0),
  unresolvedCount: z.number().int().min(0),
  highestConfidence: z.number().min(0).max(1),
  pendingReviewCount: z.number().int().min(0),
});

export const RedactionQueueSchema = z.object({
  items: z.array(RedactionQueueItemSchema),
  total: z.number().int().min(0),
});
