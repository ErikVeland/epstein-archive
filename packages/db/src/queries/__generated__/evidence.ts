/** Types generated for queries found in "src/queries/evidence.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type NumberOrString = number | string;

/** 'GetEntitySummary' parameters type */
export interface IGetEntitySummaryParams {
  entityId: NumberOrString;
}

/** 'GetEntitySummary' return type */
export interface IGetEntitySummaryResult {
  entity_category: string | null;
  full_name: string;
  id: string;
  primary_role: string | null;
  risk_level: string | null;
}

/** 'GetEntitySummary' query type */
export interface IGetEntitySummaryQuery {
  params: IGetEntitySummaryParams;
  result: IGetEntitySummaryResult;
}

const getEntitySummaryIR: any = {
  usedParamSet: { entityId: true },
  params: [
    { name: 'entityId', required: true, transform: { type: 'scalar' }, locs: [{ a: 89, b: 98 }] },
  ],
  statement:
    'SELECT id, full_name, primary_role, entity_category, risk_level\nFROM entities\nWHERE id = :entityId!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, full_name, primary_role, entity_category, risk_level
 * FROM entities
 * WHERE id = :entityId!
 * ```
 */
export const getEntitySummary = new PreparedQuery<IGetEntitySummaryParams, IGetEntitySummaryResult>(
  getEntitySummaryIR,
);

/** 'GetEntityEvidence' parameters type */
export interface IGetEntityEvidenceParams {
  entityId: NumberOrString;
  limit: NumberOrString;
  offset: NumberOrString;
}

/** 'GetEntityEvidence' return type */
export interface IGetEntityEvidenceResult {
  cleanedPath: string | null;
  confidence: number | null;
  createdAt: Date | null;
  description: string | null;
  evidenceType: string | null;
  id: string;
  mentionContext: string | null;
  redFlagRating: number | null;
  role: string | null;
  sourcePath: string | null;
  title: string | null;
}

/** 'GetEntityEvidence' query type */
export interface IGetEntityEvidenceQuery {
  params: IGetEntityEvidenceParams;
  result: IGetEntityEvidenceResult;
}

const getEntityEvidenceIR: any = {
  usedParamSet: { entityId: true, limit: true, offset: true },
  params: [
    { name: 'entityId', required: true, transform: { type: 'scalar' }, locs: [{ a: 536, b: 545 }] },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 594, b: 600 }] },
    { name: 'offset', required: true, transform: { type: 'scalar' }, locs: [{ a: 609, b: 616 }] },
  ],
  statement:
    'SELECT \n  d.id,\n  d.evidence_type as "evidenceType",\n  d.title,\n  COALESCE(d.content_preview, LEFT(d.content, 320)) as description,\n  d.file_path as "sourcePath",\n  d.file_path as "cleanedPath",\n  d.red_flag_rating as "redFlagRating",\n  d.created_at as "createdAt",\n  \'mentioned\' as role,\n  MAX(em.confidence) as confidence,\n  MAX(em.mention_context) as "mentionContext"\nFROM documents d\nINNER JOIN investigation_evidence ie ON ie.document_id = d.id\nINNER JOIN entity_mentions em ON em.document_id = ie.document_id\nWHERE em.entity_id = :entityId!\nGROUP BY d.id\nORDER BY d.created_at DESC\nLIMIT :limit! OFFSET :offset!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   d.id,
 *   d.evidence_type as "evidenceType",
 *   d.title,
 *   COALESCE(d.content_preview, LEFT(d.content, 320)) as description,
 *   d.file_path as "sourcePath",
 *   d.file_path as "cleanedPath",
 *   d.red_flag_rating as "redFlagRating",
 *   d.created_at as "createdAt",
 *   'mentioned' as role,
 *   MAX(em.confidence) as confidence,
 *   MAX(em.mention_context) as "mentionContext"
 * FROM documents d
 * INNER JOIN investigation_evidence ie ON ie.document_id = d.id
 * INNER JOIN entity_mentions em ON em.document_id = ie.document_id
 * WHERE em.entity_id = :entityId!
 * GROUP BY d.id
 * ORDER BY d.created_at DESC
 * LIMIT :limit! OFFSET :offset!
 * ```
 */
export const getEntityEvidence = new PreparedQuery<
  IGetEntityEvidenceParams,
  IGetEntityEvidenceResult
>(getEntityEvidenceIR);

/** 'CountEntityEvidence' parameters type */
export interface ICountEntityEvidenceParams {
  entityId: NumberOrString;
}

/** 'CountEntityEvidence' return type */
export interface ICountEntityEvidenceResult {
  total: number | null;
}

/** 'CountEntityEvidence' query type */
export interface ICountEntityEvidenceQuery {
  params: ICountEntityEvidenceParams;
  result: ICountEntityEvidenceResult;
}

const countEntityEvidenceIR: any = {
  usedParamSet: { entityId: true },
  params: [
    { name: 'entityId', required: true, transform: { type: 'scalar' }, locs: [{ a: 199, b: 208 }] },
  ],
  statement:
    'SELECT COUNT(*)::integer as total\nFROM documents d\nINNER JOIN investigation_evidence ie ON ie.document_id = d.id\nINNER JOIN entity_mentions em ON em.document_id = ie.document_id\nWHERE em.entity_id = :entityId!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT COUNT(*)::integer as total
 * FROM documents d
 * INNER JOIN investigation_evidence ie ON ie.document_id = d.id
 * INNER JOIN entity_mentions em ON em.document_id = ie.document_id
 * WHERE em.entity_id = :entityId!
 * ```
 */
export const countEntityEvidence = new PreparedQuery<
  ICountEntityEvidenceParams,
  ICountEntityEvidenceResult
>(countEntityEvidenceIR);

/** 'GetEvidenceTypeBreakdownByEntity' parameters type */
export interface IGetEvidenceTypeBreakdownByEntityParams {
  entityId: NumberOrString;
}

/** 'GetEvidenceTypeBreakdownByEntity' return type */
export interface IGetEvidenceTypeBreakdownByEntityResult {
  count: number | null;
  evidenceType: string | null;
}

/** 'GetEvidenceTypeBreakdownByEntity' query type */
export interface IGetEvidenceTypeBreakdownByEntityQuery {
  params: IGetEvidenceTypeBreakdownByEntityParams;
  result: IGetEvidenceTypeBreakdownByEntityResult;
}

const getEvidenceTypeBreakdownByEntityIR: any = {
  usedParamSet: { entityId: true },
  params: [
    { name: 'entityId', required: true, transform: { type: 'scalar' }, locs: [{ a: 239, b: 248 }] },
  ],
  statement:
    'SELECT \n  d.evidence_type as "evidenceType",\n  COUNT(*)::integer as count\nFROM documents d\nINNER JOIN investigation_evidence ie ON ie.document_id = d.id\nINNER JOIN entity_mentions em ON em.document_id = ie.document_id\nWHERE em.entity_id = :entityId!\nGROUP BY d.evidence_type\nORDER BY count DESC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   d.evidence_type as "evidenceType",
 *   COUNT(*)::integer as count
 * FROM documents d
 * INNER JOIN investigation_evidence ie ON ie.document_id = d.id
 * INNER JOIN entity_mentions em ON em.document_id = ie.document_id
 * WHERE em.entity_id = :entityId!
 * GROUP BY d.evidence_type
 * ORDER BY count DESC
 * ```
 */
export const getEvidenceTypeBreakdownByEntity = new PreparedQuery<
  IGetEvidenceTypeBreakdownByEntityParams,
  IGetEvidenceTypeBreakdownByEntityResult
>(getEvidenceTypeBreakdownByEntityIR);

/** 'GetRoleBreakdownByEntity' parameters type */
export interface IGetRoleBreakdownByEntityParams {
  entityId: NumberOrString;
}

/** 'GetRoleBreakdownByEntity' return type */
export interface IGetRoleBreakdownByEntityResult {
  count: number | null;
  role: string | null;
}

/** 'GetRoleBreakdownByEntity' query type */
export interface IGetRoleBreakdownByEntityQuery {
  params: IGetRoleBreakdownByEntityParams;
  result: IGetRoleBreakdownByEntityResult;
}

const getRoleBreakdownByEntityIR: any = {
  usedParamSet: { entityId: true },
  params: [
    { name: 'entityId', required: true, transform: { type: 'scalar' }, locs: [{ a: 105, b: 114 }] },
  ],
  statement:
    "SELECT \n  'mentioned' as role,\n  COUNT(*)::integer as count\nFROM entity_mentions em\nWHERE em.entity_id = :entityId!\nGROUP BY role\nORDER BY count DESC",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   'mentioned' as role,
 *   COUNT(*)::integer as count
 * FROM entity_mentions em
 * WHERE em.entity_id = :entityId!
 * GROUP BY role
 * ORDER BY count DESC
 * ```
 */
export const getRoleBreakdownByEntity = new PreparedQuery<
  IGetRoleBreakdownByEntityParams,
  IGetRoleBreakdownByEntityResult
>(getRoleBreakdownByEntityIR);

/** 'GetRedFlagDistributionByEntity' parameters type */
export interface IGetRedFlagDistributionByEntityParams {
  entityId: NumberOrString;
}

/** 'GetRedFlagDistributionByEntity' return type */
export interface IGetRedFlagDistributionByEntityResult {
  count: number | null;
  red_flag_rating: number | null;
}

/** 'GetRedFlagDistributionByEntity' query type */
export interface IGetRedFlagDistributionByEntityQuery {
  params: IGetRedFlagDistributionByEntityParams;
  result: IGetRedFlagDistributionByEntityResult;
}

const getRedFlagDistributionByEntityIR: any = {
  usedParamSet: { entityId: true },
  params: [
    { name: 'entityId', required: true, transform: { type: 'scalar' }, locs: [{ a: 223, b: 232 }] },
  ],
  statement:
    'SELECT \n  d.red_flag_rating,\n  COUNT(*)::integer as count\nFROM documents d\nINNER JOIN investigation_evidence ie ON ie.document_id = d.id\nINNER JOIN entity_mentions em ON em.document_id = ie.document_id\nWHERE em.entity_id = :entityId! AND d.red_flag_rating IS NOT NULL\nGROUP BY d.red_flag_rating\nORDER BY d.red_flag_rating DESC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   d.red_flag_rating,
 *   COUNT(*)::integer as count
 * FROM documents d
 * INNER JOIN investigation_evidence ie ON ie.document_id = d.id
 * INNER JOIN entity_mentions em ON em.document_id = ie.document_id
 * WHERE em.entity_id = :entityId! AND d.red_flag_rating IS NOT NULL
 * GROUP BY d.red_flag_rating
 * ORDER BY d.red_flag_rating DESC
 * ```
 */
export const getRedFlagDistributionByEntity = new PreparedQuery<
  IGetRedFlagDistributionByEntityParams,
  IGetRedFlagDistributionByEntityResult
>(getRedFlagDistributionByEntityIR);

/** 'GetRelatedEntitiesByEntity' parameters type */
export interface IGetRelatedEntitiesByEntityParams {
  entityId: NumberOrString;
  limit: NumberOrString;
}

/** 'GetRelatedEntitiesByEntity' return type */
export interface IGetRelatedEntitiesByEntityResult {
  entityCategory: string | null;
  fullName: string;
  id: string;
  sharedEvidenceCount: number | null;
}

/** 'GetRelatedEntitiesByEntity' query type */
export interface IGetRelatedEntitiesByEntityQuery {
  params: IGetRelatedEntitiesByEntityParams;
  result: IGetRelatedEntitiesByEntityResult;
}

const getRelatedEntitiesByEntityIR: any = {
  usedParamSet: { entityId: true, limit: true },
  params: [
    {
      name: 'entityId',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 325, b: 334 },
        { a: 357, b: 366 },
      ],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 462, b: 468 }] },
  ],
  statement:
    'SELECT \n  ent.id,\n  ent.full_name as "fullName",\n  ent.entity_category as "entityCategory",\n  COUNT(DISTINCT em1.document_id)::integer as "sharedEvidenceCount"\nFROM entity_mentions em1\nINNER JOIN entity_mentions em2 ON em1.document_id = em2.document_id\nINNER JOIN entities ent ON ent.id = em2.entity_id\nWHERE em1.entity_id = :entityId! AND em2.entity_id != :entityId!\nGROUP BY ent.id, ent.full_name, ent.entity_category\nORDER BY "sharedEvidenceCount" DESC\nLIMIT :limit!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   ent.id,
 *   ent.full_name as "fullName",
 *   ent.entity_category as "entityCategory",
 *   COUNT(DISTINCT em1.document_id)::integer as "sharedEvidenceCount"
 * FROM entity_mentions em1
 * INNER JOIN entity_mentions em2 ON em1.document_id = em2.document_id
 * INNER JOIN entities ent ON ent.id = em2.entity_id
 * WHERE em1.entity_id = :entityId! AND em2.entity_id != :entityId!
 * GROUP BY ent.id, ent.full_name, ent.entity_category
 * ORDER BY "sharedEvidenceCount" DESC
 * LIMIT :limit!
 * ```
 */
export const getRelatedEntitiesByEntity = new PreparedQuery<
  IGetRelatedEntitiesByEntityParams,
  IGetRelatedEntitiesByEntityResult
>(getRelatedEntitiesByEntityIR);

/** 'CreateEvidenceFull' parameters type */
export interface ICreateEvidenceFullParams {
  description?: string | null | void;
  evidenceType: string;
  extractedText?: string | null | void;
  metadata?: Json | null | void;
  originalFilename: string;
  redFlagRating: number;
  sourcePath: string;
  title: string;
}

/** 'CreateEvidenceFull' return type */
export interface ICreateEvidenceFullResult {
  id: string;
}

/** 'CreateEvidenceFull' query type */
export interface ICreateEvidenceFullQuery {
  params: ICreateEvidenceFullParams;
  result: ICreateEvidenceFullResult;
}

const createEvidenceFullIR: any = {
  usedParamSet: {
    evidenceType: true,
    sourcePath: true,
    originalFilename: true,
    title: true,
    description: true,
    extractedText: true,
    redFlagRating: true,
    metadata: true,
  },
  params: [
    {
      name: 'evidenceType',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 195, b: 208 }],
    },
    {
      name: 'sourcePath',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 214, b: 225 }],
    },
    {
      name: 'originalFilename',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 231, b: 248 }],
    },
    { name: 'title', required: true, transform: { type: 'scalar' }, locs: [{ a: 254, b: 260 }] },
    {
      name: 'description',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 266, b: 277 }],
    },
    {
      name: 'extractedText',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 283, b: 296 },
        { a: 357, b: 370 },
      ],
    },
    {
      name: 'redFlagRating',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 302, b: 316 }],
    },
    {
      name: 'metadata',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 322, b: 330 }],
    },
  ],
  statement:
    "INSERT INTO documents (\n  evidence_type,\n  file_path,\n  file_name,\n  title,\n  content_preview,\n  content,\n  red_flag_rating,\n  metadata_json,\n  file_size,\n  word_count,\n  created_at\n) VALUES (\n  :evidenceType!, \n  :sourcePath!, \n  :originalFilename!, \n  :title!, \n  :description, \n  :extractedText, \n  :redFlagRating!, \n  :metadata, \n  0,\n  LENGTH(COALESCE(:extractedText, '')),\n  CURRENT_TIMESTAMP\n)\nON CONFLICT (file_path) DO UPDATE SET\n  title = COALESCE(EXCLUDED.title, documents.title),\n  content_preview = COALESCE(EXCLUDED.content_preview, documents.content_preview),\n  content = COALESCE(NULLIF(EXCLUDED.content, ''), documents.content),\n  evidence_type = COALESCE(EXCLUDED.evidence_type, documents.evidence_type),\n  red_flag_rating = COALESCE(EXCLUDED.red_flag_rating, documents.red_flag_rating),\n  metadata_json = COALESCE(documents.metadata_json, '{}'::jsonb) || COALESCE(EXCLUDED.metadata_json, '{}'::jsonb)\nRETURNING id",
};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO documents (
 *   evidence_type,
 *   file_path,
 *   file_name,
 *   title,
 *   content_preview,
 *   content,
 *   red_flag_rating,
 *   metadata_json,
 *   file_size,
 *   word_count,
 *   created_at
 * ) VALUES (
 *   :evidenceType!,
 *   :sourcePath!,
 *   :originalFilename!,
 *   :title!,
 *   :description,
 *   :extractedText,
 *   :redFlagRating!,
 *   :metadata,
 *   0,
 *   LENGTH(COALESCE(:extractedText, '')),
 *   CURRENT_TIMESTAMP
 * )
 * ON CONFLICT (file_path) DO UPDATE SET
 *   title = COALESCE(EXCLUDED.title, documents.title),
 *   content_preview = COALESCE(EXCLUDED.content_preview, documents.content_preview),
 *   content = COALESCE(NULLIF(EXCLUDED.content, ''), documents.content),
 *   evidence_type = COALESCE(EXCLUDED.evidence_type, documents.evidence_type),
 *   red_flag_rating = COALESCE(EXCLUDED.red_flag_rating, documents.red_flag_rating),
 *   metadata_json = COALESCE(documents.metadata_json, '{}'::jsonb) || COALESCE(EXCLUDED.metadata_json, '{}'::jsonb)
 * RETURNING id
 * ```
 */
