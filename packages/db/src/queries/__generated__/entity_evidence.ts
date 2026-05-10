/** Types generated for queries found in "src/queries/entity_evidence.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

/** 'GetEntityMentionDetails' parameters type */
export interface IGetEntityMentionDetailsParams {
  entityId: NumberOrString;
}

/** 'GetEntityMentionDetails' return type */
export interface IGetEntityMentionDetailsResult {
  entity_category: string | null;
  full_name: string;
  id: string;
  primary_role: string | null;
  red_flag_rating: number | null;
  risk_level: string | null;
}

/** 'GetEntityMentionDetails' query type */
export interface IGetEntityMentionDetailsQuery {
  params: IGetEntityMentionDetailsParams;
  result: IGetEntityMentionDetailsResult;
}

const getEntityMentionDetailsIR: any = {
  usedParamSet: { entityId: true },
  params: [
    { name: 'entityId', required: true, transform: { type: 'scalar' }, locs: [{ a: 106, b: 115 }] },
  ],
  statement:
    'SELECT id, full_name, primary_role, entity_category, risk_level, red_flag_rating\nFROM entities\nWHERE id = :entityId!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, full_name, primary_role, entity_category, risk_level, red_flag_rating
 * FROM entities
 * WHERE id = :entityId!
 * ```
 */
export const getEntityMentionDetails = new PreparedQuery<
  IGetEntityMentionDetailsParams,
  IGetEntityMentionDetailsResult
>(getEntityMentionDetailsIR);

/** 'GetMentionDerivedEvidence' parameters type */
export interface IGetMentionDerivedEvidenceParams {
  entityId: NumberOrString;
  limit: NumberOrString;
}

/** 'GetMentionDerivedEvidence' return type */
export interface IGetMentionDerivedEvidenceResult {
  date_created: Date | null;
  document_id: string | null;
  document_title: string | null;
  evidence_id: string;
  evidence_type: string | null;
  file_path: string | null;
  flag_type: string | null;
  mention_context: string | null;
  mention_id: string;
  red_flag_rating: number | null;
  score: number | null;
  severity: string | null;
}

/** 'GetMentionDerivedEvidence' query type */
export interface IGetMentionDerivedEvidenceQuery {
  params: IGetMentionDerivedEvidenceParams;
  result: IGetMentionDerivedEvidenceResult;
}

const getMentionDerivedEvidenceIR: any = {
  usedParamSet: { entityId: true, limit: true },
  params: [
    { name: 'entityId', required: true, transform: { type: 'scalar' }, locs: [{ a: 422, b: 431 }] },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 480, b: 486 }] },
  ],
  statement:
    "SELECT\n  em.id as evidence_id,\n  em.document_id,\n  em.mention_context,\n  em.confidence as score,\n  em.id as mention_id,\n  d.title AS document_title,\n  d.file_path,\n  d.evidence_type,\n  d.red_flag_rating,\n  d.date_created,\n  q.flag_type,\n  q.severity\nFROM entity_mentions em\nJOIN documents d ON d.id = em.document_id\nLEFT JOIN quality_flags q ON q.target_type = 'mention' AND q.target_id = em.id::text\nWHERE em.entity_id = :entityId!\nORDER BY d.date_created DESC, em.id DESC\nLIMIT :limit!",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   em.id as evidence_id,
 *   em.document_id,
 *   em.mention_context,
 *   em.confidence as score,
 *   em.id as mention_id,
 *   d.title AS document_title,
 *   d.file_path,
 *   d.evidence_type,
 *   d.red_flag_rating,
 *   d.date_created,
 *   q.flag_type,
 *   q.severity
 * FROM entity_mentions em
 * JOIN documents d ON d.id = em.document_id
 * LEFT JOIN quality_flags q ON q.target_type = 'mention' AND q.target_id = em.id::text
 * WHERE em.entity_id = :entityId!
 * ORDER BY d.date_created DESC, em.id DESC
 * LIMIT :limit!
 * ```
 */
export const getMentionDerivedEvidence = new PreparedQuery<
  IGetMentionDerivedEvidenceParams,
  IGetMentionDerivedEvidenceResult
>(getMentionDerivedEvidenceIR);

/** 'GetRelatedEntitiesByRelations' parameters type */
export interface IGetRelatedEntitiesByRelationsParams {
  entityId?: NumberOrString | null | void;
  limit: NumberOrString;
}

/** 'GetRelatedEntitiesByRelations' return type */
export interface IGetRelatedEntitiesByRelationsResult {
  entity_category: string | null;
  full_name: string;
  id: string;
  shared_evidence_count: number | null;
}

/** 'GetRelatedEntitiesByRelations' query type */
export interface IGetRelatedEntitiesByRelationsQuery {
  params: IGetRelatedEntitiesByRelationsParams;
  result: IGetRelatedEntitiesByRelationsResult;
}

const getRelatedEntitiesByRelationsIR: any = {
  usedParamSet: { entityId: true, limit: true },
  params: [
    {
      name: 'entityId',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 241, b: 249 },
        { a: 339, b: 347 },
        { a: 374, b: 382 },
      ],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 484, b: 490 }] },
  ],
  statement:
    'SELECT\n  other.id,\n  other.full_name,\n  other.entity_category,\n  SUM(COALESCE(er.strength, er.proximity_score, 1)) as shared_evidence_count\nFROM entity_relationships er\nJOIN entities other ON\n  other.id = CASE\n    WHEN er.source_entity_id = :entityId THEN er.target_entity_id\n    ELSE er.source_entity_id\n  END\nWHERE er.source_entity_id = :entityId OR er.target_entity_id = :entityId\nGROUP BY other.id, other.full_name, other.entity_category\nORDER BY shared_evidence_count DESC\nLIMIT :limit!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   other.id,
 *   other.full_name,
 *   other.entity_category,
 *   SUM(COALESCE(er.strength, er.proximity_score, 1)) as shared_evidence_count
 * FROM entity_relationships er
 * JOIN entities other ON
 *   other.id = CASE
 *     WHEN er.source_entity_id = :entityId THEN er.target_entity_id
 *     ELSE er.source_entity_id
 *   END
 * WHERE er.source_entity_id = :entityId OR er.target_entity_id = :entityId
 * GROUP BY other.id, other.full_name, other.entity_category
 * ORDER BY shared_evidence_count DESC
 * LIMIT :limit!
 * ```
 */
export const getRelatedEntitiesByRelations = new PreparedQuery<
  IGetRelatedEntitiesByRelationsParams,
  IGetRelatedEntitiesByRelationsResult
>(getRelatedEntitiesByRelationsIR);

/** 'GetRelationEvidenceForEntity' parameters type */
export interface IGetRelationEvidenceForEntityParams {
  entityId: NumberOrString;
}

/** 'GetRelationEvidenceForEntity' return type */
export interface IGetRelationEvidenceForEntityResult {
  confidence: number | null;
  direction: string | null;
  document_id: string | null;
  document_path: string | null;
  document_title: string | null;
  first_seen_at: Date | null;
  last_seen_at: Date | null;
  mention_ids: string | null;
  object_entity_id: string;
  predicate: string;
  quote_text: string | null;
  relation_evidence_id: string;
  relation_id: string | null;
  span_id: string | null;
  subject_entity_id: string;
  weight: number | null;
}

/** 'GetRelationEvidenceForEntity' query type */
export interface IGetRelationEvidenceForEntityQuery {
  params: IGetRelationEvidenceForEntityParams;
  result: IGetRelationEvidenceForEntityResult;
}

const getRelationEvidenceForEntityIR: any = {
  usedParamSet: { entityId: true },
  params: [
    {
      name: 'entityId',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 804, b: 813 },
        { a: 840, b: 849 },
      ],
    },
  ],
  statement:
    "SELECT\n  CONCAT(er.source_entity_id, ':', er.target_entity_id, ':', er.relationship_type) as relation_id,\n  er.source_entity_id as subject_entity_id,\n  er.target_entity_id as object_entity_id,\n  er.relationship_type as predicate,\n  'directed' as direction,\n  COALESCE(er.strength, er.proximity_score, 0) as weight,\n  er.first_seen_at,\n  er.last_seen_at,\n  re.id as relation_evidence_id,\n  re.document_id,\n  re.span_id,\n  re.quote_text,\n  re.confidence,\n  re.mention_ids,\n  d.title as document_title,\n  d.file_path as document_path\nFROM entity_relationships er\nJOIN relation_evidence re\n  ON re.source_entity_id = er.source_entity_id\n AND re.target_entity_id = er.target_entity_id\n AND re.relationship_type = er.relationship_type\nLEFT JOIN documents d ON d.id = re.document_id\nWHERE er.source_entity_id = :entityId! OR er.target_entity_id = :entityId!\nORDER BY weight DESC, re.confidence DESC",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   CONCAT(er.source_entity_id, ':', er.target_entity_id, ':', er.relationship_type) as relation_id,
 *   er.source_entity_id as subject_entity_id,
 *   er.target_entity_id as object_entity_id,
 *   er.relationship_type as predicate,
 *   'directed' as direction,
 *   COALESCE(er.strength, er.proximity_score, 0) as weight,
 *   er.first_seen_at,
 *   er.last_seen_at,
 *   re.id as relation_evidence_id,
 *   re.document_id,
 *   re.span_id,
 *   re.quote_text,
 *   re.confidence,
 *   re.mention_ids,
 *   d.title as document_title,
 *   d.file_path as document_path
 * FROM entity_relationships er
 * JOIN relation_evidence re
 *   ON re.source_entity_id = er.source_entity_id
 *  AND re.target_entity_id = er.target_entity_id
 *  AND re.relationship_type = er.relationship_type
 * LEFT JOIN documents d ON d.id = re.document_id
 * WHERE er.source_entity_id = :entityId! OR er.target_entity_id = :entityId!
 * ORDER BY weight DESC, re.confidence DESC
 * ```
 */
export const getRelationEvidenceForEntity = new PreparedQuery<
  IGetRelationEvidenceForEntityParams,
  IGetRelationEvidenceForEntityResult
>(getRelationEvidenceForEntityIR);
