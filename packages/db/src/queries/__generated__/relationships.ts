/** Types generated for queries found in "src/queries/relationships.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

/** 'GetRelationships' parameters type */
export interface IGetRelationshipsParams {
  entityId: NumberOrString;
  minConfidence?: number | null | void;
  minWeight?: number | null | void;
}

/** 'GetRelationships' return type */
export interface IGetRelationshipsResult {
  confidence: number | null;
  metadataJson: string | null;
  proximityScore: number | null;
  relationshipType: string;
  riskScore: number | null;
  sourceId: string;
  targetId: string;
}

/** 'GetRelationships' query type */
export interface IGetRelationshipsQuery {
  params: IGetRelationshipsParams;
  result: IGetRelationshipsResult;
}

const getRelationshipsIR: any = {
  usedParamSet: { entityId: true, minWeight: true, minConfidence: true },
  params: [
    {
      name: 'entityId',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 325, b: 334 },
        { a: 366, b: 375 },
      ],
    },
    {
      name: 'minWeight',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 393, b: 402 },
        { a: 441, b: 450 },
      ],
    },
    {
      name: 'minConfidence',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 460, b: 473 },
        { a: 498, b: 511 },
      ],
    },
  ],
  statement:
    'SELECT \n  source_entity_id as "sourceId", \n  target_entity_id as "targetId", \n  relationship_type as "relationshipType", \n  proximity_score as "proximityScore",\n  COALESCE(risk_score, 0) as "riskScore", \n  COALESCE(confidence, 0.5) as confidence, \n  NULL as "metadataJson"\nFROM entity_relationships\nWHERE (source_entity_id = :entityId!::bigint OR target_entity_id = :entityId!::bigint)\n  AND (:minWeight::float IS NULL OR proximity_score >= :minWeight)\n  AND (:minConfidence::float IS NULL OR 1 >= :minConfidence)\nORDER BY proximity_score DESC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   source_entity_id as "sourceId",
 *   target_entity_id as "targetId",
 *   relationship_type as "relationshipType",
 *   proximity_score as "proximityScore",
 *   COALESCE(risk_score, 0) as "riskScore",
 *   COALESCE(confidence, 0.5) as confidence,
 *   NULL as "metadataJson"
 * FROM entity_relationships
 * WHERE (source_entity_id = :entityId!::bigint OR target_entity_id = :entityId!::bigint)
 *   AND (:minWeight::float IS NULL OR proximity_score >= :minWeight)
 *   AND (:minConfidence::float IS NULL OR 1 >= :minConfidence)
 * ORDER BY proximity_score DESC
 * ```
 */
export const getRelationships = new PreparedQuery<IGetRelationshipsParams, IGetRelationshipsResult>(
  getRelationshipsIR,
);

/** 'RebuildAdjacencyCache' parameters type */
export type IRebuildAdjacencyCacheParams = void;

/** 'RebuildAdjacencyCache' return type */
export type IRebuildAdjacencyCacheResult = void;

/** 'RebuildAdjacencyCache' query type */
export interface IRebuildAdjacencyCacheQuery {
  params: IRebuildAdjacencyCacheParams;
  result: IRebuildAdjacencyCacheResult;
}

const rebuildAdjacencyCacheIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    "WITH base_canonical AS (\n  SELECT \n    s.canonical_id AS s_cid,\n    t.canonical_id AS t_cid,\n    er.proximity_score,\n    er.relationship_type,\n    er.risk_score,\n    er.confidence,\n    s.community_id AS s_comm,\n    t.community_id AS t_comm\n  FROM entity_relationships er\n  JOIN entities s ON er.source_entity_id = s.id\n  JOIN entities t ON er.target_entity_id = t.id\n  WHERE s.canonical_id != t.canonical_id\n),\nsymmetric_edges AS (\n  SELECT s_cid AS src, t_cid AS tgt, proximity_score, relationship_type, risk_score, confidence, s_comm, t_comm FROM base_canonical\n  UNION ALL\n  SELECT t_cid AS src, s_cid AS tgt, proximity_score, relationship_type, risk_score, confidence, t_comm, s_comm FROM base_canonical\n)\nINSERT INTO entity_adjacency (entity_id, neighbor_id, weight, bridge_score, relationship_types, risk_score, confidence)\nSELECT \n  src as entity_id,\n  tgt as neighbor_id,\n  MAX(proximity_score) as weight,\n  CASE WHEN s_comm != t_comm THEN 1.0 ELSE 0.0 END as bridge_score,\n  STRING_AGG(DISTINCT relationship_type, ',') as relationship_types,\n  MAX(risk_score) as risk_score,\n  MAX(confidence) as confidence\nFROM symmetric_edges\nGROUP BY src, tgt, s_comm, t_comm\nON CONFLICT (entity_id, neighbor_id) DO UPDATE SET\n  weight = EXCLUDED.weight,\n  bridge_score = EXCLUDED.bridge_score,\n  relationship_types = EXCLUDED.relationship_types,\n  risk_score = EXCLUDED.risk_score,\n  confidence = EXCLUDED.confidence",
};

/**
 * Query generated from SQL:
 * ```
 * WITH base_canonical AS (
 *   SELECT
 *     s.canonical_id AS s_cid,
 *     t.canonical_id AS t_cid,
 *     er.proximity_score,
 *     er.relationship_type,
 *     er.risk_score,
 *     er.confidence,
 *     s.community_id AS s_comm,
 *     t.community_id AS t_comm
 *   FROM entity_relationships er
 *   JOIN entities s ON er.source_entity_id = s.id
 *   JOIN entities t ON er.target_entity_id = t.id
 *   WHERE s.canonical_id != t.canonical_id
 * ),
 * symmetric_edges AS (
 *   SELECT s_cid AS src, t_cid AS tgt, proximity_score, relationship_type, risk_score, confidence, s_comm, t_comm FROM base_canonical
 *   UNION ALL
 *   SELECT t_cid AS src, s_cid AS tgt, proximity_score, relationship_type, risk_score, confidence, t_comm, s_comm FROM base_canonical
 * )
 * INSERT INTO entity_adjacency (entity_id, neighbor_id, weight, bridge_score, relationship_types, risk_score, confidence)
 * SELECT
 *   src as entity_id,
 *   tgt as neighbor_id,
 *   MAX(proximity_score) as weight,
 *   CASE WHEN s_comm != t_comm THEN 1.0 ELSE 0.0 END as bridge_score,
 *   STRING_AGG(DISTINCT relationship_type, ',') as relationship_types,
 *   MAX(risk_score) as risk_score,
 *   MAX(confidence) as confidence
 * FROM symmetric_edges
 * GROUP BY src, tgt, s_comm, t_comm
 * ON CONFLICT (entity_id, neighbor_id) DO UPDATE SET
 *   weight = EXCLUDED.weight,
 *   bridge_score = EXCLUDED.bridge_score,
 *   relationship_types = EXCLUDED.relationship_types,
 *   risk_score = EXCLUDED.risk_score,
 *   confidence = EXCLUDED.confidence
 * ```
 */
export const rebuildAdjacencyCache = new PreparedQuery<
  IRebuildAdjacencyCacheParams,
  IRebuildAdjacencyCacheResult
>(rebuildAdjacencyCacheIR);

/** 'GetEntityCanonical' parameters type */
export interface IGetEntityCanonicalParams {
  id: NumberOrString;
}

/** 'GetEntityCanonical' return type */
export interface IGetEntityCanonicalResult {
  cid: string | null;
}

/** 'GetEntityCanonical' query type */
export interface IGetEntityCanonicalQuery {
  params: IGetEntityCanonicalParams;
  result: IGetEntityCanonicalResult;
}

const getEntityCanonicalIR: any = {
  usedParamSet: { id: true },
  params: [{ name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 66, b: 69 }] }],
  statement: 'SELECT COALESCE(canonical_id, id) as cid FROM entities WHERE id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT COALESCE(canonical_id, id) as cid FROM entities WHERE id = :id!
 * ```
 */
