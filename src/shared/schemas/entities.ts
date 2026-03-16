import { z } from 'zod';

export const subjectCardStatsSchema = z.object({
  mentions: z.number(),
  documents: z.number(),
  distinctSources: z.number(),
  verifiedMedia: z.number(),
});

export const subjectCardForensicsSchema = z.object({
  riskLevel: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  evidenceLadder: z.enum(['L1', 'L2', 'L3', 'NONE']),
  redFlagObjective: z.number().optional(),
  redFlagSubjective: z.number().optional(),
  signalStrength: z.object({
    exposure: z.number(),
    connectivity: z.number(),
    corroboration: z.number(),
  }),
  driverLabels: z.array(z.string()),
});

export const subjectCardTopPreviewSchema = z
  .object({
    id: z.string(),
    type: z.enum(['document', 'flight_log', 'black_book', 'testimony']),
    title: z.string(),
    citation: z.string(),
    confidence: z.number(),
    year: z.number().optional(),
  })
  .optional();

export const subjectCardListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  shortBio: z.string().optional(),
  stats: subjectCardStatsSchema,
  forensics: subjectCardForensicsSchema,
  topPreview: subjectCardTopPreviewSchema,
  topPhotoId: z.string().optional(),
});

export const subjectsListResponseSchema = z.object({
  subjects: z.array(subjectCardListItemSchema),
  total: z.number(),
});

export const entityListItemSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  fullName: z.string(),
  bio: z.string().optional(),
  entityType: z.string(),
  primaryRole: z.string(),
  secondaryRoles: z.array(z.string()),
  mentions: z.number(),
  files: z.number(),
  contexts: z.array(z.record(z.unknown())),
  evidenceTypes: z.array(z.string()),
  photos: z.array(z.record(z.unknown())),
  significantPassages: z.array(z.record(z.unknown())),
  likelihoodScore: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  redFlagScore: z.number(),
  redFlagRating: z.number(),
  redFlagPeppers: z.string(),
  redFlagDescription: z.string(),
  connectionsToEpstein: z.string(),
});

export const entityListResponseSchema = z.object({
  data: z.array(entityListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

// Schema for GET /api/entities/:id — single entity detail
export const entityDetailSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  fullName: z.string(),
  entityType: z.string(),
  primaryRole: z.string(),
  secondaryRoles: z.array(z.string()),
  mentions: z.number(),
  files: z.number(),
  contexts: z.array(z.unknown()),
  evidenceTypes: z.array(z.string()),
  likelihoodScore: z.string(),
  redFlagScore: z.number(),
  redFlagRating: z.number(),
  redFlagPeppers: z.string(),
  redFlagDescription: z.string(),
  connectionsToEpstein: z.string(),
  fileReferences: z.array(z.unknown()),
  timelineEvents: z.array(z.unknown()),
  networkConnections: z.array(z.unknown()),
  blackBookEntries: z.array(z.unknown()),
  bio: z.string(),
  description: z.string(),
  photos: z.array(z.unknown()),
  significantPassages: z.array(z.unknown()),
  birthDate: z.string().nullable(),
  deathDate: z.string().nullable(),
});
