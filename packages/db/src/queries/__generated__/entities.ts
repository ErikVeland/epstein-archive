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
  blackBookCount: number | null;
  connections: string | null;
  fullName: string;
  id: string;
  mediaCount: number | null;
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
        { a: 846, b: 856 },
        { a: 893, b: 903 },
        { a: 929, b: 939 },
        { a: 960, b: 970 },
      ],
    },
    {
      name: 'riskLevels',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 999, b: 1009 },
        { a: 1015, b: 1025 },
      ],
    },
    {
      name: 'minRedFlag',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 1064, b: 1074 },
        { a: 1079, b: 1089 },
      ],
    },
    {
      name: 'maxRedFlag',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 1128, b: 1138 },
        { a: 1143, b: 1153 },
      ],
    },
    {
      name: 'role',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 1188, b: 1192 },
        { a: 1197, b: 1201 },
      ],
    },
    {
      name: 'sortBy',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 1264, b: 1270 },
        { a: 1319, b: 1325 },
      ],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 1408, b: 1414 }] },
    { name: 'offset', required: true, transform: { type: 'scalar' }, locs: [{ a: 1423, b: 1430 }] },
  ],
  statement:
    'SELECT \n  e.id,\n  e.full_name as "fullName",\n  e.primary_role as "primaryRole",\n  e.bio,\n  e.mentions,\n  e.risk_level as "riskLevel",\n  e.red_flag_rating as "redFlagRating",\n  e.connections_summary as "connections",\n  e.was_agentic as "wasAgentic",\n  (SELECT COUNT(*)::integer FROM entity_mentions em JOIN documents d ON d.id = em.document_id WHERE em.entity_id = e.id AND d.evidence_type = \'media\') as "mediaCount",\n  (SELECT COUNT(*)::integer FROM black_book_entries WHERE person_id = e.id) as "blackBookCount",\n  (\n    SELECT mi.id\n    FROM media_items mi\n    LEFT JOIN media_item_people mip ON mi.id::text = mip.media_item_id::text\n    WHERE (mi.entity_id = e.id OR mip.entity_id = e.id)\n      AND mi.file_type ILIKE \'image/%\'\n    ORDER BY mi.red_flag_rating DESC NULLS LAST, mi.id DESC\n    LIMIT 1\n  ) as "topPhotoId"\nFROM entities e\nWHERE (:searchTerm::text IS NULL OR e.full_name ILIKE :searchTerm OR e.primary_role ILIKE :searchTerm OR e.aliases ILIKE :searchTerm)\n  AND (e.risk_level = ANY(:riskLevels) OR :riskLevels IS NULL)\n  AND (e.red_flag_rating >= :minRedFlag OR :minRedFlag IS NULL)\n  AND (e.red_flag_rating <= :maxRedFlag OR :maxRedFlag IS NULL)\n  AND (e.primary_role = :role OR :role IS NULL)\nORDER BY \n  COALESCE(e.is_vip, 0) DESC,\n  CASE WHEN :sortBy = \'name\' THEN e.full_name END ASC,\n  CASE WHEN :sortBy = \'recent\' THEN e.id END DESC,\n  e.red_flag_rating DESC,\n  e.mentions DESC\nLIMIT :limit! OFFSET :offset!',
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
 *   (SELECT COUNT(*)::integer FROM entity_mentions em JOIN documents d ON d.id = em.document_id WHERE em.entity_id = e.id AND d.evidence_type = 'media') as "mediaCount",
 *   (SELECT COUNT(*)::integer FROM black_book_entries WHERE person_id = e.id) as "blackBookCount",
 *   (
 *     SELECT mi.id
 *     FROM media_items mi
 *     LEFT JOIN media_item_people mip ON mi.id::text = mip.media_item_id::text
 *     WHERE (mi.entity_id = e.id OR mip.entity_id = e.id)
 *       AND mi.file_type ILIKE 'image/%'
 *     ORDER BY mi.red_flag_rating DESC NULLS LAST, mi.id DESC
 *     LIMIT 1
 *   ) as "topPhotoId"
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
  total: number | null;
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
        { a: 58, b: 68 },
        { a: 105, b: 115 },
        { a: 141, b: 151 },
        { a: 172, b: 182 },
      ],
    },
    {
      name: 'riskLevels',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 211, b: 221 },
        { a: 227, b: 237 },
      ],
    },
  ],
  statement:
    'SELECT COUNT(*)::integer as total \nFROM entities e\nWHERE (:searchTerm::text IS NULL OR e.full_name ILIKE :searchTerm OR e.primary_role ILIKE :searchTerm OR e.aliases ILIKE :searchTerm)\n  AND (e.risk_level = ANY(:riskLevels) OR :riskLevels IS NULL)',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT COUNT(*)::integer as total
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
  calculated_rank_score: number | null;
  canonical_id: string | null;
  community_id: string | null;
  connections_summary: string | null;
  created_at: Date | null;
  death_date: string | null;
  entity_category: string | null;
  entity_metadata_json: Json | null;
  entity_type: string | null;
  evidence_count: number | null;
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
  params: [{ name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 34, b: 37 }] }],
  statement: 'SELECT * FROM entities WHERE id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT * FROM entities WHERE id = :id!
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
  signal_ids: stringArray | null;
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
  documentPath: string | null;
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
    { name: 'entityId', required: true, transform: { type: 'scalar' }, locs: [{ a: 204, b: 213 }] },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 250, b: 256 }] },
  ],
  statement:
    'SELECT\n  em.*,\n  d.file_name as "documentTitle",\n  d.date_created as "documentDate",\n  d.file_path as "documentPath"\nFROM entity_mentions em\nJOIN documents d ON em.document_id = d.id\nWHERE em.entity_id = :entityId!\nORDER BY d.date_created DESC\nLIMIT :limit!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   em.*,
 *   d.file_name as "documentTitle",
 *   d.date_created as "documentDate",
 *   d.file_path as "documentPath"
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
  maxConn: number | null;
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
    'SELECT MAX(cnt) as "maxConn" FROM (\n  SELECT source_entity_id, COUNT(*)::integer as cnt \n  FROM entity_relationships \n  GROUP BY source_entity_id\n) AS subquery',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT MAX(cnt) as "maxConn" FROM (
 *   SELECT source_entity_id, COUNT(*)::integer as cnt
 *   FROM entity_relationships
 *   GROUP BY source_entity_id
 * ) AS subquery
 * ```
 */
export const getMaxConnectivity = new PreparedQuery<
  IGetMaxConnectivityParams,
  IGetMaxConnectivityResult
>(getMaxConnectivityIR);