export const getEntityCanonical = new PreparedQuery<
  IGetEntityCanonicalParams,
  IGetEntityCanonicalResult
>(getEntityCanonicalIR);

/** 'GetEntityDetailsAggregated' parameters type */
export interface IGetEntityDetailsAggregatedParams {
  canonicalId: NumberOrString;
}

/** 'GetEntityDetailsAggregated' return type */
export interface IGetEntityDetailsAggregatedResult {
  fullName: string | null;
  id: string | null;
  primaryRole: string | null;
  redFlagRating: number | null;
}

/** 'GetEntityDetailsAggregated' query type */
export interface IGetEntityDetailsAggregatedQuery {
  params: IGetEntityDetailsAggregatedParams;
  result: IGetEntityDetailsAggregatedResult;
}

const getEntityDetailsAggregatedIR: any = {
  usedParamSet: { canonicalId: true },
  params: [
    {
      name: 'canonicalId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 189, b: 201 }],
    },
  ],
  statement:
    'SELECT \n    canonical_id as id, \n    MAX(full_name) as "fullName", \n    MAX(primary_role) as "primaryRole", \n    MAX(red_flag_rating) as "redFlagRating"\nFROM entities \nWHERE canonical_id = :canonicalId!\nGROUP BY canonical_id',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     canonical_id as id,
 *     MAX(full_name) as "fullName",
 *     MAX(primary_role) as "primaryRole",
 *     MAX(red_flag_rating) as "redFlagRating"
 * FROM entities
 * WHERE canonical_id = :canonicalId!
 * GROUP BY canonical_id
 * ```
 */
export const getEntityDetailsAggregated = new PreparedQuery<
  IGetEntityDetailsAggregatedParams,
  IGetEntityDetailsAggregatedResult
>(getEntityDetailsAggregatedIR);

/** Query 'GetTopPhotoForEntity' is invalid, so its result is assigned type 'never'.
 *  */
export type IGetTopPhotoForEntityResult = never;

/** Query 'GetTopPhotoForEntity' is invalid, so its parameters are assigned type 'never'.
 *  */
export type IGetTopPhotoForEntityParams = never;

const getTopPhotoForEntityIR: any = {
  usedParamSet: { entityId: true },
  params: [
    { name: 'entityId', required: true, transform: { type: 'scalar' }, locs: [{ a: 111, b: 120 }] },
  ],
  statement:
    "SELECT mi.id\nFROM media_item_people mip\nJOIN media_items mi ON mip.media_item_id = mi.id\nWHERE mip.entity_id = :entityId!::bigint\nAND (mi.file_type LIKE 'image/%' OR mi.file_type IS NULL)\nORDER BY mi.red_flag_rating DESC, mi.id DESC\nLIMIT 1",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT mi.id
 * FROM media_item_people mip
 * JOIN media_items mi ON mip.media_item_id = mi.id
 * WHERE mip.entity_id = :entityId!::bigint
 * AND (mi.file_type LIKE 'image/%' OR mi.file_type IS NULL)
 * ORDER BY mi.red_flag_rating DESC, mi.id DESC
 * LIMIT 1
 * ```
 */
export const getTopPhotoForEntity = new PreparedQuery<
  IGetTopPhotoForEntityParams,
  IGetTopPhotoForEntityResult
>(getTopPhotoForEntityIR);

/** 'GetNeighborsCached' parameters type */
export interface IGetNeighborsCachedParams {
  entityId: NumberOrString;
  limit: NumberOrString;
}

/** 'GetNeighborsCached' return type */
export interface IGetNeighborsCachedResult {
  bridgeScore: number | null;
  confidence: number | null;
  proximityScore: number | null;
  relationshipTypes: string | null;
  riskScore: number | null;
  targetId: string;
}

/** 'GetNeighborsCached' query type */
export interface IGetNeighborsCachedQuery {
  params: IGetNeighborsCachedParams;
  result: IGetNeighborsCachedResult;
}

const getNeighborsCachedIR: any = {
  usedParamSet: { entityId: true, limit: true },
  params: [
    { name: 'entityId', required: true, transform: { type: 'scalar' }, locs: [{ a: 243, b: 252 }] },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 300, b: 306 }] },
  ],
  statement:
    'SELECT \n  neighbor_id as "targetId",\n  weight as "proximityScore",\n  bridge_score as "bridgeScore",\n  relationship_types as "relationshipTypes",\n  risk_score as "riskScore",\n  confidence as "confidence"\nFROM entity_adjacency\nWHERE entity_id = :entityId!\nORDER BY bridge_score DESC, weight DESC\nLIMIT :limit!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   neighbor_id as "targetId",
 *   weight as "proximityScore",
 *   bridge_score as "bridgeScore",
 *   relationship_types as "relationshipTypes",
 *   risk_score as "riskScore",
 *   confidence as "confidence"
 * FROM entity_adjacency
 * WHERE entity_id = :entityId!
 * ORDER BY bridge_score DESC, weight DESC
 * LIMIT :limit!
 * ```
 */
export const getNeighborsCached = new PreparedQuery<
  IGetNeighborsCachedParams,
  IGetNeighborsCachedResult
>(getNeighborsCachedIR);

/** 'GetRelationshipStats' parameters type */
export type IGetRelationshipStatsParams = void;

/** 'GetRelationshipStats' return type */
export interface IGetRelationshipStatsResult {
  avgConfidence: number | null;
  avgProximityScore: number | null;
  avgRiskScore: number | null;
  totalRelationships: number | null;
}

/** 'GetRelationshipStats' query type */
export interface IGetRelationshipStatsQuery {
  params: IGetRelationshipStatsParams;
  result: IGetRelationshipStatsResult;
}

const getRelationshipStatsIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    'SELECT \n  COUNT(*)::integer as "totalRelationships",\n  AVG(proximity_score) as "avgProximityScore",\n  AVG(COALESCE(risk_score, 0)) as "avgRiskScore",\n  AVG(COALESCE(confidence, 0)) as "avgConfidence"\nFROM entity_relationships',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   COUNT(*)::integer as "totalRelationships",
 *   AVG(proximity_score) as "avgProximityScore",
 *   AVG(COALESCE(risk_score, 0)) as "avgRiskScore",
 *   AVG(COALESCE(confidence, 0)) as "avgConfidence"
 * FROM entity_relationships
 * ```
 */
