/** Types generated for queries found in "src/queries/entities.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type NumberOrString = number | string;

export type stringArray = string[];

/** 'GetSubjectCards' parameters type */
export interface IGetSubjectCardsParams {
  limit: NumberOrString;
  maxRedFlag?: number | null | void;
  minRedFlag?: number | null | void;
  offset: NumberOrString;
  riskLevels?: stringArray | null | void;
  role?: string | null | void;
  searchTerm?: string | null | void;
  sortBy?: string | null | void;
}

/** 'GetSubjectCards' return type */
export interface IGetSubjectCardsResult {
  bio: string | null;
  blackBookCount: string | null;
  connections: string | null;
  faceCropPath: string | null;
  fullName: string;
  id: string;
  mediaCount: string | null;
  mentions: number | null;
  primaryRole: string | null;
  redFlagRating: number | null;
  riskLevel: string | null;
  topPhotoId: string | null;
  wasAgentic: number | null;
}

/** 'GetSubjectCards' query type */
export interface IGetSubjectCardsQuery {
  params: IGetSubjectCardsParams;
  result: IGetSubjectCardsResult;
}

const getSubjectCardsIR: any = {
  usedParamSet: {
    searchTerm: true,
    riskLevels: true,
    minRedFlag: true,
    maxRedFlag: true,
    role: true,
    sortBy: true,
    limit: true,
    offset: true,
  },
  params: [
    {
      name: 'searchTerm',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 1051, b: 1061 },
        { a: 1098, b: 1108 },
        { a: 1134, b: 1144 },
        { a: 1165, b: 1175 },
      ],
    },
    {
      name: 'riskLevels',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 1204, b: 1214 },
        { a: 1220, b: 1230 },
      ],
    },
    {
      name: 'minRedFlag',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 1269, b: 1279 },
        { a: 1284, b: 1294 },
      ],
    },
    {
      name: 'maxRedFlag',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 1333, b: 1343 },
        { a: 1348, b: 1358 },
      ],
    },
    {
      name: 'role',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 1393, b: 1397 },
        { a: 1402, b: 1406 },
      ],
    },
    {
      name: 'sortBy',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 1469, b: 1475 },
        { a: 1524, b: 1530 },
      ],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 1613, b: 1619 }] },
    { name: 'offset', required: true, transform: { type: 'scalar' }, locs: [{ a: 1628, b: 1635 }] },
  ],
  statement:
    'SELECT \n  e.id,\n  e.full_name as "fullName",\n  e.primary_role as "primaryRole",\n  e.bio,\n  e.mentions,\n  e.risk_level as "riskLevel",\n  e.red_flag_rating as "redFlagRating",\n  e.connections_summary as "connections",\n  e.was_agentic as "wasAgentic",\n  (SELECT COUNT(*) FROM entity_mentions em JOIN documents d ON d.id = em.document_id WHERE em.entity_id = e.id AND d.evidence_type = \'media\') as "mediaCount",\n  (SELECT COUNT(*) FROM black_book_entries WHERE person_id = e.id) as "blackBookCount",\n  (\n    SELECT d.id\n    FROM entity_mentions em \n    JOIN documents d ON d.id = em.document_id \n    WHERE em.entity_id = e.id\n    AND d.evidence_type = \'media\'\n    AND (d.file_type ILIKE \'image/%\' OR d.file_type IS NULL)\n    ORDER BY d.red_flag_rating DESC, d.id DESC\n    LIMIT 1\n  ) as "topPhotoId",\n  (\n    SELECT f.crop_path\n    FROM face_clusters fc\n    JOIN faces f ON fc.id = f.cluster_id\n    WHERE fc.entity_id = e.id\n    AND f.crop_path IS NOT NULL\n    ORDER BY f.detection_confidence DESC\n    LIMIT 1\n  ) as "faceCropPath"\nFROM entities e\nWHERE (:searchTerm::text IS NULL OR e.full_name ILIKE :searchTerm OR e.primary_role ILIKE :searchTerm OR e.aliases ILIKE :searchTerm)\n  AND (e.risk_level = ANY(:riskLevels) OR :riskLevels IS NULL)\n  AND (e.red_flag_rating >= :minRedFlag OR :minRedFlag IS NULL)\n  AND (e.red_flag_rating <= :maxRedFlag OR :maxRedFlag IS NULL)\n  AND (e.primary_role = :role OR :role IS NULL)\nORDER BY \n  COALESCE(e.is_vip, 0) DESC,\n  CASE WHEN :sortBy = \'name\' THEN e.full_name END ASC,\n  CASE WHEN :sortBy = \'recent\' THEN e.id END DESC,\n  e.red_flag_rating DESC,\n  e.mentions DESC\nLIMIT :limit! OFFSET :offset!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   e.id,
 *   e.full_name as "fullName",
 *   e.primary_role as "primaryRole",
 *   e.bio,
 *   e.mentions,
 *   e.risk_level as "riskLevel",
 *   e.red_flag_rating as "redFlagRating",
 *   e.connections_summary as "connections",
 *   e.was_agentic as "wasAgentic",
 *   (SELECT COUNT(*) FROM entity_mentions em JOIN documents d ON d.id = em.document_id WHERE em.entity_id = e.id AND d.evidence_type = 'media') as "mediaCount",
 *   (SELECT COUNT(*) FROM black_book_entries WHERE person_id = e.id) as "blackBookCount",
 *   (
 *     SELECT d.id
 *     FROM entity_mentions em
 *     JOIN documents d ON d.id = em.document_id
 *     WHERE em.entity_id = e.id
 *     AND d.evidence_type = 'media'
 *     AND (d.file_type ILIKE 'image/%' OR d.file_type IS NULL)
 *     ORDER BY d.red_flag_rating DESC, d.id DESC
 *     LIMIT 1
 *   ) as "topPhotoId",
 *   (
 *     SELECT f.crop_path
 *     FROM face_clusters fc
 *     JOIN faces f ON fc.id = f.cluster_id
 *     WHERE fc.entity_id = e.id
 *     AND f.crop_path IS NOT NULL
 *     ORDER BY f.detection_confidence DESC
 *     LIMIT 1
 *   ) as "faceCropPath"
 * FROM entities e
 * WHERE (:searchTerm::text IS NULL OR e.full_name ILIKE :searchTerm OR e.primary_role ILIKE :searchTerm OR e.aliases ILIKE :searchTerm)
 *   AND (e.risk_level = ANY(:riskLevels) OR :riskLevels IS NULL)
 *   AND (e.red_flag_rating >= :minRedFlag OR :minRedFlag IS NULL)
 *   AND (e.red_flag_rating <= :maxRedFlag OR :maxRedFlag IS NULL)
 *   AND (e.primary_role = :role OR :role IS NULL)
 * ORDER BY
 *   COALESCE(e.is_vip, 0) DESC,
 *   CASE WHEN :sortBy = 'name' THEN e.full_name END ASC,
 *   CASE WHEN :sortBy = 'recent' THEN e.id END DESC,
 *   e.red_flag_rating DESC,
 *   e.mentions DESC
 * LIMIT :limit! OFFSET :offset!
 * ```
 */
export const getSubjectCards = new PreparedQuery<IGetSubjectCardsParams, IGetSubjectCardsResult>(
  getSubjectCardsIR,
);

/** 'CountSubjectCards' parameters type */
export interface ICountSubjectCardsParams {
  riskLevels?: stringArray | null | void;
  searchTerm?: string | null | void;
}

/** 'CountSubjectCards' return type */
export interface ICountSubjectCardsResult {
  total: string | null;
}

/** 'CountSubjectCards' query type */
export interface ICountSubjectCardsQuery {
  params: ICountSubjectCardsParams;
  result: ICountSubjectCardsResult;
}

const countSubjectCardsIR: any = {
  usedParamSet: { searchTerm: true, riskLevels: true },
  params: [
    {
      name: 'searchTerm',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 49, b: 59 },
        { a: 96, b: 106 },
        { a: 132, b: 142 },
        { a: 163, b: 173 },
      ],
    },
    {
      name: 'riskLevels',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 202, b: 212 },
        { a: 218, b: 228 },
      ],
    },
  ],
  statement:
    'SELECT COUNT(*) as total \nFROM entities e\nWHERE (:searchTerm::text IS NULL OR e.full_name ILIKE :searchTerm OR e.primary_role ILIKE :searchTerm OR e.aliases ILIKE :searchTerm)\n  AND (e.risk_level = ANY(:riskLevels) OR :riskLevels IS NULL)',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT COUNT(*) as total
 * FROM entities e
 * WHERE (:searchTerm::text IS NULL OR e.full_name ILIKE :searchTerm OR e.primary_role ILIKE :searchTerm OR e.aliases ILIKE :searchTerm)
 *   AND (e.risk_level = ANY(:riskLevels) OR :riskLevels IS NULL)
 * ```
 */
