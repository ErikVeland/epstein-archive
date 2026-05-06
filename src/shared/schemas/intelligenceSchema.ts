import { z } from 'zod';

export const weakProvenanceDocSchema = z.object({
  documentId: z.number(),
  fileName: z.string(),
  docType: z.string().nullable(),
  entityMentionCount: z.number(),
  evidenceCount: z.number(),
});

export const lowOcrDocSchema = z.object({
  documentId: z.number(),
  fileName: z.string(),
  avgOcrConfidence: z.number().nullable(),
  ocrFlagCount: z.number(),
});

export const fuzzyEntityAliasSchema = z.object({
  entityId: z.number(),
  entityName: z.string(),
  aliasName: z.string(),
  similarityScore: z.number().nullable(),
});

export const thinHighRiskEntitySchema = z.object({
  entityId: z.number(),
  entityName: z.string(),
  riskLevel: z.string(),
  evidenceCount: z.number(),
  documentCount: z.number(),
});

export const unlinkedClaimSchema = z.object({
  claimId: z.number(),
  predicateText: z.string(),
  objectText: z.string(),
  subjectEntityId: z.number().nullable(),
  subjectEntityName: z.string().nullable(),
  confidence: z.number().nullable(),
});

export const reviewableFinancialItemSchema = z.object({
  itemId: z.number(),
  itemType: z.string(),
  description: z.string().nullable(),
  entityName: z.string().nullable(),
  needsReview: z.boolean(),
});

export const queueCountsSchema = z.object({
  weakProvenanceDocs: z.number(),
  lowOcrDocs: z.number(),
  fuzzyEntityAliases: z.number(),
  thinHighRiskEntities: z.number(),
  unlinkedClaims: z.number(),
  reviewableFinancialItems: z.number(),
});

export const intelligenceReviewResponseSchema = z.object({
  weakProvenanceDocs: z.array(weakProvenanceDocSchema),
  lowOcrDocs: z.array(lowOcrDocSchema),
  fuzzyEntityAliases: z.array(fuzzyEntityAliasSchema),
  thinHighRiskEntities: z.array(thinHighRiskEntitySchema),
  unlinkedClaims: z.array(unlinkedClaimSchema),
  reviewableFinancialItems: z.array(reviewableFinancialItemSchema),
  counts: queueCountsSchema,
});

export const intelligenceReadinessResponseSchema = z.object({
  semanticAvailable: z.boolean(),
  provenanceCoveragePct: z.number().nullable(),
  pendingMentionReviews: z.number(),
  pendingClaimReviews: z.number(),
  exportTestsNote: z.string(),
});

export type WeakProvenanceDoc = z.infer<typeof weakProvenanceDocSchema>;
export type LowOcrDoc = z.infer<typeof lowOcrDocSchema>;
export type FuzzyEntityAlias = z.infer<typeof fuzzyEntityAliasSchema>;
export type ThinHighRiskEntity = z.infer<typeof thinHighRiskEntitySchema>;
export type UnlinkedClaim = z.infer<typeof unlinkedClaimSchema>;
export type ReviewableFinancialItem = z.infer<typeof reviewableFinancialItemSchema>;
export type QueueCounts = z.infer<typeof queueCountsSchema>;
export type IntelligenceReviewResponse = z.infer<typeof intelligenceReviewResponseSchema>;
export type IntelligenceReadinessResponse = z.infer<typeof intelligenceReadinessResponseSchema>;