export const createEvidenceFull = new PreparedQuery<
  ICreateEvidenceFullParams,
  ICreateEvidenceFullResult
>(createEvidenceFullIR);

/** 'AddEvidenceToInvestigation' parameters type */
export interface IAddEvidenceToInvestigationParams {
  evidenceId: NumberOrString;
  investigationId: NumberOrString;
  notes?: string | null | void;
  relevance?: string | null | void;
}

/** 'AddEvidenceToInvestigation' return type */
export interface IAddEvidenceToInvestigationResult {
  id: string;
}

/** 'AddEvidenceToInvestigation' query type */
export interface IAddEvidenceToInvestigationQuery {
  params: IAddEvidenceToInvestigationParams;
  result: IAddEvidenceToInvestigationResult;
}

const addEvidenceToInvestigationIR: any = {
  usedParamSet: { investigationId: true, evidenceId: true, notes: true, relevance: true },
  params: [
    {
      name: 'investigationId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 115, b: 131 }],
    },
    {
      name: 'evidenceId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 134, b: 145 }],
    },
    { name: 'notes', required: false, transform: { type: 'scalar' }, locs: [{ a: 148, b: 153 }] },
    {
      name: 'relevance',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 156, b: 165 }],
    },
  ],
  statement:
    'INSERT INTO investigation_evidence (\n  investigation_id,\n  document_id,\n  notes,\n  relevance,\n  added_at\n) VALUES (:investigationId!, :evidenceId!, :notes, :relevance, CURRENT_TIMESTAMP)\nON CONFLICT (investigation_id, document_id) DO UPDATE SET\n  notes = EXCLUDED.notes,\n  relevance = EXCLUDED.relevance,\n  added_at = CURRENT_TIMESTAMP\nRETURNING id',
};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO investigation_evidence (
 *   investigation_id,
 *   document_id,
 *   notes,
 *   relevance,
 *   added_at
 * ) VALUES (:investigationId!, :evidenceId!, :notes, :relevance, CURRENT_TIMESTAMP)
 * ON CONFLICT (investigation_id, document_id) DO UPDATE SET
 *   notes = EXCLUDED.notes,
 *   relevance = EXCLUDED.relevance,
 *   added_at = CURRENT_TIMESTAMP
 * RETURNING id
 * ```
 */
export const addEvidenceToInvestigation = new PreparedQuery<
  IAddEvidenceToInvestigationParams,
  IAddEvidenceToInvestigationResult
>(addEvidenceToInvestigationIR);

/** 'GetInvestigationEvidenceSummary' parameters type */
export interface IGetInvestigationEvidenceSummaryParams {
  investigationId: NumberOrString;
}

/** 'GetInvestigationEvidenceSummary' return type */
export interface IGetInvestigationEvidenceSummaryResult {
  addedAt: Date | null;
  cleanedPath: string | null;
  createdAt: Date | null;
  description: string | null;
  evidenceType: string | null;
  id: string;
  notes: string | null;
  redFlagRating: number | null;
  relevance: string | null;
  source: string | null;
  title: string | null;
}

/** 'GetInvestigationEvidenceSummary' query type */
export interface IGetInvestigationEvidenceSummaryQuery {
  params: IGetInvestigationEvidenceSummaryParams;
  result: IGetInvestigationEvidenceSummaryResult;
}

const getInvestigationEvidenceSummaryIR: any = {
  usedParamSet: { investigationId: true },
  params: [
    {
      name: 'investigationId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 424, b: 440 }],
    },
  ],
  statement:
    'SELECT \n  d.id,\n  d.evidence_type as "evidenceType",\n  d.title,\n  COALESCE(d.content_preview, LEFT(d.content, 320)) as description,\n  d.red_flag_rating as "redFlagRating",\n  d.created_at as "createdAt",\n  d.file_path as "source",\n  d.file_path as "cleanedPath",\n  ie.notes,\n  ie.relevance,\n  ie.added_at as "addedAt"\nFROM investigation_evidence ie\nINNER JOIN documents d ON d.id = ie.document_id\nWHERE ie.investigation_id = :investigationId!\nORDER BY ie.added_at DESC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   d.id,
 *   d.evidence_type as "evidenceType",
 *   d.title,
 *   COALESCE(d.content_preview, LEFT(d.content, 320)) as description,
 *   d.red_flag_rating as "redFlagRating",
 *   d.created_at as "createdAt",
 *   d.file_path as "source",
 *   d.file_path as "cleanedPath",
 *   ie.notes,
 *   ie.relevance,
 *   ie.added_at as "addedAt"
 * FROM investigation_evidence ie
 * INNER JOIN documents d ON d.id = ie.document_id
 * WHERE ie.investigation_id = :investigationId!
 * ORDER BY ie.added_at DESC
 * ```
 */