export const countSubjectCards = new PreparedQuery<
  ICountSubjectCardsParams,
  ICountSubjectCardsResult
>(countSubjectCardsIR);

/** 'GetEntityById' parameters type */
export interface IGetEntityByIdParams {
  id: NumberOrString;
}

/** 'GetEntityById' return type */
export interface IGetEntityByIdResult {
  aliases: string | null;
  bio: string | null;
  birth_date: string | null;
  canonical_id: string | null;
  community_id: string | null;
  connections_summary: string | null;
  created_at: Date | null;
  death_date: string | null;
  entity_category: string | null;
  entity_metadata_json: Json | null;
  entity_type: string | null;
  evidence_count: number | null;
  faceCropPath: string | null;
  fts_vector: string | null;
  full_name: string;
  id: string;
  is_vip: number | null;
  junk_flag: number | null;
  junk_probability: number | null;
  junk_reason: string | null;
  junk_tier: string | null;
  location_lat: number | null;
  location_lng: number | null;
  manually_reviewed: number | null;
  mentions: number | null;
  needs_review: number | null;
  notes: string | null;
  primary_role: string | null;
  quarantine_status: number | null;
  red_flag_description: string | null;
  red_flag_rating: number | null;
  red_flag_score: number | null;
  risk_level: string | null;
  title: string | null;
  type: string | null;
  updated_at: Date | null;
  was_agentic: number | null;
}

