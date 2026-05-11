/** Types generated for queries found in "src/queries/graph.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type NumberOrString = number | string;

export type NumberOrStringArray = NumberOrString[];

/** 'GetGraphCommunities' parameters type */
export type IGetGraphCommunitiesParams = void;

/** 'GetGraphCommunities' return type */
export interface IGetGraphCommunitiesResult {
  id: string | null;
  label: string | null;
  mentions: string | null;
  risk: number | null;
  size: number | null;
  type: string | null;
}

/** 'GetGraphCommunities' query type */
export interface IGetGraphCommunitiesQuery {
  params: IGetGraphCommunitiesParams;
  result: IGetGraphCommunitiesResult;
}

const getGraphCommunitiesIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    "SELECT \n    'community-' || community_id as id,\n    (\n        SELECT full_name \n        FROM entities e2 \n        WHERE e2.community_id = entities.community_id \n        ORDER BY red_flag_rating DESC, mentions DESC \n        LIMIT 1\n    ) || ' Group' as label,\n    'cluster' as type,\n    MAX(red_flag_rating) as risk,\n    COUNT(*)::integer as size,\n    SUM(mentions) as mentions\nFROM entities\nWHERE community_id IS NOT NULL AND entity_type = 'Person'\nGROUP BY community_id\nHAVING COUNT(*)::integer > 10\nORDER BY size DESC\nLIMIT 50",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     'community-' || community_id as id,
 *     (
 *         SELECT full_name
 *         FROM entities e2
 *         WHERE e2.community_id = entities.community_id
 *         ORDER BY red_flag_rating DESC, mentions DESC
 *         LIMIT 1
 *     ) || ' Group' as label,
 *     'cluster' as type,
 *     MAX(red_flag_rating) as risk,
 *     COUNT(*)::integer as size,
 *     SUM(mentions) as mentions
 * FROM entities
 * WHERE community_id IS NOT NULL AND entity_type = 'Person'
 * GROUP BY community_id
 * HAVING COUNT(*)::integer > 10
 * ORDER BY size DESC
 * LIMIT 50
 * ```
 */
export const getGraphCommunities = new PreparedQuery<
  IGetGraphCommunitiesParams,
  IGetGraphCommunitiesResult
>(getGraphCommunitiesIR);

/** 'GetGraphNeighbors' parameters type */
export interface IGetGraphNeighborsParams {
  endDate?: DateOrString | null | void;
  sourceCanonicalId: NumberOrString;
  startDate?: DateOrString | null | void;
}

/** 'GetGraphNeighbors' return type */
export interface IGetGraphNeighborsResult {
  canonicalId: string | null;
  weight: number | null;
}

/** 'GetGraphNeighbors' query type */
export interface IGetGraphNeighborsQuery {
  params: IGetGraphNeighborsParams;
  result: IGetGraphNeighborsResult;
}

const getGraphNeighborsIR: any = {
  usedParamSet: { sourceCanonicalId: true, endDate: true, startDate: true },
  params: [
    {
      name: 'sourceCanonicalId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 212, b: 230 }],
    },
    {
      name: 'endDate',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 247, b: 254 },
        { a: 300, b: 307 },
      ],
    },
    {
      name: 'startDate',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 330, b: 339 },
        { a: 384, b: 393 },
      ],
    },
  ],
  statement:
    'SELECT t.canonical_id as "canonicalId", MAX(er.strength) as weight \nFROM entity_relationships er\nJOIN entities s ON er.source_entity_id = s.id\nJOIN entities t ON er.target_entity_id = t.id\nWHERE s.canonical_id = :sourceCanonicalId!::bigint\n  AND (:endDate::timestamptz IS NULL OR er.first_seen_at <= :endDate::timestamptz)\n  AND (:startDate::timestamptz IS NULL OR er.last_seen_at >= :startDate::timestamptz)\nGROUP BY t.canonical_id',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT t.canonical_id as "canonicalId", MAX(er.strength) as weight
 * FROM entity_relationships er
 * JOIN entities s ON er.source_entity_id = s.id
 * JOIN entities t ON er.target_entity_id = t.id
 * WHERE s.canonical_id = :sourceCanonicalId!::bigint
 *   AND (:endDate::timestamptz IS NULL OR er.first_seen_at <= :endDate::timestamptz)
 *   AND (:startDate::timestamptz IS NULL OR er.last_seen_at >= :startDate::timestamptz)
 * GROUP BY t.canonical_id
 * ```
 */