export const getInvestigationEvidenceSummary = new PreparedQuery<
  IGetInvestigationEvidenceSummaryParams,
  IGetInvestigationEvidenceSummaryResult
>(getInvestigationEvidenceSummaryIR);

/** 'GetInvestigationEntityCoverage' parameters type */
export interface IGetInvestigationEntityCoverageParams {
  investigationId: NumberOrString;
  limit: NumberOrString;
}

/** 'GetInvestigationEntityCoverage' return type */
export interface IGetInvestigationEntityCoverageResult {
  entityCategory: string | null;
  evidenceCount: number | null;
  fullName: string;
  id: string;
}

/** 'GetInvestigationEntityCoverage' query type */
export interface IGetInvestigationEntityCoverageQuery {
  params: IGetInvestigationEntityCoverageParams;
  result: IGetInvestigationEntityCoverageResult;
}

const getInvestigationEntityCoverageIR: any = {
  usedParamSet: { investigationId: true, limit: true },
  params: [
    {
      name: 'investigationId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 326, b: 342 }],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 432, b: 438 }] },
  ],
  statement:
    'SELECT \n  ent.id,\n  ent.full_name as "fullName",\n  ent.entity_category as "entityCategory",\n  COUNT(DISTINCT ie.document_id)::integer as "evidenceCount"\nFROM investigation_evidence ie\nINNER JOIN entity_mentions em ON em.document_id = ie.document_id\nINNER JOIN entities ent ON ent.id = em.entity_id\nWHERE ie.investigation_id = :investigationId!\nGROUP BY ent.id, ent.full_name, ent.entity_category\nORDER BY "evidenceCount" DESC\nLIMIT :limit!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   ent.id,
 *   ent.full_name as "fullName",
 *   ent.entity_category as "entityCategory",
 *   COUNT(DISTINCT ie.document_id)::integer as "evidenceCount"
 * FROM investigation_evidence ie
 * INNER JOIN entity_mentions em ON em.document_id = ie.document_id
 * INNER JOIN entities ent ON ent.id = em.entity_id
 * WHERE ie.investigation_id = :investigationId!
 * GROUP BY ent.id, ent.full_name, ent.entity_category
 * ORDER BY "evidenceCount" DESC
 * LIMIT :limit!
 * ```
 */
export const getInvestigationEntityCoverage = new PreparedQuery<
  IGetInvestigationEntityCoverageParams,
  IGetInvestigationEntityCoverageResult
>(getInvestigationEntityCoverageIR);

/** 'RemoveEvidenceFromInvestigation' parameters type */
export interface IRemoveEvidenceFromInvestigationParams {
  id: NumberOrString;
}

/** 'RemoveEvidenceFromInvestigation' return type */
export type IRemoveEvidenceFromInvestigationResult = void;

/** 'RemoveEvidenceFromInvestigation' query type */
export interface IRemoveEvidenceFromInvestigationQuery {
  params: IRemoveEvidenceFromInvestigationParams;
  result: IRemoveEvidenceFromInvestigationResult;
}

const removeEvidenceFromInvestigationIR: any = {
  usedParamSet: { id: true },
  params: [{ name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 46, b: 49 }] }],
  statement: 'DELETE FROM investigation_evidence\nWHERE id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM investigation_evidence
 * WHERE id = :id!
 * ```
 */
export const removeEvidenceFromInvestigation = new PreparedQuery<
  IRemoveEvidenceFromInvestigationParams,
  IRemoveEvidenceFromInvestigationResult
>(removeEvidenceFromInvestigationIR);

/** 'SearchEvidenceFull' parameters type */
export interface ISearchEvidenceFullParams {
  endDate?: DateOrString | null | void;
  evidenceType?: string | null | void;
  limit: NumberOrString;
  offset: NumberOrString;
  query: string;
  redFlagMin?: number | null | void;
  startDate?: DateOrString | null | void;
}

/** 'SearchEvidenceFull' return type */
export interface ISearchEvidenceFullResult {
  createdAt: Date | null;
  evidenceTags: string | null;
  evidenceType: string | null;
  id: string;
  redFlagRating: number | null;
  snippet: string | null;
  title: string | null;
}

/** 'SearchEvidenceFull' query type */
export interface ISearchEvidenceFullQuery {
  params: ISearchEvidenceFullParams;
  result: ISearchEvidenceFullResult;
}

const searchEvidenceFullIR: any = {
  usedParamSet: {
    query: true,
    evidenceType: true,
    redFlagMin: true,
    startDate: true,
    endDate: true,
    limit: true,
    offset: true,
  },
  params: [
    {
      name: 'query',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 287, b: 293 },
        { a: 358, b: 363 },
        { a: 430, b: 435 },
      ],
    },
    {
      name: 'evidenceType',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 446, b: 458 },
        { a: 495, b: 507 },
      ],
    },
    {
      name: 'redFlagMin',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 517, b: 527 },
        { a: 566, b: 576 },
      ],
    },
    {
      name: 'startDate',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 586, b: 595 },
        { a: 637, b: 646 },
      ],
    },
    {
      name: 'endDate',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 656, b: 663 },
        { a: 705, b: 712 },
      ],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 748, b: 754 }] },
    { name: 'offset', required: true, transform: { type: 'scalar' }, locs: [{ a: 763, b: 770 }] },
  ],
  statement:
    "SELECT DISTINCT\n  d.id,\n  d.title,\n  d.evidence_type as \"evidenceType\",\n  d.red_flag_rating as \"redFlagRating\",\n  d.created_at as \"createdAt\",\n  COALESCE(d.metadata_json->>'tags', '[]') as \"evidenceTags\",\n  ts_headline('english', COALESCE(d.content, ''), websearch_to_tsquery('english', :query!), 'MaxWords=25,MinWords=8') as snippet\nFROM documents d\nWHERE (:query::text IS NULL OR d.fts_vector @@ websearch_to_tsquery('english', :query))\n  AND (:evidenceType::text IS NULL OR d.evidence_type = :evidenceType)\n  AND (:redFlagMin::int IS NULL OR d.red_flag_rating >= :redFlagMin)\n  AND (:startDate::timestamptz IS NULL OR d.created_at >= :startDate)\n  AND (:endDate::timestamptz IS NULL OR d.created_at <= :endDate)\nORDER BY d.created_at DESC\nLIMIT :limit! OFFSET :offset!",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT DISTINCT
 *   d.id,
 *   d.title,
 *   d.evidence_type as "evidenceType",
 *   d.red_flag_rating as "redFlagRating",
 *   d.created_at as "createdAt",
 *   COALESCE(d.metadata_json->>'tags', '[]') as "evidenceTags",
 *   ts_headline('english', COALESCE(d.content, ''), websearch_to_tsquery('english', :query!), 'MaxWords=25,MinWords=8') as snippet
 * FROM documents d
 * WHERE (:query::text IS NULL OR d.fts_vector @@ websearch_to_tsquery('english', :query))
 *   AND (:evidenceType::text IS NULL OR d.evidence_type = :evidenceType)
 *   AND (:redFlagMin::int IS NULL OR d.red_flag_rating >= :redFlagMin)
 *   AND (:startDate::timestamptz IS NULL OR d.created_at >= :startDate)
 *   AND (:endDate::timestamptz IS NULL OR d.created_at <= :endDate)
 * ORDER BY d.created_at DESC
 * LIMIT :limit! OFFSET :offset!
 * ```
 */
export const searchEvidenceFull = new PreparedQuery<
  ISearchEvidenceFullParams,
  ISearchEvidenceFullResult
>(searchEvidenceFullIR);

/** 'CountSearchEvidence' parameters type */
export interface ICountSearchEvidenceParams {
  endDate?: DateOrString | null | void;
  evidenceType?: string | null | void;
  query?: string | null | void;
  redFlagMin?: number | null | void;
  startDate?: DateOrString | null | void;
}

/** 'CountSearchEvidence' return type */
export interface ICountSearchEvidenceResult {
  total: string | null;
}

/** 'CountSearchEvidence' query type */
export interface ICountSearchEvidenceQuery {
  params: ICountSearchEvidenceParams;
  result: ICountSearchEvidenceResult;
}

const countSearchEvidenceIR: any = {
  usedParamSet: {
    query: true,
    evidenceType: true,
    redFlagMin: true,
    startDate: true,
    endDate: true,
  },
  params: [
    {
      name: 'query',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 61, b: 66 },
        { a: 133, b: 138 },
      ],
    },
    {
      name: 'evidenceType',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 149, b: 161 },
        { a: 198, b: 210 },
      ],
    },
    {
      name: 'redFlagMin',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 220, b: 230 },
        { a: 269, b: 279 },
      ],
    },
    {
      name: 'startDate',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 289, b: 298 },
        { a: 340, b: 349 },
      ],
    },
    {
      name: 'endDate',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 359, b: 366 },
        { a: 408, b: 415 },
      ],
    },
  ],
  statement:
    "SELECT COUNT(DISTINCT d.id) as total\nFROM documents d\nWHERE (:query::text IS NULL OR d.fts_vector @@ websearch_to_tsquery('english', :query))\n  AND (:evidenceType::text IS NULL OR d.evidence_type = :evidenceType)\n  AND (:redFlagMin::int IS NULL OR d.red_flag_rating >= :redFlagMin)\n  AND (:startDate::timestamptz IS NULL OR d.created_at >= :startDate)\n  AND (:endDate::timestamptz IS NULL OR d.created_at <= :endDate)",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT COUNT(DISTINCT d.id) as total
 * FROM documents d
 * WHERE (:query::text IS NULL OR d.fts_vector @@ websearch_to_tsquery('english', :query))
 *   AND (:evidenceType::text IS NULL OR d.evidence_type = :evidenceType)
 *   AND (:redFlagMin::int IS NULL OR d.red_flag_rating >= :redFlagMin)
 *   AND (:startDate::timestamptz IS NULL OR d.created_at >= :startDate)
 *   AND (:endDate::timestamptz IS NULL OR d.created_at <= :endDate)
 * ```
 */