/** 'GetEntityById' query type */
export interface IGetEntityByIdQuery {
  params: IGetEntityByIdParams;
  result: IGetEntityByIdResult;
}

const getEntityByIdIR: any = {
  usedParamSet: { id: true },
  params: [
    { name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 275, b: 278 }] },
  ],
  statement:
    'SELECT \n  e.*,\n  (\n    SELECT f.crop_path\n    FROM face_clusters fc\n    JOIN faces f ON fc.id = f.cluster_id\n    WHERE fc.entity_id = e.id\n    AND f.crop_path IS NOT NULL\n    ORDER BY f.detection_confidence DESC\n    LIMIT 1\n  ) as "faceCropPath"\nFROM entities e WHERE e.id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   e.*,
 *   (
 *     SELECT f.crop_path
 *     FROM face_clusters fc
 *     JOIN faces f ON fc.id = f.cluster_id
 *     WHERE fc.entity_id = e.id
 *     AND f.crop_path IS NOT NULL
 *     ORDER BY f.detection_confidence DESC
 *     LIMIT 1
 *   ) as "faceCropPath"
 * FROM entities e WHERE e.id = :id!
 * ```
 */
export const getEntityById = new PreparedQuery<IGetEntityByIdParams, IGetEntityByIdResult>(
  getEntityByIdIR,
);

/** 'GetVipEntities' parameters type */
export type IGetVipEntitiesParams = void;

/** 'GetVipEntities' return type */
export interface IGetVipEntitiesResult {
  aliases: string | null;
  full_name: string;
  mentions: number | null;
}

/** 'GetVipEntities' query type */
export interface IGetVipEntitiesQuery {
  params: IGetVipEntitiesParams;
  result: IGetVipEntitiesResult;
}

const getVipEntitiesIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    "SELECT full_name, aliases, COALESCE(mentions, 0) as mentions\nFROM entities\nWHERE COALESCE(is_vip, 0) = 1\n  AND full_name IS NOT NULL\n  AND TRIM(full_name) != ''",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT full_name, aliases, COALESCE(mentions, 0) as mentions
 * FROM entities
 * WHERE COALESCE(is_vip, 0) = 1
 *   AND full_name IS NOT NULL
 *   AND TRIM(full_name) != ''
 * ```
 */
export const getVipEntities = new PreparedQuery<IGetVipEntitiesParams, IGetVipEntitiesResult>(
  getVipEntitiesIR,
);

/** 'GetEntityRelationships' parameters type */
export interface IGetEntityRelationshipsParams {
  entityId: NumberOrString;
}

/** 'GetEntityRelationships' return type */
export interface IGetEntityRelationshipsResult {
  confidence: number | null;
  created_at: Date | null;
  evidence_pack_json: Json | null;
  first_seen_at: Date | null;
  ingest_run_id: string | null;
  last_seen_at: Date | null;
  proximity_score: number | null;
  relationship_type: string;
  risk_score: number | null;
  source_entity_id: string;
  strength: number | null;
  target_entity_id: string;
  targetName: string;
  targetRole: string | null;
  updated_at: Date | null;
  was_agentic: number | null;
}