export const getGraphNeighbors = new PreparedQuery<
  IGetGraphNeighborsParams,
  IGetGraphNeighborsResult
>(getGraphNeighborsIR);

/** 'GetGraphPathNodes' parameters type */
export interface IGetGraphPathNodesParams {
  pathNodes: NumberOrStringArray;
}

/** 'GetGraphPathNodes' return type */
export interface IGetGraphPathNodesResult {
  community: string | null;
  id: string | null;
  label: string | null;
  risk: number | null;
  type: string | null;
  val: string | null;
}

/** 'GetGraphPathNodes' query type */
export interface IGetGraphPathNodesQuery {
  params: IGetGraphPathNodesParams;
  result: IGetGraphPathNodesResult;
}

const getGraphPathNodesIR: any = {
  usedParamSet: { pathNodes: true },
  params: [
    {
      name: 'pathNodes',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 230, b: 240 }],
    },
  ],
  statement:
    'SELECT \n    canonical_id as id, \n    MAX(full_name) as label, \n    MAX(red_flag_rating) as risk, \n    MAX(primary_role) as type,\n    SUM(mentions) as val,\n    MAX(community_id) as community\nFROM entities \nWHERE canonical_id = ANY(:pathNodes!::bigint[])\nGROUP BY canonical_id',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     canonical_id as id,
 *     MAX(full_name) as label,
 *     MAX(red_flag_rating) as risk,
 *     MAX(primary_role) as type,
 *     SUM(mentions) as val,
 *     MAX(community_id) as community
 * FROM entities
 * WHERE canonical_id = ANY(:pathNodes!::bigint[])
 * GROUP BY canonical_id
 * ```
 */
export const getGraphPathNodes = new PreparedQuery<
  IGetGraphPathNodesParams,
  IGetGraphPathNodesResult
>(getGraphPathNodesIR);

/** 'GetGraphPathEdges' parameters type */
export interface IGetGraphPathEdgesParams {
  endDate?: DateOrString | null | void;
  pathNodes: NumberOrStringArray;
  startDate?: DateOrString | null | void;
}

/** 'GetGraphPathEdges' return type */
export interface IGetGraphPathEdgesResult {
  classification: string | null;
  confidence: number | null;
  source: string | null;
  target: string | null;
  type: string;
  weight: number | null;
}

/** 'GetGraphPathEdges' query type */
export interface IGetGraphPathEdgesQuery {
  params: IGetGraphPathEdgesParams;
  result: IGetGraphPathEdgesResult;
}

const getGraphPathEdgesIR: any = {
  usedParamSet: { pathNodes: true, endDate: true, startDate: true },
  params: [
    {
      name: 'pathNodes',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 484, b: 494 },
        { a: 535, b: 545 },
      ],
    },
    {
      name: 'endDate',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 565, b: 572 },
        { a: 618, b: 625 },
      ],
    },
    {
      name: 'startDate',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 648, b: 657 },
        { a: 702, b: 711 },
      ],
    },
  ],
  statement:
    "SELECT \n    s.canonical_id as source, \n    t.canonical_id as target, \n    er.relationship_type as type,\n    MAX(er.strength) as weight,\n    MAX(er.confidence) as confidence,\n    CASE \n        WHEN er.relationship_type LIKE '%infer%' OR MAX(er.confidence) < 0.8 THEN 'INFERRED' \n        ELSE 'EVIDENCE_BACKED' \n    END as classification\nFROM entity_relationships er\nJOIN entities s ON er.source_entity_id = s.id\nJOIN entities t ON er.target_entity_id = t.id\nWHERE s.canonical_id = ANY(:pathNodes!::bigint[]) \n  AND t.canonical_id = ANY(:pathNodes!::bigint[])\n  AND (:endDate::timestamptz IS NULL OR er.first_seen_at <= :endDate::timestamptz)\n  AND (:startDate::timestamptz IS NULL OR er.last_seen_at >= :startDate::timestamptz)\nGROUP BY s.canonical_id, t.canonical_id, er.relationship_type",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     s.canonical_id as source,
 *     t.canonical_id as target,
 *     er.relationship_type as type,
 *     MAX(er.strength) as weight,
 *     MAX(er.confidence) as confidence,
 *     CASE
 *         WHEN er.relationship_type LIKE '%infer%' OR MAX(er.confidence) < 0.8 THEN 'INFERRED'
 *         ELSE 'EVIDENCE_BACKED'
 *     END as classification
 * FROM entity_relationships er
 * JOIN entities s ON er.source_entity_id = s.id
 * JOIN entities t ON er.target_entity_id = t.id
 * WHERE s.canonical_id = ANY(:pathNodes!::bigint[])
 *   AND t.canonical_id = ANY(:pathNodes!::bigint[])
 *   AND (:endDate::timestamptz IS NULL OR er.first_seen_at <= :endDate::timestamptz)
 *   AND (:startDate::timestamptz IS NULL OR er.last_seen_at >= :startDate::timestamptz)
 * GROUP BY s.canonical_id, t.canonical_id, er.relationship_type
 * ```
 */