export const countSearchEvidence = new PreparedQuery<
  ICountSearchEvidenceParams,
  ICountSearchEvidenceResult
>(countSearchEvidenceIR);

/** 'GetEvidenceByIdDetailed' parameters type */
export interface IGetEvidenceByIdDetailedParams {
  id: NumberOrString;
}

/** 'GetEvidenceByIdDetailed' return type */
export interface IGetEvidenceByIdDetailedResult {
  cleanedPath: string | null;
  createdAt: Date | null;
  description: string | null;
  evidenceTags: string | null;
  evidenceType: string | null;
  extractedText: string | null;
  fileSize: string | null;
  id: string;
  metadataJson: Json | null;
  modifiedAt: Date | null;
  originalFilename: string | null;
  redFlagRating: number | null;
  sourcePath: string | null;
  title: string | null;
  wordCount: number | null;
}

/** 'GetEvidenceByIdDetailed' query type */
export interface IGetEvidenceByIdDetailedQuery {
  params: IGetEvidenceByIdDetailedParams;
  result: IGetEvidenceByIdDetailedResult;
}

const getEvidenceByIdDetailedIR: any = {
  usedParamSet: { id: true },
  params: [
    { name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 562, b: 565 }] },
  ],
  statement:
    'SELECT \n  d.id,\n  d.evidence_type as "evidenceType",\n  d.title,\n  COALESCE(d.content_preview, LEFT(d.content, 320)) as description,\n  d.file_name as "originalFilename",\n  d.file_path as "sourcePath",\n  d.file_path as "cleanedPath",\n  d.content as "extractedText",\n  d.created_at as "createdAt",\n  d.last_processed_at as "modifiedAt",\n  d.red_flag_rating as "redFlagRating",\n  COALESCE(d.metadata_json->>\'tags\', \'[]\') as "evidenceTags",\n  d.metadata_json as "metadataJson",\n  d.word_count as "wordCount",\n  d.file_size as "fileSize"\nFROM documents d\nWHERE d.id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   d.id,
 *   d.evidence_type as "evidenceType",
 *   d.title,
 *   COALESCE(d.content_preview, LEFT(d.content, 320)) as description,
 *   d.file_name as "originalFilename",
 *   d.file_path as "sourcePath",
 *   d.file_path as "cleanedPath",
 *   d.content as "extractedText",
 *   d.created_at as "createdAt",
 *   d.last_processed_at as "modifiedAt",
 *   d.red_flag_rating as "redFlagRating",
 *   COALESCE(d.metadata_json->>'tags', '[]') as "evidenceTags",
 *   d.metadata_json as "metadataJson",
 *   d.word_count as "wordCount",
 *   d.file_size as "fileSize"
 * FROM documents d
 * WHERE d.id = :id!
 * ```
 */
export const getEvidenceByIdDetailed = new PreparedQuery<
  IGetEvidenceByIdDetailedParams,
  IGetEvidenceByIdDetailedResult
>(getEvidenceByIdDetailedIR);

/** 'GetEvidenceEntities' parameters type */
export interface IGetEvidenceEntitiesParams {
  evidenceId: NumberOrString;
}

/** 'GetEvidenceEntities' return type */
export interface IGetEvidenceEntitiesResult {
  category: string | null;
  confidence: number | null;
  contextSnippet: string | null;
  id: string;
  name: string;
  role: string | null;
}

/** 'GetEvidenceEntities' query type */
export interface IGetEvidenceEntitiesQuery {
  params: IGetEvidenceEntitiesParams;
  result: IGetEvidenceEntitiesResult;
}

const getEvidenceEntitiesIR: any = {
  usedParamSet: { evidenceId: true },
  params: [
    {
      name: 'evidenceId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 348, b: 359 }],
    },
  ],
  statement:
    'SELECT \n  ent.id,\n  ent.full_name as name,\n  ent.primary_role as category,\n  \'mentioned\' as role,\n  MAX(em.confidence) as confidence,\n  MAX(em.mention_context) as "contextSnippet"\nFROM investigation_evidence ie\nINNER JOIN entity_mentions em ON em.document_id = ie.document_id\nINNER JOIN entities ent ON ent.id = em.entity_id\nWHERE ie.document_id = :evidenceId!\nGROUP BY ent.id, ent.full_name, ent.primary_role',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   ent.id,
 *   ent.full_name as name,
 *   ent.primary_role as category,
 *   'mentioned' as role,
 *   MAX(em.confidence) as confidence,
 *   MAX(em.mention_context) as "contextSnippet"
 * FROM investigation_evidence ie
 * INNER JOIN entity_mentions em ON em.document_id = ie.document_id
 * INNER JOIN entities ent ON ent.id = em.entity_id
 * WHERE ie.document_id = :evidenceId!
 * GROUP BY ent.id, ent.full_name, ent.primary_role
 * ```
 */
