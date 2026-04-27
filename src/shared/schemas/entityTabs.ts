import { z } from 'zod';

export const entityMediaItemSchema = z.object({
  id: z.number(),
  entityId: z.union([z.string(), z.number()]).nullable(),
  documentId: z.union([z.string(), z.number()]).nullable(),
  filePath: z.string(),
  thumbnailPath: z.string().nullable(),
  fileType: z.string().nullable(),
  fileSize: z.number(),
  width: z.number().optional().nullable(),
  height: z.number().optional().nullable(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  isSensitive: z.boolean().optional().nullable(),
  verificationStatus: z.string().nullable(),
  redFlagRating: z.number(),
  metadata: z.record(z.unknown()).optional(),
  dateTaken: z.union([z.string(), z.date()]).nullable(),
  createdAt: z.union([z.string(), z.date()]).nullable(),
  taggedPeople: z.array(z.string()).optional(),
});

export const entityMediaResponseSchema = z.array(entityMediaItemSchema);

export const entityDocumentItemSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  title: z.string().nullable(),
  fileName: z.string().nullable().optional(),
  filePath: z.string().nullable().optional(),
  fileType: z.string().nullable().optional(),
  evidenceType: z.string().nullable().optional(),
  dateCreated: z.union([z.string(), z.date()]).nullable().optional(),
  redFlagRating: z.number().optional().default(0),
  wordCount: z.number().optional(),
  contentPreview: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  content_refined: z.string().nullable().optional(),
  metadata: z.unknown().nullable().optional(),
});

export const entityDocumentsResponseSchema = z.object({
  data: z.array(entityDocumentItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export const entityFlightsResponseSchema = z.object({
  flights: z.array(z.record(z.unknown())),
});

export const entityTransactionsResponseSchema = z.object({
  entityName: z.string(),
  transactions: z.array(z.record(z.unknown())),
});

export const entityPropertiesResponseSchema = z.object({
  properties: z.array(z.record(z.unknown())),
});

export const entityClaimsResponseSchema = z.array(z.record(z.unknown()));

export const entityInvestigationsResponseSchema = z.array(z.record(z.unknown()));
