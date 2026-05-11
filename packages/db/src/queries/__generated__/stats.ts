/** Types generated for queries found in "src/queries/stats.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

/** Query 'GetGlobalStats' is invalid, so its result is assigned type 'never'.
 *  */
export type IGetGlobalStatsResult = never;

/** Query 'GetGlobalStats' is invalid, so its parameters are assigned type 'never'.
 *  */
export type IGetGlobalStatsParams = never;

const getGlobalStatsIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    'SELECT\n  COUNT(*)::integer as "totalEntities",\n  SUM(COALESCE(mentions, 0)) as "totalMentions",\n  AVG(COALESCE(red_flag_rating, 0)) as "averageRedFlagRating",\n  COUNT(DISTINCT CASE WHEN primary_role IS NOT NULL AND primary_role != \'\' THEN primary_role END) as "totalUniqueRoles",\n  COUNT(*)::integer FILTER (WHERE mentions > 0) as "entitiesWithDocuments",\n  (SELECT COUNT(*)::integer FROM documents) as "totalDocuments",\n  (SELECT COUNT(*)::integer FROM documents WHERE metadata_json IS NOT NULL AND (jsonb_typeof(metadata_json) = \'object\' AND metadata_json <> \'{}\'::jsonb)) as "documentsWithMetadata",\n  (SELECT COUNT(*)::integer FROM documents WHERE content_refined IS NOT NULL) as "documentsFixed"\nFROM entities',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   COUNT(*)::integer as "totalEntities",
 *   SUM(COALESCE(mentions, 0)) as "totalMentions",
 *   AVG(COALESCE(red_flag_rating, 0)) as "averageRedFlagRating",
 *   COUNT(DISTINCT CASE WHEN primary_role IS NOT NULL AND primary_role != '' THEN primary_role END) as "totalUniqueRoles",
 *   COUNT(*)::integer FILTER (WHERE mentions > 0) as "entitiesWithDocuments",
 *   (SELECT COUNT(*)::integer FROM documents) as "totalDocuments",
 *   (SELECT COUNT(*)::integer FROM documents WHERE metadata_json IS NOT NULL AND (jsonb_typeof(metadata_json) = 'object' AND metadata_json <> '{}'::jsonb)) as "documentsWithMetadata",
 *   (SELECT COUNT(*)::integer FROM documents WHERE content_refined IS NOT NULL) as "documentsFixed"
 * FROM entities
 * ```
 */
export const getGlobalStats = new PreparedQuery<IGetGlobalStatsParams, IGetGlobalStatsResult>(
  getGlobalStatsIR,
);

/** 'GetRiskDistribution' parameters type */
export type IGetRiskDistributionParams = void;

/** 'GetRiskDistribution' return type */
export interface IGetRiskDistributionResult {
  count: number | null;
  level: string | null;
}

/** 'GetRiskDistribution' query type */
export interface IGetRiskDistributionQuery {
  params: IGetRiskDistributionParams;
  result: IGetRiskDistributionResult;
}

const getRiskDistributionIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    "SELECT\n  COALESCE(risk_level, 'LOW') as level,\n  COUNT(*)::integer as count\nFROM entities\nGROUP BY risk_level",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   COALESCE(risk_level, 'LOW') as level,
 *   COUNT(*)::integer as count
 * FROM entities
 * GROUP BY risk_level
 * ```
 */
export const getRiskDistribution = new PreparedQuery<
  IGetRiskDistributionParams,
  IGetRiskDistributionResult
>(getRiskDistributionIR);

/** 'GetRedFlagDistribution' parameters type */
export type IGetRedFlagDistributionParams = void;

/** 'GetRedFlagDistribution' return type */
export interface IGetRedFlagDistributionResult {
  count: number | null;
  rating: number | null;
}

/** 'GetRedFlagDistribution' query type */
export interface IGetRedFlagDistributionQuery {
  params: IGetRedFlagDistributionParams;
  result: IGetRedFlagDistributionResult;
}

const getRedFlagDistributionIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    'SELECT\n  red_flag_rating as rating,\n  COUNT(*)::integer as count\nFROM entities\nWHERE red_flag_rating IS NOT NULL\nGROUP BY red_flag_rating\nORDER BY red_flag_rating ASC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   red_flag_rating as rating,
 *   COUNT(*)::integer as count
 * FROM entities
 * WHERE red_flag_rating IS NOT NULL
 * GROUP BY red_flag_rating
 * ORDER BY red_flag_rating ASC
 * ```
 */
export const getRedFlagDistribution = new PreparedQuery<
  IGetRedFlagDistributionParams,
  IGetRedFlagDistributionResult
>(getRedFlagDistributionIR);

/** 'GetTopRoles' parameters type */
export interface IGetTopRolesParams {
  limit: NumberOrString;
}

/** 'GetTopRoles' return type */
export interface IGetTopRolesResult {
  count: number | null;
  role: string | null;
}

/** 'GetTopRoles' query type */
export interface IGetTopRolesQuery {
  params: IGetTopRolesParams;
  result: IGetTopRolesResult;
}

const getTopRolesIR: any = {
  usedParamSet: { limit: true },
  params: [
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 175, b: 181 }] },
  ],
  statement:
    "SELECT primary_role as role, COUNT(*)::integer as count \nFROM entities \nWHERE primary_role IS NOT NULL AND primary_role != ''\nGROUP BY primary_role \nORDER BY count DESC\nLIMIT :limit!",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT primary_role as role, COUNT(*)::integer as count
 * FROM entities
 * WHERE primary_role IS NOT NULL AND primary_role != ''
 * GROUP BY primary_role
 * ORDER BY count DESC
 * LIMIT :limit!
 * ```
 */
export const getTopRoles = new PreparedQuery<IGetTopRolesParams, IGetTopRolesResult>(getTopRolesIR);

/** 'GetTopEntities' parameters type */
export interface IGetTopEntitiesParams {
  limit: NumberOrString;
}

/** 'GetTopEntities' return type */
export interface IGetTopEntitiesResult {
  bio: string | null;
  entityType: string | null;
  mentions: string | null;
  name: string | null;
  primaryRole: string | null;
  redFlagDescription: string | null;
  redFlagRating: number | null;
}

/** 'GetTopEntities' query type */
export interface IGetTopEntitiesQuery {
  params: IGetTopEntitiesParams;
  result: IGetTopEntitiesResult;
}

