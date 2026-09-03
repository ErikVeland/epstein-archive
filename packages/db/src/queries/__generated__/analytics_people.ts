/** Types generated for queries found in "src/queries/analytics_people.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

/** 'GetAnalyticsPeople' parameters type */
export type IGetAnalyticsPeopleParams = void;

/** 'GetAnalyticsPeople' return type */
export interface IGetAnalyticsPeopleResult {
  documentCount: number | null;
  id: string;
  isVip: number | null;
  name: string;
  relationshipCount: number | null;
  reviewed: number | null;
  storedMentions: number | null;
}

/** 'GetAnalyticsPeople' query type */
export interface IGetAnalyticsPeopleQuery {
  params: IGetAnalyticsPeopleParams;
  result: IGetAnalyticsPeopleResult;
}

const getAnalyticsPeopleIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    'WITH candidates AS (\n  SELECT id, full_name, is_vip, manually_reviewed, mentions\n  FROM entities\n  WHERE (is_vip = 1 OR manually_reviewed = 1)\n    AND COALESCE(junk_tier, \'clean\') = \'clean\'\n    AND COALESCE(quarantine_status, 0) = 0\n    AND lower(entity_type) = \'person\'\n    AND (canonical_id IS NULL OR canonical_id = id)\n    AND NULLIF(trim(full_name), \'\') IS NOT NULL\n  ORDER BY is_vip DESC NULLS LAST, mentions DESC NULLS LAST, id\n  LIMIT 500\n)\nSELECT c.id, c.full_name AS name, COALESCE(c.is_vip, 0) AS "isVip",\n  COALESCE(c.manually_reviewed, 0) AS reviewed,\n  c.mentions AS "storedMentions",\n  (SELECT count(DISTINCT em.document_id)::integer FROM entity_mentions em WHERE em.entity_id = c.id) AS "documentCount",\n  (SELECT count(*)::integer FROM entity_relationships er WHERE er.source_entity_id = c.id OR er.target_entity_id = c.id) AS "relationshipCount"\nFROM candidates c',
};

/**
 * Query generated from SQL:
 * ```
 * WITH candidates AS (
 *   SELECT id, full_name, is_vip, manually_reviewed, mentions
 *   FROM entities
 *   WHERE (is_vip = 1 OR manually_reviewed = 1)
 *     AND COALESCE(junk_tier, 'clean') = 'clean'
 *     AND COALESCE(quarantine_status, 0) = 0
 *     AND lower(entity_type) = 'person'
 *     AND (canonical_id IS NULL OR canonical_id = id)
 *     AND NULLIF(trim(full_name), '') IS NOT NULL
 *   ORDER BY is_vip DESC NULLS LAST, mentions DESC NULLS LAST, id
 *   LIMIT 500
 * )
 * SELECT c.id, c.full_name AS name, COALESCE(c.is_vip, 0) AS "isVip",
 *   COALESCE(c.manually_reviewed, 0) AS reviewed,
 *   c.mentions AS "storedMentions",
 *   (SELECT count(DISTINCT em.document_id)::integer FROM entity_mentions em WHERE em.entity_id = c.id) AS "documentCount",
 *   (SELECT count(*)::integer FROM entity_relationships er WHERE er.source_entity_id = c.id OR er.target_entity_id = c.id) AS "relationshipCount"
 * FROM candidates c
 * ```
 */
export const getAnalyticsPeople = new PreparedQuery<
  IGetAnalyticsPeopleParams,
  IGetAnalyticsPeopleResult
>(getAnalyticsPeopleIR);

/** 'GetAnalyticsPeers' parameters type */
export interface IGetAnalyticsPeersParams {
  entityId: NumberOrString;
}

/** 'GetAnalyticsPeers' return type */
export interface IGetAnalyticsPeersResult {
  id: string;
  isVip: number | null;
  name: string;
  relationshipCount: number | null;
  types: string | null;
}

/** 'GetAnalyticsPeers' query type */
export interface IGetAnalyticsPeersQuery {
  params: IGetAnalyticsPeersParams;
  result: IGetAnalyticsPeersResult;
}

const getAnalyticsPeersIR: any = {
  usedParamSet: { entityId: true },
  params: [
    {
      name: 'entityId',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 58, b: 67 },
        { a: 214, b: 223 },
        { a: 255, b: 264 },
        { a: 759, b: 768 },
      ],
    },
  ],
  statement:
    "WITH connected AS (\n  SELECT CASE WHEN source_entity_id = :entityId!::bigint THEN target_entity_id ELSE source_entity_id END AS peer_id,\n    relationship_type\n  FROM entity_relationships\n  WHERE source_entity_id = :entityId!::bigint OR target_entity_id = :entityId!::bigint\n)\nSELECT e.id, e.full_name AS name, COALESCE(e.is_vip, 0) AS \"isVip\",\n  count(*)::integer AS \"relationshipCount\",\n  string_agg(DISTINCT connected.relationship_type, ', ') AS types\nFROM connected JOIN entities e ON e.id = connected.peer_id\nWHERE (e.is_vip = 1 OR e.manually_reviewed = 1)\n  AND COALESCE(e.junk_tier, 'clean') = 'clean'\n  AND COALESCE(e.quarantine_status, 0) = 0\n  AND lower(e.entity_type) = 'person'\n  AND (e.canonical_id IS NULL OR e.canonical_id = e.id)\n  AND e.id != :entityId!::bigint\nGROUP BY e.id, e.full_name, e.is_vip\nORDER BY e.is_vip DESC NULLS LAST, count(*) DESC, e.full_name\nLIMIT 50",
};

/**
 * Query generated from SQL:
 * ```
 * WITH connected AS (
 *   SELECT CASE WHEN source_entity_id = :entityId!::bigint THEN target_entity_id ELSE source_entity_id END AS peer_id,
 *     relationship_type
 *   FROM entity_relationships
 *   WHERE source_entity_id = :entityId!::bigint OR target_entity_id = :entityId!::bigint
 * )
 * SELECT e.id, e.full_name AS name, COALESCE(e.is_vip, 0) AS "isVip",
 *   count(*)::integer AS "relationshipCount",
 *   string_agg(DISTINCT connected.relationship_type, ', ') AS types
 * FROM connected JOIN entities e ON e.id = connected.peer_id
 * WHERE (e.is_vip = 1 OR e.manually_reviewed = 1)
 *   AND COALESCE(e.junk_tier, 'clean') = 'clean'
 *   AND COALESCE(e.quarantine_status, 0) = 0
 *   AND lower(e.entity_type) = 'person'
 *   AND (e.canonical_id IS NULL OR e.canonical_id = e.id)
 *   AND e.id != :entityId!::bigint
 * GROUP BY e.id, e.full_name, e.is_vip
 * ORDER BY e.is_vip DESC NULLS LAST, count(*) DESC, e.full_name
 * LIMIT 50
 * ```
 */
export const getAnalyticsPeers = new PreparedQuery<
  IGetAnalyticsPeersParams,
  IGetAnalyticsPeersResult
>(getAnalyticsPeersIR);