export const getGraphPathEdges = new PreparedQuery<
  IGetGraphPathEdgesParams,
  IGetGraphPathEdgesResult
>(getGraphPathEdgesIR);

/** 'GetGlobalGraphNodes' parameters type */
export interface IGetGlobalGraphNodesParams {
  endDate?: DateOrString | null | void;
  limit: NumberOrString;
  minRisk: number;
  startDate?: DateOrString | null | void;
}

/** 'GetGlobalGraphNodes' return type */
export interface IGetGlobalGraphNodesResult {
  community_id: string | null;
  connectionCount: string | null;
  entity_type: string | null;
  id: string | null;
  label: string | null;
  mentions: string | null;
  risk: number | null;
  type: string | null;
}

/** 'GetGlobalGraphNodes' query type */
export interface IGetGlobalGraphNodesQuery {
  params: IGetGlobalGraphNodesParams;
  result: IGetGlobalGraphNodesResult;
}

const getGlobalGraphNodesIR: any = {
  usedParamSet: { minRisk: true, endDate: true, startDate: true, limit: true },
  params: [
    {
      name: 'minRisk',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 109, b: 117 },
        { a: 1339, b: 1347 },
      ],
    },
    {
      name: 'endDate',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 353, b: 360 },
        { a: 403, b: 410 },
        { a: 729, b: 736 },
        { a: 779, b: 786 },
      ],
    },
    {
      name: 'startDate',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 438, b: 447 },
        { a: 489, b: 498 },
        { a: 814, b: 823 },
        { a: 865, b: 874 },
      ],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 1423, b: 1429 }] },
  ],
  statement:
    'WITH candidate_entities AS (\n    SELECT id FROM entities WHERE entity_type = \'Person\' AND red_flag_rating >= :minRisk!\n),\nrel_counts AS (\nSELECT entity_id, SUM(cnt) as degree FROM (\n    SELECT source_entity_id as entity_id, COUNT(*)::integer as cnt FROM entity_relationships \n    WHERE source_entity_id IN (SELECT id FROM candidate_entities)\n      AND (:endDate::timestamptz IS NULL OR first_seen_at <= :endDate::timestamptz) \n      AND (:startDate::timestamptz IS NULL OR last_seen_at >= :startDate::timestamptz)\n    GROUP BY source_entity_id\n    UNION ALL\n    SELECT target_entity_id as entity_id, COUNT(*)::integer as cnt FROM entity_relationships \n    WHERE target_entity_id IN (SELECT id FROM candidate_entities)\n      AND (:endDate::timestamptz IS NULL OR first_seen_at <= :endDate::timestamptz) \n      AND (:startDate::timestamptz IS NULL OR last_seen_at >= :startDate::timestamptz)\n    GROUP BY target_entity_id\n) t\nGROUP BY entity_id\n)\nSELECT \ne.canonical_id as id,\nMAX(e.full_name) as label, \nMAX(e.primary_role) as type,\nMAX(e.red_flag_rating) as risk,\nSUM(COALESCE(rc.degree, 0)) as "connectionCount",\nSUM(e.mentions) as mentions,\nMAX(e.entity_type) as entity_type,\nMAX(e.community_id) as community_id\nFROM entities e\nLEFT JOIN rel_counts rc ON e.id = rc.entity_id\nWHERE e.entity_type = \'Person\' \n    AND (e.red_flag_rating >= :minRisk!)\nGROUP BY e.canonical_id\nORDER BY risk DESC, "connectionCount" DESC\nLIMIT :limit!',
};

