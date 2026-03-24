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
  role: string;
  sourcePath: string | null;
  title: string;
}

/** 'GetEntityEvidence' query type */
export interface IGetEntityEvidenceQuery {
  params: IGetEntityEvidenceParams;
  result: IGetEntityEvidenceResult;
}

const getEntityEvidenceIR: any = {
  usedParamSet: { entityId: true, limit: true, offset: true },
  params: [
    { name: 'entityId', required: true, transform: { type: 'scalar' }, locs: [{ a: 381, b: 390 }] },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 425, b: 431 }] },
    { name: 'offset', required: true, transform: { type: 'scalar' }, locs: [{ a: 440, b: 447 }] },
  ],
  statement:
    'SELECT \n  e.id,\n  e.evidence_type as "evidenceType",\n  e.title,\n  e.description,\n  e.source_path as "sourcePath",\n  e.cleaned_path as "cleanedPath",\n  e.red_flag_rating as "redFlagRating",\n  e.created_at as "createdAt",\n  ee.role,\n  ee.confidence,\n  ee.mention_context as "mentionContext"\nFROM evidence e\nINNER JOIN evidence_entity ee ON ee.evidence_id = e.id\nWHERE ee.entity_id = :entityId!\nORDER BY e.created_at DESC\nLIMIT :limit! OFFSET :offset!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   e.id,
 *   e.evidence_type as "evidenceType",
 *   e.title,
 *   e.description,
 *   e.source_path as "sourcePath",
 *   e.cleaned_path as "cleanedPath",
 *   e.red_flag_rating as "redFlagRating",
 *   e.created_at as "createdAt",
 *   ee.role,
 *   ee.confidence,
 *   ee.mention_context as "mentionContext"
 * FROM evidence e
 * INNER JOIN evidence_entity ee ON ee.evidence_id = e.id
 * WHERE ee.entity_id = :entityId!
 * ORDER BY e.created_at DESC
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
  total: string | null;
}

/** 'CountEntityEvidence' query type */
export interface ICountEntityEvidenceQuery {
  params: ICountEntityEvidenceParams;
  result: ICountEntityEvidenceResult;
}

const countEntityEvidenceIR: any = {
  usedParamSet: { entityId: true },
  params: [
    { name: 'entityId', required: true, transform: { type: 'scalar' }, locs: [{ a: 117, b: 126 }] },
  ],
  statement:
    'SELECT COUNT(*) as total\nFROM evidence e\nINNER JOIN evidence_entity ee ON ee.evidence_id = e.id\nWHERE ee.entity_id = :entityId!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT COUNT(*) as total
 * FROM evidence e
 * INNER JOIN evidence_entity ee ON ee.evidence_id = e.id
 * WHERE ee.entity_id = :entityId!
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
  count: string | null;
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
    { name: 'entityId', required: true, transform: { type: 'scalar' }, locs: [{ a: 157, b: 166 }] },
  ],
  statement:
    'SELECT \n  e.evidence_type as "evidenceType",\n  COUNT(*) as count\nFROM evidence e\nINNER JOIN evidence_entity ee ON ee.evidence_id = e.id\nWHERE ee.entity_id = :entityId!\nGROUP BY e.evidence_type\nORDER BY count DESC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   e.evidence_type as "evidenceType",
 *   COUNT(*) as count
 * FROM evidence e
 * INNER JOIN evidence_entity ee ON ee.evidence_id = e.id
 * WHERE ee.entity_id = :entityId!
 * GROUP BY e.evidence_type
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
  count: string | null;
  role: string;
}

/** 'GetRoleBreakdownByEntity' query type */
export interface IGetRoleBreakdownByEntityQuery {
  params: IGetRoleBreakdownByEntityParams;
  result: IGetRoleBreakdownByEntityResult;
}

