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
  metadata: z.unknown().optional(),
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

const coPassengerSchema = z.object({
  passenger_name: z.string().nullable(),
  role: z.string().nullable(),
  entity_id: z.number().nullable(),
});

const entityFlightItemSchema = z.object({
  id: z.number(),
  date: z.string().nullable(),
  departure_airport: z.string().nullable(),
  departure_city: z.string().nullable(),
  departure_country: z.string().nullable(),
  arrival_airport: z.string().nullable(),
  arrival_city: z.string().nullable(),
  arrival_country: z.string().nullable(),
  aircraft_tail: z.string().nullable(),
  aircraft_type: z.string().nullable(),
  passenger_role: z.string().nullable(),
  co_passengers: z.array(coPassengerSchema),
});

export const entityFlightsResponseSchema = z.object({
  flights: z.array(entityFlightItemSchema),
});

const entityTransactionItemSchema = z.object({
  id: z.number(),
  from_entity: z.string().nullable(),
  to_entity: z.string().nullable(),
  amount: z.number().nullable(),
  currency: z.string().nullable(),
  transaction_date: z.string().nullable(),
  transaction_type: z.string().nullable(),
  method: z.string().nullable(),
  risk_level: z.string().nullable(),
  description: z.string().nullable(),
  source_document_id: z.number().nullable(),
});

export const entityTransactionsResponseSchema = z.object({
  entityName: z.string(),
  transactions: z.array(entityTransactionItemSchema),
});

const entityPropertyItemSchema = z.object({
  id: z.number(),
  pcn: z.string().nullable(),
  owner_name_1: z.string().nullable(),
  owner_name_2: z.string().nullable(),
  site_address: z.string().nullable(),
  street_name: z.string().nullable(),
  total_tax_value: z.number().nullable(),
  acres: z.number().nullable(),
  property_use: z.string().nullable(),
  year_built: z.number().nullable(),
  bedrooms: z.number().nullable(),
  full_bathrooms: z.number().nullable(),
  half_bathrooms: z.number().nullable(),
  building_area: z.number().nullable(),
  living_area: z.number().nullable(),
  is_epstein_property: z.union([z.boolean(), z.number()]).nullable(),
  is_known_associate: z.union([z.boolean(), z.number()]).nullable(),
});

export const entityPropertiesResponseSchema = z.object({
  properties: z.array(entityPropertyItemSchema),
});

const claimTripleSchema = z.object({
  id: z.union([z.string(), z.number()]),
  documentId: z.union([z.string(), z.number()]).nullable(),
  subjectEntityId: z.union([z.string(), z.number()]).nullable(),
  objectEntityId: z.union([z.string(), z.number()]).nullable(),
  predicate: z.string().nullable(),
  objectText: z.string().nullable(),
  claimText: z.string().nullable(),
  confidence: z.number(),
  modality: z.string(),
  verified: z.number(),
  verifiedBy: z.string().nullable(),
  verifiedAt: z.union([z.string(), z.date()]).nullable(),
  rejectionReason: z.string().nullable(),
  createdAt: z.union([z.string(), z.date()]),
  sourceDocumentId: z.number().nullable(),
  sourceHash: z.string().nullable(),
  extractionMethod: z.enum(['ocr', 'manual', 'structured', 'agentic']),
  reviewState: z.enum(['unreviewed', 'accepted', 'rejected', 'deferred', 'insufficient_evidence']),
  lastVerifiedAt: z.union([z.string(), z.date()]).nullable(),
  provenanceStatus: z.enum(['complete', 'partial', 'missing']),
  subjectName: z.string().optional(),
  objectName: z.string().optional(),
  documentTitle: z.string().optional(),
});

export const entityClaimsResponseSchema = z.array(claimTripleSchema);

// Schema for GET /api/entities/:entityId/connections
const entityConnectionSignalChannelSchema = z.object({
  score: z.number(),
  count: z.number(),
});

const entityConnectionSignalsSchema = z.object({
  relationship: z.object({
    score: z.number(),
    type: z.string().nullable(),
    confidence: z.number().nullable(),
  }),
  financial: entityConnectionSignalChannelSchema,
  communications: entityConnectionSignalChannelSchema,
  flights: entityConnectionSignalChannelSchema,
  documents: entityConnectionSignalChannelSchema,
});

const entityConnectionItemSchema = z.object({
  entityId: z.string(),
  entityName: z.string(),
  entityType: z.string(),
  riskRating: z.number(),
  communityId: z.number().nullable(),
  totalScore: z.number(),
  signals: entityConnectionSignalsSchema,
});

export const entityConnectionsResponseSchema = z.object({
  connections: z.array(entityConnectionItemSchema),
  totalCount: z.number(),
});

const entityInvestigationItemSchema = z.object({
  id: z.number(),
  uuid: z.string(),
  title: z.string(),
  description: z.string().optional(),
  ownerId: z.string(),
  status: z.enum(['active', 'archived', 'closed']),
  scope: z.string().optional(),
  collaborators: z.array(
    z.object({
      userId: z.string(),
      permissionLevel: z.string(),
      joinedAt: z.string(),
    }),
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const entityInvestigationsResponseSchema = z.array(entityInvestigationItemSchema);