export const getEvidenceEntities = new PreparedQuery<
  IGetEvidenceEntitiesParams,
  IGetEvidenceEntitiesResult
>(getEvidenceEntitiesIR);

/** 'GetEvidenceTypesCounts' parameters type */
export type IGetEvidenceTypesCountsParams = void;

/** 'GetEvidenceTypesCounts' return type */
export interface IGetEvidenceTypesCountsResult {
  count: number | null;
  type: string | null;
}

/** 'GetEvidenceTypesCounts' query type */
export interface IGetEvidenceTypesCountsQuery {
  params: IGetEvidenceTypesCountsParams;
  result: IGetEvidenceTypesCountsResult;
}

const getEvidenceTypesCountsIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    'SELECT \n  evidence_type as type,\n  COUNT(*)::integer as count\nFROM documents\nWHERE evidence_type IS NOT NULL\nGROUP BY evidence_type\nORDER BY count DESC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   evidence_type as type,
 *   COUNT(*)::integer as count
 * FROM documents
 * WHERE evidence_type IS NOT NULL
 * GROUP BY evidence_type
 * ORDER BY count DESC
 * ```
 */
export const getEvidenceTypesCounts = new PreparedQuery<
  IGetEvidenceTypesCountsParams,
  IGetEvidenceTypesCountsResult
>(getEvidenceTypesCountsIR);

/** 'GetDocumentDetailsForEvidence' parameters type */
export interface IGetDocumentDetailsForEvidenceParams {
  id: NumberOrString;
}

/** 'GetDocumentDetailsForEvidence' return type */
export interface IGetDocumentDetailsForEvidenceResult {
  evidence_type: string | null;
  file_name: string | null;
  file_path: string | null;
  id: string;
  red_flag_rating: number | null;
}

/** 'GetDocumentDetailsForEvidence' query type */
export interface IGetDocumentDetailsForEvidenceQuery {
  params: IGetDocumentDetailsForEvidenceParams;
  result: IGetDocumentDetailsForEvidenceResult;
}

const getDocumentDetailsForEvidenceIR: any = {
  usedParamSet: { id: true },
  params: [{ name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 90, b: 93 }] }],
  statement:
    'SELECT id, file_path, file_name, evidence_type, red_flag_rating\nFROM documents\nWHERE id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, file_path, file_name, evidence_type, red_flag_rating
 * FROM documents
 * WHERE id = :id!
 * ```
 */