const getRoleBreakdownByEntityIR: any = {
  usedParamSet: { entityId: true },
  params: [
    { name: 'entityId', required: true, transform: { type: 'scalar' }, locs: [{ a: 84, b: 93 }] },
  ],
  statement:
    'SELECT \n  ee.role,\n  COUNT(*) as count\nFROM evidence_entity ee\nWHERE ee.entity_id = :entityId!\nGROUP BY ee.role\nORDER BY count DESC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   ee.role,
 *   COUNT(*) as count
 * FROM evidence_entity ee
 * WHERE ee.entity_id = :entityId!
 * GROUP BY ee.role
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
  count: string | null;
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
    { name: 'entityId', required: true, transform: { type: 'scalar' }, locs: [{ a: 141, b: 150 }] },
  ],
  statement:
    'SELECT \n  e.red_flag_rating,\n  COUNT(*) as count\nFROM evidence e\nINNER JOIN evidence_entity ee ON ee.evidence_id = e.id\nWHERE ee.entity_id = :entityId! AND e.red_flag_rating IS NOT NULL\nGROUP BY e.red_flag_rating\nORDER BY e.red_flag_rating DESC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   e.red_flag_rating,
 *   COUNT(*) as count
 * FROM evidence e
 * INNER JOIN evidence_entity ee ON ee.evidence_id = e.id
 * WHERE ee.entity_id = :entityId! AND e.red_flag_rating IS NOT NULL
 * GROUP BY e.red_flag_rating
 * ORDER BY e.red_flag_rating DESC
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
  sharedEvidenceCount: string | null;
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
        { a: 316, b: 325 },
        { a: 348, b: 357 },
      ],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 453, b: 459 }] },
  ],
  statement:
    'SELECT \n  ent.id,\n  ent.full_name as "fullName",\n  ent.entity_category as "entityCategory",\n  COUNT(DISTINCT ee1.evidence_id) as "sharedEvidenceCount"\nFROM evidence_entity ee1\nINNER JOIN evidence_entity ee2 ON ee1.evidence_id = ee2.evidence_id\nINNER JOIN entities ent ON ent.id = ee2.entity_id\nWHERE ee1.entity_id = :entityId! AND ee2.entity_id != :entityId!\nGROUP BY ent.id, ent.full_name, ent.entity_category\nORDER BY "sharedEvidenceCount" DESC\nLIMIT :limit!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   ent.id,
 *   ent.full_name as "fullName",
 *   ent.entity_category as "entityCategory",
 *   COUNT(DISTINCT ee1.evidence_id) as "sharedEvidenceCount"
 * FROM evidence_entity ee1
 * INNER JOIN evidence_entity ee2 ON ee1.evidence_id = ee2.evidence_id
 * INNER JOIN entities ent ON ent.id = ee2.entity_id
 * WHERE ee1.entity_id = :entityId! AND ee2.entity_id != :entityId!
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
  evidenceTags?: string | null | void;
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
    evidenceTags: true,
    metadata: true,
  },
  params: [
    {
      name: 'evidenceType',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 212, b: 225 }],
    },
    {
      name: 'sourcePath',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 231, b: 242 }],
    },
    {
      name: 'originalFilename',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 248, b: 265 }],
    },
    { name: 'title', required: true, transform: { type: 'scalar' }, locs: [{ a: 271, b: 277 }] },
    {
      name: 'description',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 283, b: 294 }],
    },
    {
      name: 'extractedText',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 300, b: 313 }],
    },
    {
      name: 'redFlagRating',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 319, b: 333 }],
    },
    {
      name: 'evidenceTags',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 339, b: 351 }],
    },
    {
      name: 'metadata',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 357, b: 365 }],
    },
  ],
  statement:
    'INSERT INTO evidence (\n  evidence_type,\n  source_path,\n  original_filename,\n  title,\n  description,\n  extracted_text,\n  red_flag_rating,\n  evidence_tags,\n  metadata_json,\n  created_at,\n  ingested_at\n) VALUES (\n  :evidenceType!, \n  :sourcePath!, \n  :originalFilename!, \n  :title!, \n  :description, \n  :extractedText, \n  :redFlagRating!, \n  :evidenceTags, \n  :metadata, \n  CURRENT_TIMESTAMP, \n  CURRENT_TIMESTAMP\n)\nRETURNING id',
};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO evidence (
 *   evidence_type,
 *   source_path,
 *   original_filename,
 *   title,
 *   description,
 *   extracted_text,
 *   red_flag_rating,
 *   evidence_tags,
 *   metadata_json,
 *   created_at,
 *   ingested_at
 * ) VALUES (
 *   :evidenceType!,
 *   :sourcePath!,
 *   :originalFilename!,
 *   :title!,
 *   :description,
 *   :extractedText,
 *   :redFlagRating!,
 *   :evidenceTags,
 *   :metadata,
 *   CURRENT_TIMESTAMP,
 *   CURRENT_TIMESTAMP
 * )
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
    'INSERT INTO investigation_evidence (\n  investigation_id,\n  evidence_id,\n  notes,\n  relevance,\n  added_at\n) VALUES (:investigationId!, :evidenceId!, :notes, :relevance, CURRENT_TIMESTAMP)\nON CONFLICT (investigation_id, evidence_id) DO UPDATE SET\n  notes = EXCLUDED.notes,\n  relevance = EXCLUDED.relevance,\n  added_at = CURRENT_TIMESTAMP\nRETURNING id',
};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO investigation_evidence (
 *   investigation_id,
 *   evidence_id,
 *   notes,
 *   relevance,
 *   added_at
 * ) VALUES (:investigationId!, :evidenceId!, :notes, :relevance, CURRENT_TIMESTAMP)
 * ON CONFLICT (investigation_id, evidence_id) DO UPDATE SET
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
  originalFilePath: string | null;
  redFlagRating: number | null;
  relevance: string | null;
  source: string | null;
  title: string;
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
      locs: [{ a: 423, b: 439 }],
    },
  ],
  statement:
    'SELECT \n  e.id,\n  e.evidence_type as "evidenceType",\n  e.title,\n  e.description,\n  e.red_flag_rating as "redFlagRating",\n  e.created_at as "createdAt",\n  e.source_path as "source",\n  e.cleaned_path as "cleanedPath",\n  e.original_file_path as "originalFilePath",\n  ie.notes,\n  ie.relevance,\n  ie.added_at as "addedAt"\nFROM investigation_evidence ie\nINNER JOIN evidence e ON e.id = ie.evidence_id\nWHERE ie.investigation_id = :investigationId!\nORDER BY ie.added_at DESC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   e.id,
 *   e.evidence_type as "evidenceType",
 *   e.title,
 *   e.description,
 *   e.red_flag_rating as "redFlagRating",
 *   e.created_at as "createdAt",
 *   e.source_path as "source",
 *   e.cleaned_path as "cleanedPath",
 *   e.original_file_path as "originalFilePath",
 *   ie.notes,
 *   ie.relevance,
 *   ie.added_at as "addedAt"
 * FROM investigation_evidence ie
 * INNER JOIN evidence e ON e.id = ie.evidence_id
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
  evidenceCount: string | null;
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
      locs: [{ a: 317, b: 333 }],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 423, b: 429 }] },
  ],
  statement:
    'SELECT \n  ent.id,\n  ent.full_name as "fullName",\n  ent.entity_category as "entityCategory",\n  COUNT(DISTINCT ee.evidence_id) as "evidenceCount"\nFROM investigation_evidence ie\nINNER JOIN evidence_entity ee ON ee.evidence_id = ie.evidence_id\nINNER JOIN entities ent ON ent.id = ee.entity_id\nWHERE ie.investigation_id = :investigationId!\nGROUP BY ent.id, ent.full_name, ent.entity_category\nORDER BY "evidenceCount" DESC\nLIMIT :limit!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   ent.id,
 *   ent.full_name as "fullName",
 *   ent.entity_category as "entityCategory",
 *   COUNT(DISTINCT ee.evidence_id) as "evidenceCount"
 * FROM investigation_evidence ie
 * INNER JOIN evidence_entity ee ON ee.evidence_id = ie.evidence_id
 * INNER JOIN entities ent ON ent.id = ee.entity_id
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
  title: string;
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
        { a: 255, b: 261 },
        { a: 325, b: 330 },
        { a: 397, b: 402 },
      ],
    },
    {
      name: 'evidenceType',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 413, b: 425 },
        { a: 462, b: 474 },
      ],
    },
    {
      name: 'redFlagMin',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 484, b: 494 },
        { a: 533, b: 543 },
      ],
    },
    {
      name: 'startDate',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 553, b: 562 },
        { a: 604, b: 613 },
      ],
    },
    {
      name: 'endDate',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 623, b: 630 },
        { a: 672, b: 679 },
      ],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 715, b: 721 }] },
    { name: 'offset', required: true, transform: { type: 'scalar' }, locs: [{ a: 730, b: 737 }] },
  ],
  statement:
    'SELECT DISTINCT\n  e.id,\n  e.title,\n  e.evidence_type as "evidenceType",\n  e.red_flag_rating as "redFlagRating",\n  e.created_at as "createdAt",\n  e.evidence_tags as "evidenceTags",\n  ts_headline(\'english\', e.extracted_text, websearch_to_tsquery(\'english\', :query!), \'MaxWords=25,MinWords=8\') as snippet\nFROM evidence e\nWHERE (:query::text IS NULL OR e.fts_vector @@ websearch_to_tsquery(\'english\', :query))\n  AND (:evidenceType::text IS NULL OR e.evidence_type = :evidenceType)\n  AND (:redFlagMin::int IS NULL OR e.red_flag_rating >= :redFlagMin)\n  AND (:startDate::timestamptz IS NULL OR e.created_at >= :startDate)\n  AND (:endDate::timestamptz IS NULL OR e.created_at <= :endDate)\nORDER BY e.created_at DESC\nLIMIT :limit! OFFSET :offset!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT DISTINCT
 *   e.id,
 *   e.title,
 *   e.evidence_type as "evidenceType",
 *   e.red_flag_rating as "redFlagRating",
 *   e.created_at as "createdAt",
 *   e.evidence_tags as "evidenceTags",
 *   ts_headline('english', e.extracted_text, websearch_to_tsquery('english', :query!), 'MaxWords=25,MinWords=8') as snippet
 * FROM evidence e
 * WHERE (:query::text IS NULL OR e.fts_vector @@ websearch_to_tsquery('english', :query))
 *   AND (:evidenceType::text IS NULL OR e.evidence_type = :evidenceType)
 *   AND (:redFlagMin::int IS NULL OR e.red_flag_rating >= :redFlagMin)
 *   AND (:startDate::timestamptz IS NULL OR e.created_at >= :startDate)
 *   AND (:endDate::timestamptz IS NULL OR e.created_at <= :endDate)
 * ORDER BY e.created_at DESC
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
        { a: 60, b: 65 },
        { a: 132, b: 137 },
      ],
    },
    {
      name: 'evidenceType',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 148, b: 160 },
        { a: 197, b: 209 },
      ],
    },
    {
      name: 'redFlagMin',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 219, b: 229 },
        { a: 268, b: 278 },
      ],
    },
    {
      name: 'startDate',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 288, b: 297 },
        { a: 339, b: 348 },
      ],
    },
    {
      name: 'endDate',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 358, b: 365 },
        { a: 407, b: 414 },
      ],
    },
  ],
  statement:
    "SELECT COUNT(DISTINCT e.id) as total\nFROM evidence e\nWHERE (:query::text IS NULL OR e.fts_vector @@ websearch_to_tsquery('english', :query))\n  AND (:evidenceType::text IS NULL OR e.evidence_type = :evidenceType)\n  AND (:redFlagMin::int IS NULL OR e.red_flag_rating >= :redFlagMin)\n  AND (:startDate::timestamptz IS NULL OR e.created_at >= :startDate)\n  AND (:endDate::timestamptz IS NULL OR e.created_at <= :endDate)",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT COUNT(DISTINCT e.id) as total
 * FROM evidence e
 * WHERE (:query::text IS NULL OR e.fts_vector @@ websearch_to_tsquery('english', :query))
 *   AND (:evidenceType::text IS NULL OR e.evidence_type = :evidenceType)
 *   AND (:redFlagMin::int IS NULL OR e.red_flag_rating >= :redFlagMin)
 *   AND (:startDate::timestamptz IS NULL OR e.created_at >= :startDate)
 *   AND (:endDate::timestamptz IS NULL OR e.created_at <= :endDate)
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
  originalFilePath: string | null;
  redFlagRating: number | null;
  sourcePath: string | null;
  title: string;
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
    { name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 545, b: 548 }] },
  ],
  statement:
    'SELECT \n  e.id,\n  e.evidence_type as "evidenceType",\n  e.title,\n  e.description,\n  e.original_filename as "originalFilename",\n  e.source_path as "sourcePath",\n  e.cleaned_path as "cleanedPath",\n  e.original_file_path as "originalFilePath",\n  e.extracted_text as "extractedText",\n  e.created_at as "createdAt",\n  e.modified_at as "modifiedAt",\n  e.red_flag_rating as "redFlagRating",\n  e.evidence_tags as "evidenceTags",\n  e.metadata_json as "metadataJson",\n  e.word_count as "wordCount",\n  e.file_size as "fileSize"\nFROM evidence e\nWHERE e.id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   e.id,
 *   e.evidence_type as "evidenceType",
 *   e.title,
 *   e.description,
 *   e.original_filename as "originalFilename",
 *   e.source_path as "sourcePath",
 *   e.cleaned_path as "cleanedPath",
 *   e.original_file_path as "originalFilePath",
 *   e.extracted_text as "extractedText",
 *   e.created_at as "createdAt",
 *   e.modified_at as "modifiedAt",
 *   e.red_flag_rating as "redFlagRating",
 *   e.evidence_tags as "evidenceTags",
 *   e.metadata_json as "metadataJson",
 *   e.word_count as "wordCount",
 *   e.file_size as "fileSize"
 * FROM evidence e
 * WHERE e.id = :id!
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
  role: string;
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
      locs: [{ a: 240, b: 251 }],
    },
  ],
  statement:
    'SELECT \n  ent.id,\n  ent.full_name as name,\n  ent.primary_role as category,\n  ee.role,\n  ee.confidence,\n  ee.mention_context as "contextSnippet"\nFROM evidence_entity ee\nINNER JOIN entities ent ON ent.id = ee.entity_id\nWHERE ee.evidence_id = :evidenceId!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   ent.id,
 *   ent.full_name as name,
 *   ent.primary_role as category,
 *   ee.role,
 *   ee.confidence,
 *   ee.mention_context as "contextSnippet"
 * FROM evidence_entity ee
 * INNER JOIN entities ent ON ent.id = ee.entity_id
 * WHERE ee.evidence_id = :evidenceId!
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
  count: string | null;
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
    'SELECT \n  evidence_type as type,\n  COUNT(*) as count\nFROM evidence\nGROUP BY evidence_type\nORDER BY count DESC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   evidence_type as type,
 *   COUNT(*) as count
 * FROM evidence
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