const getTopEntitiesIR: any = {
  usedParamSet: { limit: true },
  params: [
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 1586, b: 1592 }] },
  ],
  statement:
    "SELECT \n  CASE \n    WHEN (full_name IN ('Donald Trump', 'President Trump', 'Mr Trump', 'Trump', 'Donald J Trump', 'Donald J. Trump')) THEN 'Donald Trump'\n    WHEN (full_name IN ('Jeffrey Epstein', 'Epstein', 'Jeffrey', 'Jeff Epstein', 'Mr Epstein')) THEN 'Jeffrey Epstein'\n    WHEN (full_name IN ('Ghislaine Maxwell', 'Maxwell', 'Ghislaine', 'Ms Maxwell', 'Miss Maxwell')) THEN 'Ghislaine Maxwell'\n    WHEN (full_name IN ('Bill Clinton', 'President Clinton', 'Mr Clinton', 'Clinton', 'William Clinton')) \n         AND lower(full_name) NOT LIKE '%hillary%' AND lower(full_name) NOT LIKE '%chelsea%' THEN 'Bill Clinton'\n    WHEN (full_name IN ('Prince Andrew', 'Duke of York', 'Andrew') OR lower(full_name) LIKE '%prince andrew%') THEN 'Prince Andrew'\n    WHEN (full_name IN ('Alan Dershowitz', 'Dershowitz', 'Mr Dershowitz')) THEN 'Alan Dershowitz'\n    WHEN (full_name IN ('Ivanka Trump', 'Ivanka')) THEN 'Ivanka Trump'\n    WHEN (full_name IN ('Melania Trump', 'Melania')) THEN 'Melania Trump'\n    ELSE full_name\n  END as name,\n  SUM(mentions) as mentions,\n  MAX(red_flag_rating) as \"redFlagRating\",\n  MAX(bio) as bio,\n  MAX(primary_role) as \"primaryRole\",\n  MAX(entity_type) as \"entityType\",\n  MAX(red_flag_description) as \"redFlagDescription\"\nFROM entities\nWHERE mentions > 0 \nAND (entity_type = 'Person' OR entity_type IS NULL)\nAND full_name NOT LIKE 'The %'\nAND full_name NOT LIKE '% Like'\nAND full_name NOT LIKE 'They %'\nAND length(full_name) > 3\nAND full_name NOT LIKE '%Group'\nAND full_name NOT LIKE '%Inc'\nAND full_name NOT LIKE '%LLC'\nGROUP BY name\nORDER BY mentions DESC\nLIMIT :limit!",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   CASE
 *     WHEN (full_name IN ('Donald Trump', 'President Trump', 'Mr Trump', 'Trump', 'Donald J Trump', 'Donald J. Trump')) THEN 'Donald Trump'
 *     WHEN (full_name IN ('Jeffrey Epstein', 'Epstein', 'Jeffrey', 'Jeff Epstein', 'Mr Epstein')) THEN 'Jeffrey Epstein'
 *     WHEN (full_name IN ('Ghislaine Maxwell', 'Maxwell', 'Ghislaine', 'Ms Maxwell', 'Miss Maxwell')) THEN 'Ghislaine Maxwell'
 *     WHEN (full_name IN ('Bill Clinton', 'President Clinton', 'Mr Clinton', 'Clinton', 'William Clinton'))
 *          AND lower(full_name) NOT LIKE '%hillary%' AND lower(full_name) NOT LIKE '%chelsea%' THEN 'Bill Clinton'
 *     WHEN (full_name IN ('Prince Andrew', 'Duke of York', 'Andrew') OR lower(full_name) LIKE '%prince andrew%') THEN 'Prince Andrew'
 *     WHEN (full_name IN ('Alan Dershowitz', 'Dershowitz', 'Mr Dershowitz')) THEN 'Alan Dershowitz'
 *     WHEN (full_name IN ('Ivanka Trump', 'Ivanka')) THEN 'Ivanka Trump'
 *     WHEN (full_name IN ('Melania Trump', 'Melania')) THEN 'Melania Trump'
 *     ELSE full_name
 *   END as name,
 *   SUM(mentions) as mentions,
 *   MAX(red_flag_rating) as "redFlagRating",
 *   MAX(bio) as bio,
 *   MAX(primary_role) as "primaryRole",
 *   MAX(entity_type) as "entityType",
 *   MAX(red_flag_description) as "redFlagDescription"
 * FROM entities
 * WHERE mentions > 0
 * AND (entity_type = 'Person' OR entity_type IS NULL)
 * AND full_name NOT LIKE 'The %'
 * AND full_name NOT LIKE '% Like'
 * AND full_name NOT LIKE 'They %'
 * AND length(full_name) > 3
 * AND full_name NOT LIKE '%Group'
 * AND full_name NOT LIKE '%Inc'
 * AND full_name NOT LIKE '%LLC'
 * GROUP BY name
 * ORDER BY mentions DESC
 * LIMIT :limit!
 * ```
 */
export const getTopEntities = new PreparedQuery<IGetTopEntitiesParams, IGetTopEntitiesResult>(
  getTopEntitiesIR,
);

/** 'GetCollectionCounts' parameters type */
export type IGetCollectionCountsParams = void;

/** 'GetCollectionCounts' return type */
export interface IGetCollectionCountsResult {
  count: number | null;
  sourceCollection: string | null;
}

/** 'GetCollectionCounts' query type */
export interface IGetCollectionCountsQuery {
  params: IGetCollectionCountsParams;
  result: IGetCollectionCountsResult;
}

const getCollectionCountsIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    'SELECT source_collection as "sourceCollection", COUNT(*)::integer as count \nFROM documents \nWHERE source_collection IS NOT NULL \nGROUP BY source_collection',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT source_collection as "sourceCollection", COUNT(*)::integer as count
 * FROM documents
 * WHERE source_collection IS NOT NULL
 * GROUP BY source_collection
 * ```
 */
export const getCollectionCounts = new PreparedQuery<
  IGetCollectionCountsParams,
  IGetCollectionCountsResult
>(getCollectionCountsIR);

/** 'GetActiveInvestigationsCount' parameters type */
export type IGetActiveInvestigationsCountParams = void;

/** 'GetActiveInvestigationsCount' return type */
export interface IGetActiveInvestigationsCountResult {
  count: number | null;
}

/** 'GetActiveInvestigationsCount' query type */
export interface IGetActiveInvestigationsCountQuery {
  params: IGetActiveInvestigationsCountParams;
  result: IGetActiveInvestigationsCountResult;
}

const getActiveInvestigationsCountIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    "SELECT COUNT(*)::integer as count FROM investigations WHERE status IN ('active', 'open')",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT COUNT(*)::integer as count FROM investigations WHERE status IN ('active', 'open')
 * ```
 */
export const getActiveInvestigationsCount = new PreparedQuery<
  IGetActiveInvestigationsCountParams,
  IGetActiveInvestigationsCountResult
>(getActiveInvestigationsCountIR);

/** 'GetRecentProcessedCount' parameters type */
export interface IGetRecentProcessedCountParams {
  seconds: number;
}

/** 'GetRecentProcessedCount' return type */
export interface IGetRecentProcessedCountResult {
  count: number | null;
}

/** 'GetRecentProcessedCount' query type */
export interface IGetRecentProcessedCountQuery {
  params: IGetRecentProcessedCountParams;
  result: IGetRecentProcessedCountResult;
}

const getRecentProcessedCountIR: any = {
  usedParamSet: { seconds: true },
  params: [
    { name: 'seconds', required: true, transform: { type: 'scalar' }, locs: [{ a: 120, b: 128 }] },
  ],
  statement:
    "SELECT COUNT(*)::integer as count \nFROM documents \nWHERE last_processed_at > CURRENT_TIMESTAMP - (INTERVAL '1 second' * :seconds!)",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT COUNT(*)::integer as count
 * FROM documents
 * WHERE last_processed_at > CURRENT_TIMESTAMP - (INTERVAL '1 second' * :seconds!)
 * ```
 */
export const getRecentProcessedCount = new PreparedQuery<
  IGetRecentProcessedCountParams,
  IGetRecentProcessedCountResult
>(getRecentProcessedCountIR);

/** 'GetActiveWorkersCount' parameters type */
export type IGetActiveWorkersCountParams = void;

/** 'GetActiveWorkersCount' return type */
export interface IGetActiveWorkersCountResult {
  count: string | null;
}

/** 'GetActiveWorkersCount' query type */
export interface IGetActiveWorkersCountQuery {
  params: IGetActiveWorkersCountParams;
  result: IGetActiveWorkersCountResult;
}

const getActiveWorkersCountIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    "SELECT COUNT(DISTINCT worker_id) as count \nFROM documents \nWHERE processing_status = 'processing' \n  AND lease_expires_at > CURRENT_TIMESTAMP",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT COUNT(DISTINCT worker_id) as count
 * FROM documents
 * WHERE processing_status = 'processing'
 *   AND lease_expires_at > CURRENT_TIMESTAMP
 * ```
 */
export const getActiveWorkersCount = new PreparedQuery<
  IGetActiveWorkersCountParams,
  IGetActiveWorkersCountResult
>(getActiveWorkersCountIR);

/** 'GetTimelineEvents' parameters type */
export interface IGetTimelineEventsParams {
  limit: NumberOrString;
}

/** 'GetTimelineEvents' return type */
export interface IGetTimelineEventsResult {
  date: Date;
  description: string | null;
  document_id: string | null;
  primary_entity: string | null;
  significance_score: string | null;
  title: string;
  type: string | null;
}

/** 'GetTimelineEvents' query type */
export interface IGetTimelineEventsQuery {
  params: IGetTimelineEventsParams;
  result: IGetTimelineEventsResult;
}

const getTimelineEventsIR: any = {
  usedParamSet: { limit: true },
  params: [
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 259, b: 265 }] },
  ],
  statement:
    'SELECT \n  te.date,\n  te.description,\n  te.type,\n  te.title,\n  te.related_document_id as document_id,\n  te.entities as primary_entity,\n  te.significance as significance_score\nFROM global_timeline_events te\nWHERE te.date IS NOT NULL\nORDER BY te.date DESC\nLIMIT :limit!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   te.date,
 *   te.description,
 *   te.type,
 *   te.title,
 *   te.related_document_id as document_id,
 *   te.entities as primary_entity,
 *   te.significance as significance_score
 * FROM global_timeline_events te
 * WHERE te.date IS NOT NULL
 * ORDER BY te.date DESC
 * LIMIT :limit!
 * ```
 */
export const getTimelineEvents = new PreparedQuery<
  IGetTimelineEventsParams,
  IGetTimelineEventsResult
>(getTimelineEventsIR);