/**
 * Query generated from SQL:
 * ```
 * WITH candidate_entities AS (
 *     SELECT id FROM entities WHERE entity_type = 'Person' AND red_flag_rating >= :minRisk!
 * ),
 * rel_counts AS (
 * SELECT entity_id, SUM(cnt) as degree FROM (
 *     SELECT source_entity_id as entity_id, COUNT(*)::integer as cnt FROM entity_relationships
 *     WHERE source_entity_id IN (SELECT id FROM candidate_entities)
 *       AND (:endDate::timestamptz IS NULL OR first_seen_at <= :endDate::timestamptz)
 *       AND (:startDate::timestamptz IS NULL OR last_seen_at >= :startDate::timestamptz)
 *     GROUP BY source_entity_id
 *     UNION ALL
 *     SELECT target_entity_id as entity_id, COUNT(*)::integer as cnt FROM entity_relationships
 *     WHERE target_entity_id IN (SELECT id FROM candidate_entities)
 *       AND (:endDate::timestamptz IS NULL OR first_seen_at <= :endDate::timestamptz)
 *       AND (:startDate::timestamptz IS NULL OR last_seen_at >= :startDate::timestamptz)
 *     GROUP BY target_entity_id
 * ) t
 * GROUP BY entity_id
 * )
 * SELECT
 * e.canonical_id as id,
 * MAX(e.full_name) as label,
 * MAX(e.primary_role) as type,
 * MAX(e.red_flag_rating) as risk,
 * SUM(COALESCE(rc.degree, 0)) as "connectionCount",
 * SUM(e.mentions) as mentions,
 * MAX(e.entity_type) as entity_type,
 * MAX(e.community_id) as community_id
 * FROM entities e
 * LEFT JOIN rel_counts rc ON e.id = rc.entity_id
 * WHERE e.entity_type = 'Person'
 *     AND (e.red_flag_rating >= :minRisk!)
 * GROUP BY e.canonical_id
 * ORDER BY risk DESC, "connectionCount" DESC
 * LIMIT :limit!
 * ```
 */
export const getGlobalGraphNodes = new PreparedQuery<
  IGetGlobalGraphNodesParams,
  IGetGlobalGraphNodesResult
>(getGlobalGraphNodesIR);

/** 'GetGlobalGraphEdges' parameters type */
export interface IGetGlobalGraphEdgesParams {
  canonicalIds: NumberOrStringArray;
  endDate?: DateOrString | null | void;
  startDate?: DateOrString | null | void;
}

/** 'GetGlobalGraphEdges' return type */
export interface IGetGlobalGraphEdgesResult {
  classification: string | null;
  confidence: number | null;
  source: string | null;
  target: string | null;
  type: string;
  weight: number | null;
}

/** 'GetGlobalGraphEdges' query type */
export interface IGetGlobalGraphEdgesQuery {
  params: IGetGlobalGraphEdgesParams;
  result: IGetGlobalGraphEdgesResult;
}