/** 'GetEntityRelationships' query type */
export interface IGetEntityRelationshipsQuery {
  params: IGetEntityRelationshipsParams;
  result: IGetEntityRelationshipsResult;
}

const getEntityRelationshipsIR: any = {
  usedParamSet: { entityId: true },
  params: [
    { name: 'entityId', required: true, transform: { type: 'scalar' }, locs: [{ a: 183, b: 192 }] },
  ],
  statement:
    'SELECT \n  er.*,\n  e.full_name as "targetName",\n  e.primary_role as "targetRole"\nFROM entity_relationships er\nJOIN entities e ON er.target_entity_id = e.id\nWHERE er.source_entity_id = :entityId!\nORDER BY er.confidence DESC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   er.*,
 *   e.full_name as "targetName",
 *   e.primary_role as "targetRole"
 * FROM entity_relationships er
 * JOIN entities e ON er.target_entity_id = e.id
 * WHERE er.source_entity_id = :entityId!
 * ORDER BY er.confidence DESC
 * ```
 */
export const getEntityRelationships = new PreparedQuery<
  IGetEntityRelationshipsParams,
  IGetEntityRelationshipsResult
>(getEntityRelationshipsIR);

/** 'GetEntityMentions' parameters type */
export interface IGetEntityMentionsParams {
  entityId: NumberOrString;
  limit: NumberOrString;
}

/** 'GetEntityMentions' return type */
export interface IGetEntityMentionsResult {
  confidence: number | null;
  created_at: Date | null;
  doc_date_created: Date | null;
  doc_red_flag_rating: number | null;
  document_id: string | null;
  documentDate: Date | null;
  documentTitle: string | null;
  end_offset: number | null;
  entity_id: string | null;
  id: string;
  ingest_run_id: string | null;
  mention_context: string | null;
  mention_type: string | null;
  page_number: number | null;
  position_end: number | null;
  position_start: number | null;
  rejection_reason: string | null;
  sentence_id: string | null;
  significance_score: number | null;
  span_id: string | null;
  start_offset: number | null;
  surface_text: string | null;
  verified: number | null;
  verified_at: Date | null;
  verified_by: string | null;
}

/** 'GetEntityMentions' query type */
export interface IGetEntityMentionsQuery {
  params: IGetEntityMentionsParams;
  result: IGetEntityMentionsResult;
}

const getEntityMentionsIR: any = {
  usedParamSet: { entityId: true, limit: true },
  params: [
    { name: 'entityId', required: true, transform: { type: 'scalar' }, locs: [{ a: 172, b: 181 }] },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 218, b: 224 }] },
  ],
  statement:
    'SELECT \n  em.*,\n  d.file_name as "documentTitle",\n  d.date_created as "documentDate"\nFROM entity_mentions em\nJOIN documents d ON em.document_id = d.id\nWHERE em.entity_id = :entityId!\nORDER BY d.date_created DESC\nLIMIT :limit!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   em.*,
 *   d.file_name as "documentTitle",
 *   d.date_created as "documentDate"
 * FROM entity_mentions em
 * JOIN documents d ON em.document_id = d.id
 * WHERE em.entity_id = :entityId!
 * ORDER BY d.date_created DESC
 * LIMIT :limit!
 * ```
 */
export const getEntityMentions = new PreparedQuery<
  IGetEntityMentionsParams,
  IGetEntityMentionsResult
>(getEntityMentionsIR);

/** 'GetMaxConnectivity' parameters type */
export type IGetMaxConnectivityParams = void;

/** 'GetMaxConnectivity' return type */
export interface IGetMaxConnectivityResult {
  maxConn: string | null;
}

/** 'GetMaxConnectivity' query type */
export interface IGetMaxConnectivityQuery {
  params: IGetMaxConnectivityParams;
  result: IGetMaxConnectivityResult;
}

const getMaxConnectivityIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    'SELECT MAX(cnt) as "maxConn" FROM (\n  SELECT source_entity_id, COUNT(*) as cnt \n  FROM entity_relationships \n  GROUP BY source_entity_id\n) AS subquery',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT MAX(cnt) as "maxConn" FROM (
 *   SELECT source_entity_id, COUNT(*) as cnt
 *   FROM entity_relationships
 *   GROUP BY source_entity_id
 * ) AS subquery
 * ```
 */
export const getMaxConnectivity = new PreparedQuery<
  IGetMaxConnectivityParams,
  IGetMaxConnectivityResult
>(getMaxConnectivityIR);
