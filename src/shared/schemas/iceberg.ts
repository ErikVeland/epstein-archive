import { z } from 'zod';

export const dangerMotifTypeSchema = z.enum([
  'co_travel',
  'co_presence',
  'shared_address_contact',
  'weak_repeated_association',
  'high_risk_bridge',
  'conflicting_dates',
  'missing_provenance',
  'sensitive_entity_exposure',
  'financial_proximity',
  'communication_proximity',
  'document_cluster_bridge',
  'manual_lead',
]);

export const harmTypeSchema = z.enum([
  'privacy_exposure',
  'coercion_or_exploitation',
  'reputational_harm',
  'financial_harm',
  'legal_process_harm',
  'safety_risk',
  'misinformation_amplification',
  'institutional_accountability',
  'unknown',
]);

export const icebergReviewStateSchema = z.enum([
  'unreviewed',
  'accepted',
  'rejected',
  'deferred',
  'insufficient_evidence',
]);

export const icebergEntityRefSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  type: z.string().nullable(),
  riskScore: z.number().nullable(),
});

export const icebergSupportingDocumentSchema = z.object({
  documentId: z.number().int(),
  title: z.string(),
  snippet: z.string().nullable(),
  sourceType: z.string().nullable(),
  date: z.string().nullable(),
  confidence: z.number().nullable(),
});

export const icebergLeadSchema = z.object({
  id: z.string(),
  investigationId: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
  leadKind: z.enum(['motif', 'relationship', 'document', 'manual']),
  motifType: dangerMotifTypeSchema,
  harmType: harmTypeSchema,
  status: z.enum(['open', 'pursued', 'dead_end', 'resolved']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  confidence: z.number().nullable(),
  riskScore: z.number().nullable(),
  evidenceCount: z.number().int(),
  pathLength: z.number().int().nullable(),
  sourceSummary: z.string(),
  primaryEntities: z.array(icebergEntityRefSchema),
  supportingDocuments: z.array(icebergSupportingDocumentSchema),
  contradictionCount: z.number().int(),
  reviewState: icebergReviewStateSchema,
  explainability: z.object({
    whyItMatters: z.string(),
    strongestEvidence: z.array(z.string()),
    limitations: z.array(z.string()),
    nextActions: z.array(z.string()),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const graphPathEdgeSchema = z.object({
  source: z.string(),
  sourceLabel: z.string().nullable(),
  target: z.string(),
  targetLabel: z.string().nullable(),
  type: z.string(),
  classification: z.enum(['EVIDENCE_BACKED', 'INFERRED', 'MIXED']),
  confidence: z.number(),
  riskScore: z.number(),
  evidenceCount: z.number().int(),
  sourceDocumentIds: z.array(z.number().int()),
  dateRange: z.object({ start: z.string().nullable(), end: z.string().nullable() }),
});

export const graphPathSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  score: z.number(),
  confidence: z.number(),
  riskScore: z.number(),
  pathLength: z.number().int(),
  nodes: z.array(icebergEntityRefSchema),
  edges: z.array(graphPathEdgeSchema),
});

export const relationshipExplanationSchema = z.object({
  sourceId: z.string(),
  targetId: z.string(),
  directEvidence: z.array(icebergSupportingDocumentSchema),
  indirectEvidence: z.array(icebergSupportingDocumentSchema),
  sharedDates: z.array(z.string()),
  sharedLocations: z.array(z.string()),
  contradictions: z.array(z.string()),
  missingProvenance: z.array(z.string()),
  confidence: z.number().nullable(),
  summary: z.string(),
});

export const evidenceChainItemSchema = z.object({
  id: z.number().int(),
  investigationId: z.number().int(),
  leadId: z.string().nullable(),
  itemType: z.enum(['lead', 'path', 'edge', 'document_context']),
  title: z.string(),
  payload: z.unknown(),
  createdAt: z.string(),
});