const getGlobalGraphEdgesIR: any = {
  usedParamSet: { canonicalIds: true, endDate: true, startDate: true },
  params: [
    {
      name: 'canonicalIds',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 532, b: 545 },
        { a: 587, b: 600 },
      ],
    },
    {
      name: 'endDate',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 663, b: 670 },
        { a: 716, b: 723 },
      ],
    },
    {
      name: 'startDate',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 748, b: 757 },
        { a: 802, b: 811 },
      ],
    },
  ],
  statement:
    "SELECT \n    s.canonical_id as source,\n    t.canonical_id as target,\n    er.relationship_type as type,\n    MAX(er.strength) as weight,\n    MAX(er.confidence) as confidence,\n    CASE \n        WHEN er.relationship_type LIKE '%infer%' OR er.relationship_type LIKE '%agentic%' OR MAX(er.confidence) < 0.8 \n        THEN 'INFERRED' \n        ELSE 'EVIDENCE_BACKED' \n    END as classification\nFROM entity_relationships er\nJOIN entities s ON er.source_entity_id = s.id\nJOIN entities t ON er.target_entity_id = t.id\nWHERE s.canonical_id = ANY(:canonicalIds!::bigint[])\n    AND t.canonical_id = ANY(:canonicalIds!::bigint[])\n    AND s.canonical_id != t.canonical_id\n    AND (:endDate::timestamptz IS NULL OR er.first_seen_at <= :endDate::timestamptz)\n    AND (:startDate::timestamptz IS NULL OR er.last_seen_at >= :startDate::timestamptz)\nGROUP BY s.canonical_id, t.canonical_id, er.relationship_type\nORDER BY weight DESC\nLIMIT 5000",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     s.canonical_id as source,
 *     t.canonical_id as target,
 *     er.relationship_type as type,
 *     MAX(er.strength) as weight,
 *     MAX(er.confidence) as confidence,
 *     CASE
 *         WHEN er.relationship_type LIKE '%infer%' OR er.relationship_type LIKE '%agentic%' OR MAX(er.confidence) < 0.8
 *         THEN 'INFERRED'
 *         ELSE 'EVIDENCE_BACKED'
 *     END as classification
 * FROM entity_relationships er
 * JOIN entities s ON er.source_entity_id = s.id
 * JOIN entities t ON er.target_entity_id = t.id
 * WHERE s.canonical_id = ANY(:canonicalIds!::bigint[])
 *     AND t.canonical_id = ANY(:canonicalIds!::bigint[])
 *     AND s.canonical_id != t.canonical_id
 *     AND (:endDate::timestamptz IS NULL OR er.first_seen_at <= :endDate::timestamptz)
 *     AND (:startDate::timestamptz IS NULL OR er.last_seen_at >= :startDate::timestamptz)
 * GROUP BY s.canonical_id, t.canonical_id, er.relationship_type
 * ORDER BY weight DESC
 * LIMIT 5000
 * ```
 */
export const getGlobalGraphEdges = new PreparedQuery<
  IGetGlobalGraphEdgesParams,
  IGetGlobalGraphEdgesResult
>(getGlobalGraphEdgesIR);

/** 'GetEdgeEvidenceDocuments' parameters type */
export interface IGetEdgeEvidenceDocumentsParams {
  sourceId: NumberOrString;
  targetId: NumberOrString;
}

/** 'GetEdgeEvidenceDocuments' return type */
export interface IGetEdgeEvidenceDocumentsResult {
  date: Date | null;
  documentId: string;
  model: string | null;
  pipeline: string | null;
  risk: number | null;
  snippet: string | null;
  sourceType: string | null;
  title: string | null;
}

/** 'GetEdgeEvidenceDocuments' query type */
export interface IGetEdgeEvidenceDocumentsQuery {
  params: IGetEdgeEvidenceDocumentsParams;
  result: IGetEdgeEvidenceDocumentsResult;
}

const getEdgeEvidenceDocumentsIR: any = {
  usedParamSet: { sourceId: true, targetId: true },
  params: [
    {
      name: 'sourceId',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 415, b: 424 },
        { a: 671, b: 680 },
      ],
    },
    {
      name: 'targetId',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 435, b: 444 },
        { a: 691, b: 700 },
      ],
    },
  ],
  statement:
    'SELECT \n    d.id as "documentId", \n    d.file_name as title, \n    d.evidence_type as "sourceType", \n    d.red_flag_rating as risk,\n    d.date_created as date,\n    ir.agentic_model_id as model,\n    ir.extractor_versions as pipeline,\n    (\n        SELECT mention_context\n        FROM entity_mentions em\n        JOIN entities e ON em.entity_id = e.id\n        WHERE em.document_id = d.id\n        AND e.canonical_id IN (:sourceId!::bigint, :targetId!::bigint)\n        LIMIT 1\n    ) as snippet\nFROM documents d\nJOIN entity_mentions em ON em.document_id = d.id\nJOIN entities e ON em.entity_id = e.id\nLEFT JOIN ingest_runs ir ON em.ingest_run_id = ir.id\nWHERE e.canonical_id IN (:sourceId!::bigint, :targetId!::bigint)\nGROUP BY d.id, ir.agentic_model_id, ir.extractor_versions\nHAVING COUNT(DISTINCT e.canonical_id) >= 2\nORDER BY d.red_flag_rating DESC\nLIMIT 20',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     d.id as "documentId",
 *     d.file_name as title,
 *     d.evidence_type as "sourceType",
 *     d.red_flag_rating as risk,
 *     d.date_created as date,
 *     ir.agentic_model_id as model,
 *     ir.extractor_versions as pipeline,
 *     (
 *         SELECT mention_context
 *         FROM entity_mentions em
 *         JOIN entities e ON em.entity_id = e.id
 *         WHERE em.document_id = d.id
 *         AND e.canonical_id IN (:sourceId!::bigint, :targetId!::bigint)
 *         LIMIT 1
 *     ) as snippet
 * FROM documents d
 * JOIN entity_mentions em ON em.document_id = d.id
 * JOIN entities e ON em.entity_id = e.id
 * LEFT JOIN ingest_runs ir ON em.ingest_run_id = ir.id
 * WHERE e.canonical_id IN (:sourceId!::bigint, :targetId!::bigint)
 * GROUP BY d.id, ir.agentic_model_id, ir.extractor_versions
 * HAVING COUNT(DISTINCT e.canonical_id) >= 2
 * ORDER BY d.red_flag_rating DESC
 * LIMIT 20
 * ```
 */