/** 'InsertEvidenceEntity' parameters type */
export interface IInsertEvidenceEntityParams {
  confidence: number;
  entityId: NumberOrString;
  evidenceId: NumberOrString;
  mentionContext?: string | null | void;
  role: string;
}

/** 'InsertEvidenceEntity' return type */
export type IInsertEvidenceEntityResult = void;

/** 'InsertEvidenceEntity' query type */
export interface IInsertEvidenceEntityQuery {
  params: IInsertEvidenceEntityParams;
  result: IInsertEvidenceEntityResult;
}

const insertEvidenceEntityIR: any = {
  usedParamSet: {
    evidenceId: true,
    entityId: true,
    role: true,
    confidence: true,
    mentionContext: true,
  },
  params: [
    {
      name: 'evidenceId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 108, b: 119 }],
    },
    { name: 'entityId', required: true, transform: { type: 'scalar' }, locs: [{ a: 122, b: 131 }] },
    { name: 'role', required: true, transform: { type: 'scalar' }, locs: [{ a: 134, b: 139 }] },
    {
      name: 'confidence',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 142, b: 153 }],
    },
    {
      name: 'mentionContext',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 156, b: 170 }],
    },
  ],
  statement:
    'INSERT INTO evidence_entity (\n  evidence_id,\n  entity_id,\n  role,\n  confidence,\n  mention_context\n) VALUES (:evidenceId!, :entityId!, :role!, :confidence!, :mentionContext)\nON CONFLICT (evidence_id, entity_id) DO NOTHING',
};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO evidence_entity (
 *   evidence_id,
 *   entity_id,
 *   role,
 *   confidence,
 *   mention_context
 * ) VALUES (:evidenceId!, :entityId!, :role!, :confidence!, :mentionContext)
 * ON CONFLICT (evidence_id, entity_id) DO NOTHING
 * ```
 */
export const insertEvidenceEntity = new PreparedQuery<
  IInsertEvidenceEntityParams,
  IInsertEvidenceEntityResult
>(insertEvidenceEntityIR);
