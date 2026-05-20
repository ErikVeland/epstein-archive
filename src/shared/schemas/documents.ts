import { z } from 'zod';
import { provenanceSchema } from './provenance';

const documentListItemCanonicalSchema = z
  .object({
    id: z.string(),
    fileName: z.string(),
    title: z.string(),
    fileType: z.string(),
    fileSize: z.number(),
    dateCreated: z.string().nullable(),
    evidenceType: z.string(),
    metadata: z.record(z.string(), z.unknown()),
    aiSummary: z.string().nullable().optional(),
    redFlagRating: z.number(),
    wordCount: z.number(),
    entitiesCount: z.number(),
    keyEntities: z.array(z.object({ id: z.string(), name: z.string() })),
    sourceType: z.string(),
    previewText: z.string(),
    previewKind: z.string(),
    whyFlagged: z.string(),
    unredactionAttempted: z.boolean(),
    unredactionSucceeded: z.boolean(),
    redactionCoverageBefore: z.number().nullable(),
    redactionCoverageAfter: z.number().nullable(),
    unredactedTextGain: z.number().nullable(),
  })
  .merge(provenanceSchema);

export const documentListItemSchema = z.preprocess((input) => {
  if (!input || typeof input !== 'object') return input;
  const row = input as Record<string, unknown>;
  return {
    ...row,
    entitiesCount: row.entitiesCount ?? row.entities_count ?? 0,
    keyEntities: row.keyEntities ?? row.key_entities ?? [],
    sourceType: row.sourceType ?? row.source_type ?? '',
    previewText: row.previewText ?? row.preview_text ?? '',
    previewKind: row.previewKind ?? row.preview_kind ?? 'fallback',
    whyFlagged: row.whyFlagged ?? row.why_flagged ?? '',
    unredactionAttempted: row.unredactionAttempted ?? row.unredaction_attempted ?? false,
    unredactionSucceeded: row.unredactionSucceeded ?? row.unredaction_succeeded ?? false,
    redactionCoverageBefore: row.redactionCoverageBefore ?? row.redaction_coverage_before ?? null,
    redactionCoverageAfter: row.redactionCoverageAfter ?? row.redaction_coverage_after ?? null,
    unredactedTextGain: row.unredactedTextGain ?? row.unredacted_text_gain ?? null,
    aiSummary: row.aiSummary ?? (row as Record<string, unknown>).ai_summary ?? null,
  };
}, documentListItemCanonicalSchema);

export const documentsListResponseSchema = z.object({
  data: z.array(documentListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
  searchMeta: z
    .object({
      requestedMode: z.enum(['lexical', 'semantic', 'hybrid']),
      effectiveMode: z.enum(['lexical', 'semantic', 'hybrid']),
      semanticAvailable: z.boolean(),
      semanticReason: z.string().optional(),
      message: z.string().optional(),
    })
    .optional(),
});

// Schema for GET /api/documents/:id and GET /api/evidence/:id — single document/evidence detail
export const documentDetailSchema = z
  .object({
    id: z.string(),
    fileName: z.string(),
    filePath: z.string().nullable(),
    fileType: z.string(),
    fileSize: z.number(),
    dateCreated: z.string().nullable(),
    title: z.string(),
    content: z.string(),
    contentRefined: z.string().nullable(),
    contentPreview: z.string().nullable(),
    metadata: z.record(z.string(), z.unknown()),
    aiSummary: z.string().nullable().optional(),
    evidenceType: z.string(),
    redFlagRating: z.number(),
    sourceCollection: z.string().nullable(),
    fileUrl: z.string().nullable(),
    originalFileUrl: z.string().nullable(),
    // Entities joined by documentsRepository.getDocumentById
    entities: z
      .array(
        z.object({
          id: z.union([z.string(), z.number()]),
          name: z.string(),
          mentions: z.number(),
          contexts: z.array(z.string()),
        }),
      )
      .optional(),
  })
  .merge(provenanceSchema);