export const getDocumentDetailsForEvidence = new PreparedQuery<
  IGetDocumentDetailsForEvidenceParams,
  IGetDocumentDetailsForEvidenceResult
>(getDocumentDetailsForEvidenceIR);

/** 'GetMediaItemForEvidence' parameters type */
export interface IGetMediaItemForEvidenceParams {
  id: string;
}

/** 'GetMediaItemForEvidence' return type */
export interface IGetMediaItemForEvidenceResult {
  createdAt: Date | null;
  description: string | null;
  filePath: string;
  fileType: string | null;
  id: string;
  metadataJson: Json | null;
  redFlagRating: number | null;
  title: string | null;
}

/** 'GetMediaItemForEvidence' query type */
export interface IGetMediaItemForEvidenceQuery {
  params: IGetMediaItemForEvidenceParams;
  result: IGetMediaItemForEvidenceResult;
}

const getMediaItemForEvidenceIR: any = {
  usedParamSet: { id: true },
  params: [
    { name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 221, b: 224 }] },
  ],
  statement:
    'SELECT \n  id,\n  file_path as "filePath",\n  file_type as "fileType",\n  title,\n  description,\n  red_flag_rating as "redFlagRating",\n  metadata_json as "metadataJson",\n  created_at as "createdAt"\nFROM media_items\nWHERE id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   id,
 *   file_path as "filePath",
 *   file_type as "fileType",
 *   title,
 *   description,
 *   red_flag_rating as "redFlagRating",
 *   metadata_json as "metadataJson",
 *   created_at as "createdAt"
 * FROM media_items
 * WHERE id = :id!
 * ```
 */
export const getMediaItemForEvidence = new PreparedQuery<
  IGetMediaItemForEvidenceParams,
  IGetMediaItemForEvidenceResult
>(getMediaItemForEvidenceIR);

/** 'GetMediaItemTags' parameters type */
export interface IGetMediaItemTagsParams {
  mediaItemId: string;
}

/** 'GetMediaItemTags' return type */
export interface IGetMediaItemTagsResult {
  name: string;
}

/** 'GetMediaItemTags' query type */
export interface IGetMediaItemTagsQuery {
  params: IGetMediaItemTagsParams;
  result: IGetMediaItemTagsResult;
}

const getMediaItemTagsIR: any = {
  usedParamSet: { mediaItemId: true },
  params: [
    {
      name: 'mediaItemId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 110, b: 122 }],
    },
  ],
  statement:
    'SELECT t.name \nFROM media_item_tags mt \nINNER JOIN media_tags t ON t.id = mt.tag_id \nWHERE mt.media_item_id = :mediaItemId!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT t.name
 * FROM media_item_tags mt
 * INNER JOIN media_tags t ON t.id = mt.tag_id
 * WHERE mt.media_item_id = :mediaItemId!
 * ```
 */
export const getMediaItemTags = new PreparedQuery<IGetMediaItemTagsParams, IGetMediaItemTagsResult>(
  getMediaItemTagsIR,
);

/** 'GetMediaItemPeople' parameters type */
export interface IGetMediaItemPeopleParams {
  mediaItemId: NumberOrString;
}

/** 'GetMediaItemPeople' return type */
export interface IGetMediaItemPeopleResult {
  entity_id: string;
  role: string | null;
}

/** 'GetMediaItemPeople' query type */
export interface IGetMediaItemPeopleQuery {
  params: IGetMediaItemPeopleParams;
  result: IGetMediaItemPeopleResult;
}

const getMediaItemPeopleIR: any = {
  usedParamSet: { mediaItemId: true },
  params: [
    {
      name: 'mediaItemId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 70, b: 82 }],
    },
  ],
  statement:
    'SELECT entity_id, role \nFROM media_item_people \nWHERE media_item_id = :mediaItemId!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT entity_id, role
 * FROM media_item_people
 * WHERE media_item_id = :mediaItemId!
 * ```
 */
export const getMediaItemPeople = new PreparedQuery<
  IGetMediaItemPeopleParams,
  IGetMediaItemPeopleResult
>(getMediaItemPeopleIR);
