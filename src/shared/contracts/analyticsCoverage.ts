import { z } from 'zod';
const count = z
  .union([z.number(), z.string().regex(/^\d+$/)])
  .transform(Number)
  .pipe(z.number().int().nonnegative());
export const analyticsCoverageSchema = z.object({
  documentsByType: z.array(z.object({ type: z.string().nullable(), count })),
  timelineData: z.array(z.object({ period: z.string(), total: count })),
  totalCounts: z.object({
    documents: count,
    entities: count,
    relationships: count,
    evidenceFiles: count,
  }),
  reconciliation: z.object({ unclassifiedCount: count, unknownDateCount: count }),
});
export const analyticsEvidenceSchema = z.object({
  documents: z.array(
    z.object({
      documentId: z.coerce.number().int().positive(),
      title: z.string(),
      snippet: z.string().nullish(),
    }),
  ),
});