export const getEdgeEvidenceDocuments = new PreparedQuery<
  IGetEdgeEvidenceDocumentsParams,
  IGetEdgeEvidenceDocumentsResult
>(getEdgeEvidenceDocumentsIR);

/** 'GetEdgeRelationship' parameters type */
export interface IGetEdgeRelationshipParams {
  sourceId: NumberOrString;
  targetId: NumberOrString;
}

/** 'GetEdgeRelationship' return type */
export interface IGetEdgeRelationshipResult {
  confidence: number | null;
  proximityScore: number | null;
  relationshipType: string;
  wasAgentic: number | null;
}

/** 'GetEdgeRelationship' query type */
export interface IGetEdgeRelationshipQuery {
  params: IGetEdgeRelationshipParams;
  result: IGetEdgeRelationshipResult;
}

const getEdgeRelationshipIR: any = {
  usedParamSet: { sourceId: true, targetId: true },
  params: [
    {
      name: 'sourceId',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 282, b: 291 },
        { a: 407, b: 416 },
      ],
    },
    {
      name: 'targetId',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 322, b: 331 },
        { a: 367, b: 376 },
      ],
    },
  ],
  statement:
    'SELECT er.relationship_type as "relationshipType", er.proximity_score as "proximityScore", er.confidence, er.was_agentic as "wasAgentic"\nFROM entity_relationships er\nJOIN entities s ON er.source_entity_id = s.id\nJOIN entities t ON er.target_entity_id = t.id\nWHERE (s.canonical_id = :sourceId!::bigint AND t.canonical_id = :targetId!::bigint)\n    OR (s.canonical_id = :targetId!::bigint AND t.canonical_id = :sourceId!::bigint)\nLIMIT 1',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT er.relationship_type as "relationshipType", er.proximity_score as "proximityScore", er.confidence, er.was_agentic as "wasAgentic"
 * FROM entity_relationships er
 * JOIN entities s ON er.source_entity_id = s.id
 * JOIN entities t ON er.target_entity_id = t.id
 * WHERE (s.canonical_id = :sourceId!::bigint AND t.canonical_id = :targetId!::bigint)
 *     OR (s.canonical_id = :targetId!::bigint AND t.canonical_id = :sourceId!::bigint)
 * LIMIT 1
 * ```
 */
export const getEdgeRelationship = new PreparedQuery<
  IGetEdgeRelationshipParams,
  IGetEdgeRelationshipResult
>(getEdgeRelationshipIR);

/** 'GetMapEntities' parameters type */
export interface IGetMapEntitiesParams {
  limit: NumberOrString;
  minRisk: number;
}

/** 'GetMapEntities' return type */
export interface IGetMapEntitiesResult {
  id: string;
  label: string | null;
  lat: number | null;
  lng: number | null;
  mentions: number | null;
  risk_level: string | null;
  risk_score: number | null;
  type: string | null;
}

/** 'GetMapEntities' query type */
export interface IGetMapEntitiesQuery {
  params: IGetMapEntitiesParams;
  result: IGetMapEntitiesResult;
}

const getMapEntitiesIR: any = {
  usedParamSet: { minRisk: true, limit: true },
  params: [
    { name: 'minRisk', required: true, transform: { type: 'scalar' }, locs: [{ a: 566, b: 574 }] },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 627, b: 633 }] },
  ],
  statement:
    "SELECT \n    id, \n    COALESCE(title, full_name) as label, \n    location_lat as lat, \n    location_lng as lng,\n    mentions,\n    COALESCE(risk_level, 'LOW') as \"risk_level\",\n    COALESCE(red_flag_rating, 0) as \"risk_score\",\n    COALESCE(entity_type, 'Person') as type\nFROM entities \nWHERE \n    location_lat IS NOT NULL \n    AND location_lng IS NOT NULL \n    AND location_lat BETWEEN -90 AND 90 \n    AND location_lng BETWEEN -180 AND 180\n    AND COALESCE(junk_tier, 'clean') = 'clean'\n    AND COALESCE(quarantine_status, 0) = 0\n    AND COALESCE(red_flag_rating, 0) >= :minRisk!\nORDER BY mentions DESC, red_flag_rating DESC\nLIMIT :limit!",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     id,
 *     COALESCE(title, full_name) as label,
 *     location_lat as lat,
 *     location_lng as lng,
 *     mentions,
 *     COALESCE(risk_level, 'LOW') as "risk_level",
 *     COALESCE(red_flag_rating, 0) as "risk_score",
 *     COALESCE(entity_type, 'Person') as type
 * FROM entities
 * WHERE
 *     location_lat IS NOT NULL
 *     AND location_lng IS NOT NULL
 *     AND location_lat BETWEEN -90 AND 90
 *     AND location_lng BETWEEN -180 AND 180
 *     AND COALESCE(junk_tier, 'clean') = 'clean'
 *     AND COALESCE(quarantine_status, 0) = 0
 *     AND COALESCE(red_flag_rating, 0) >= :minRisk!
 * ORDER BY mentions DESC, red_flag_rating DESC
 * LIMIT :limit!
 * ```
 */
