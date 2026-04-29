import { z } from 'zod';

export const reviewStateSchema = z.enum([
  'unreviewed',
  'accepted',
  'rejected',
  'deferred',
  'insufficient_evidence',
]);

export const extractionMethodSchema = z.enum(['ocr', 'manual', 'structured', 'agentic']);

export const provenanceStatusSchema = z.enum(['complete', 'partial', 'missing']);

export const provenanceSchema = z.object({
  sourceDocumentId: z.number().nullable().optional(),
  sourceHash: z.string().nullable().optional(),
  extractionMethod: extractionMethodSchema.nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  reviewState: reviewStateSchema.optional(),
  lastVerifiedAt: z.string().nullable().optional(),
  provenanceStatus: provenanceStatusSchema.optional(),
});

export type Provenance = z.infer<typeof provenanceSchema>;