export const getRelationshipStats = new PreparedQuery<
  IGetRelationshipStatsParams,
  IGetRelationshipStatsResult
>(getRelationshipStatsIR);

/** 'GetTopEntitiesByRelationshipCount' parameters type */
export interface IGetTopEntitiesByRelationshipCountParams {
  limit: NumberOrString;
}

/** 'GetTopEntitiesByRelationshipCount' return type */
export interface IGetTopEntitiesByRelationshipCountResult {
  count: number | null;
  entityId: string;
}

/** 'GetTopEntitiesByRelationshipCount' query type */
export interface IGetTopEntitiesByRelationshipCountQuery {
  params: IGetTopEntitiesByRelationshipCountParams;
  result: IGetTopEntitiesByRelationshipCountResult;
}

const getTopEntitiesByRelationshipCountIR: any = {
  usedParamSet: { limit: true },
  params: [
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 144, b: 150 }] },
  ],
  statement:
    'SELECT source_entity_id as "entityId", COUNT(*)::integer as count\nFROM entity_relationships\nGROUP BY source_entity_id\nORDER BY count DESC\nLIMIT :limit!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT source_entity_id as "entityId", COUNT(*)::integer as count
 * FROM entity_relationships
 * GROUP BY source_entity_id
 * ORDER BY count DESC
 * LIMIT :limit!
 * ```
 */
export const getTopEntitiesByRelationshipCount = new PreparedQuery<
  IGetTopEntitiesByRelationshipCountParams,
  IGetTopEntitiesByRelationshipCountResult
>(getTopEntitiesByRelationshipCountIR);