export const getMapEntities = new PreparedQuery<IGetMapEntitiesParams, IGetMapEntitiesResult>(
  getMapEntitiesIR,
);

/** 'ClearAdjacencyCache' parameters type */
export type IClearAdjacencyCacheParams = void;

/** 'ClearAdjacencyCache' return type */
export type IClearAdjacencyCacheResult = void;

/** 'ClearAdjacencyCache' query type */
export interface IClearAdjacencyCacheQuery {
  params: IClearAdjacencyCacheParams;
  result: IClearAdjacencyCacheResult;
}

const clearAdjacencyCacheIR: any = {
  usedParamSet: {},
  params: [],
  statement: 'DELETE FROM entity_adjacency',
};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM entity_adjacency
 * ```
 */
export const clearAdjacencyCache = new PreparedQuery<
  IClearAdjacencyCacheParams,
  IClearAdjacencyCacheResult
>(clearAdjacencyCacheIR);

/** 'InsertAdjacencyCache' parameters type */
export type IInsertAdjacencyCacheParams = void;

/** 'InsertAdjacencyCache' return type */
export type IInsertAdjacencyCacheResult = void;

/** 'InsertAdjacencyCache' query type */
export interface IInsertAdjacencyCacheQuery {
  params: IInsertAdjacencyCacheParams;
  result: IInsertAdjacencyCacheResult;
}

const insertAdjacencyCacheIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    "WITH base_canonical AS (\n  SELECT \n    s.canonical_id AS s_cid,\n    t.canonical_id AS t_cid,\n    er.proximity_score,\n    er.relationship_type,\n    er.risk_score,\n    er.confidence,\n    s.community_id AS s_comm,\n    t.community_id AS t_comm\n  FROM entity_relationships er\n  JOIN entities s ON er.source_entity_id = s.id\n  JOIN entities t ON er.target_entity_id = t.id\n  WHERE s.canonical_id != t.canonical_id\n),\nsymmetric_edges AS (\n  SELECT s_cid AS src, t_cid AS tgt, proximity_score, relationship_type, risk_score, confidence, s_comm, t_comm FROM base_canonical\n  UNION ALL\n  SELECT t_cid AS src, s_cid AS tgt, proximity_score, relationship_type, risk_score, confidence, t_comm, s_comm FROM base_canonical\n)\nINSERT INTO entity_adjacency (entity_id, neighbor_id, weight, bridge_score, relationship_types, risk_score, confidence)\nSELECT \n  src as entity_id,\n  tgt as neighbor_id,\n  MAX(proximity_score) as weight,\n  CASE WHEN s_comm != t_comm THEN 1.0 ELSE 0.0 END as bridge_score,\n  STRING_AGG(DISTINCT relationship_type, ',') as relationship_types,\n  MAX(risk_score) as risk_score,\n  MAX(confidence) as confidence\nFROM symmetric_edges\nGROUP BY src, tgt, s_comm, t_comm",
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
 * ```
 */
export const insertAdjacencyCache = new PreparedQuery<
  IInsertAdjacencyCacheParams,
  IInsertAdjacencyCacheResult
>(insertAdjacencyCacheIR);

/** 'UpdateGraphCacheState' parameters type */
export type IUpdateGraphCacheStateParams = void;

/** 'UpdateGraphCacheState' return type */
export type IUpdateGraphCacheStateResult = void;

/** 'UpdateGraphCacheState' query type */
export interface IUpdateGraphCacheStateQuery {
  params: IUpdateGraphCacheStateParams;
  result: IUpdateGraphCacheStateResult;
}

const updateGraphCacheStateIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    'UPDATE graph_cache_state SET last_rebuild = CURRENT_TIMESTAMP, is_dirty = 0 WHERE id = 1',
};

/**
 * Query generated from SQL:
 * ```
 * UPDATE graph_cache_state SET last_rebuild = CURRENT_TIMESTAMP, is_dirty = 0 WHERE id = 1
 * ```
 */
export const updateGraphCacheState = new PreparedQuery<
  IUpdateGraphCacheStateParams,
  IUpdateGraphCacheStateResult
>(updateGraphCacheStateIR);
