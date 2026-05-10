/** Types generated for queries found in "src/queries/analytics.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetDocsByType' parameters type */
export type IGetDocsByTypeParams = void;

/** 'GetDocsByType' return type */
export interface IGetDocsByTypeResult {
  avgRisk: string | null;
  count: string | null;
  redacted: string | null;
  type: string | null;
}

/** 'GetDocsByType' query type */
export interface IGetDocsByTypeQuery {
  params: IGetDocsByTypeParams;
  result: IGetDocsByTypeResult;
}

const getDocsByTypeIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    'SELECT\n  type,\n  count,\n  sensitive AS redacted,\n  avg_signal AS "avgRisk"\nFROM mv_docs_by_type\nORDER BY count DESC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   type,
 *   count,
 *   sensitive AS redacted,
 *   avg_signal AS "avgRisk"
 * FROM mv_docs_by_type
 * ORDER BY count DESC
 * ```
 */
export const getDocsByType = new PreparedQuery<IGetDocsByTypeParams, IGetDocsByTypeResult>(
  getDocsByTypeIR,
);

/** 'GetTimelineData' parameters type */
export type IGetTimelineDataParams = void;

/** 'GetTimelineData' return type */
export interface IGetTimelineDataResult {
  documents: string | null;
  emails: string | null;
  financial: string | null;
  period: string | null;
  photos: string | null;
  total: string | null;
}

/** 'GetTimelineData' query type */
export interface IGetTimelineDataQuery {
  params: IGetTimelineDataParams;
  result: IGetTimelineDataResult;
}

const getTimelineDataIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    "SELECT\n  period,\n  total,\n  emails,\n  images AS photos,\n  pdfs AS documents,\n  0::bigint AS financial\nFROM mv_timeline_data\nORDER BY (CASE WHEN period = 'Unknown' THEN '9999-99' ELSE period END) ASC",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   period,
 *   total,
 *   emails,
 *   images AS photos,
 *   pdfs AS documents,
 *   0::bigint AS financial
 * FROM mv_timeline_data
 * ORDER BY (CASE WHEN period = 'Unknown' THEN '9999-99' ELSE period END) ASC
 * ```
 */
export const getTimelineData = new PreparedQuery<IGetTimelineDataParams, IGetTimelineDataResult>(
  getTimelineDataIR,
);

/** 'GetTopConnected' parameters type */
export type IGetTopConnectedParams = void;

/** 'GetTopConnected' return type */
export interface IGetTopConnectedResult {
  connectionCount: string | null;
  id: string | null;
  mentions: number | null;
  name: string | null;
  riskLevel: number | null;
  role: string | null;
  type: string | null;
}

/** 'GetTopConnected' query type */
export interface IGetTopConnectedQuery {
  params: IGetTopConnectedParams;
  result: IGetTopConnectedResult;
}

const getTopConnectedIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    'SELECT\n  id,\n  name,\n  role,\n  type,\n  risk_level AS "riskLevel",\n  connection_count AS "connectionCount",\n  mentions\nFROM mv_top_connected\nORDER BY "connectionCount" DESC\nLIMIT 100',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   id,
 *   name,
 *   role,
 *   type,
 *   risk_level AS "riskLevel",
 *   connection_count AS "connectionCount",
 *   mentions
 * FROM mv_top_connected
 * ORDER BY "connectionCount" DESC
 * LIMIT 100
 * ```
 */
export const getTopConnected = new PreparedQuery<IGetTopConnectedParams, IGetTopConnectedResult>(
  getTopConnectedIR,
);

/** 'GetEntityTypeDistribution' parameters type */
export type IGetEntityTypeDistributionParams = void;

/** 'GetEntityTypeDistribution' return type */
export interface IGetEntityTypeDistributionResult {
  avgRisk: string | null;
  count: string | null;
  type: string | null;
}

/** 'GetEntityTypeDistribution' query type */
export interface IGetEntityTypeDistributionQuery {
  params: IGetEntityTypeDistributionParams;
  result: IGetEntityTypeDistributionResult;
}

const getEntityTypeDistributionIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    'SELECT\n  type,\n  count,\n  avg_risk AS "avgRisk"\nFROM mv_entity_type_dist\nORDER BY count DESC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   type,
 *   count,
 *   avg_risk AS "avgRisk"
 * FROM mv_entity_type_dist
 * ORDER BY count DESC
 * ```
 */
export const getEntityTypeDistribution = new PreparedQuery<
  IGetEntityTypeDistributionParams,
  IGetEntityTypeDistributionResult
>(getEntityTypeDistributionIR);

/** 'GetRedactionStats' parameters type */
export type IGetRedactionStatsParams = void;

/** 'GetRedactionStats' return type */
export interface IGetRedactionStatsResult {
  redactedDocuments: string | null;
  redactionPercentage: string | null;
  totalDocuments: string | null;
  totalRedactions: string | null;
}

/** 'GetRedactionStats' query type */
export interface IGetRedactionStatsQuery {
  params: IGetRedactionStatsParams;
  result: IGetRedactionStatsResult;
}

const getRedactionStatsIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    'SELECT\n  total_documents AS "totalDocuments",\n  redacted_documents AS "redactedDocuments",\n  redaction_percentage AS "redactionPercentage",\n  total_unredactions AS "totalRedactions"\nFROM mv_redaction_stats',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   total_documents AS "totalDocuments",
 *   redacted_documents AS "redactedDocuments",
 *   redaction_percentage AS "redactionPercentage",
 *   total_unredactions AS "totalRedactions"
 * FROM mv_redaction_stats
 * ```
 */
export const getRedactionStats = new PreparedQuery<
  IGetRedactionStatsParams,
  IGetRedactionStatsResult
>(getRedactionStatsIR);

/** 'GetTopRelationships' parameters type */
export type IGetTopRelationshipsParams = void;

/** 'GetTopRelationships' return type */
export interface IGetTopRelationshipsResult {
  source: string;
  sourceId: string;
  target: string;
  targetId: string;
  type: string;
  weight: number | null;
}

/** 'GetTopRelationships' query type */
export interface IGetTopRelationshipsQuery {
  params: IGetTopRelationshipsParams;
  result: IGetTopRelationshipsResult;
}

const getTopRelationshipsIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    'SELECT\n  er.source_entity_id AS "sourceId",\n  er.target_entity_id AS "targetId",\n  e1.full_name AS source,\n  e2.full_name AS target,\n  er.relationship_type AS type,\n  er.strength AS weight\nFROM entity_relationships er\nJOIN entities e1 ON er.source_entity_id = e1.id\nJOIN entities e2 ON er.target_entity_id = e2.id\nORDER BY er.strength DESC\nLIMIT 500',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   er.source_entity_id AS "sourceId",
 *   er.target_entity_id AS "targetId",
 *   e1.full_name AS source,
 *   e2.full_name AS target,
 *   er.relationship_type AS type,
 *   er.strength AS weight
 * FROM entity_relationships er
 * JOIN entities e1 ON er.source_entity_id = e1.id
 * JOIN entities e2 ON er.target_entity_id = e2.id
 * ORDER BY er.strength DESC
 * LIMIT 500
 * ```
 */
export const getTopRelationships = new PreparedQuery<
  IGetTopRelationshipsParams,
  IGetTopRelationshipsResult
>(getTopRelationshipsIR);

/** 'GetTotalCounts' parameters type */
export type IGetTotalCountsParams = void;

/** 'GetTotalCounts' return type */
export interface IGetTotalCountsResult {
  documents: number | null;
  entities: number | null;
  evidence_files: number | null;
  relationships: number | null;
  unclassified_documents: number | null;
}

/** 'GetTotalCounts' query type */
export interface IGetTotalCountsQuery {
  params: IGetTotalCountsParams;
  result: IGetTotalCountsResult;
}

const getTotalCountsIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    "SELECT\n  (SELECT COUNT(*)::integer FROM entities  WHERE COALESCE(junk_tier,'clean') = 'clean') AS entities,\n  (SELECT COUNT(*)::integer FROM documents)                                               AS documents,\n  (SELECT COUNT(*)::integer FROM documents WHERE evidence_type IS NOT NULL)               AS evidence_files,\n  (SELECT COUNT(*)::integer FROM documents WHERE evidence_type IS NULL)                   AS unclassified_documents,\n  (SELECT COUNT(*)::integer FROM entity_relationships)                                    AS relationships",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   (SELECT COUNT(*)::integer FROM entities  WHERE COALESCE(junk_tier,'clean') = 'clean') AS entities,
 *   (SELECT COUNT(*)::integer FROM documents)                                               AS documents,
 *   (SELECT COUNT(*)::integer FROM documents WHERE evidence_type IS NOT NULL)               AS evidence_files,
 *   (SELECT COUNT(*)::integer FROM documents WHERE evidence_type IS NULL)                   AS unclassified_documents,
 *   (SELECT COUNT(*)::integer FROM entity_relationships)                                    AS relationships
 * ```
 */
export const getTotalCounts = new PreparedQuery<IGetTotalCountsParams, IGetTotalCountsResult>(
  getTotalCountsIR,
);

/** 'GetReconciliationCounts' parameters type */
export type IGetReconciliationCountsParams = void;

/** 'GetReconciliationCounts' return type */
export interface IGetReconciliationCountsResult {
  unclassified: number | null;
  unknown_date: number | null;
}

/** 'GetReconciliationCounts' query type */
export interface IGetReconciliationCountsQuery {
  params: IGetReconciliationCountsParams;
  result: IGetReconciliationCountsResult;
}

const getReconciliationCountsIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    "SELECT\n  (SELECT COUNT(*)::integer FROM documents WHERE evidence_type IS NULL) AS unclassified,\n  (SELECT COUNT(*)::integer FROM documents\n     WHERE date_created IS NULL\n       OR date_created > '2026-12-31'::date) AS unknown_date",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   (SELECT COUNT(*)::integer FROM documents WHERE evidence_type IS NULL) AS unclassified,
 *   (SELECT COUNT(*)::integer FROM documents
 *      WHERE date_created IS NULL
 *        OR date_created > '2026-12-31'::date) AS unknown_date
 * ```
 */
export const getReconciliationCounts = new PreparedQuery<
  IGetReconciliationCountsParams,
  IGetReconciliationCountsResult
>(getReconciliationCountsIR);

/** 'RecordWebVitals' parameters type */
export interface IRecordWebVitalsParams {
  cls: number;
  inp: number;
  lcp: number;
  longTaskCount: number;
  route: string;
  sessionId: string;
}

/** 'RecordWebVitals' return type */
export type IRecordWebVitalsResult = void;

/** 'RecordWebVitals' query type */
export interface IRecordWebVitalsQuery {
  params: IRecordWebVitalsParams;
  result: IRecordWebVitalsResult;
}

const recordWebVitalsIR: any = {
  usedParamSet: {
    sessionId: true,
    route: true,
    cls: true,
    lcp: true,
    inp: true,
    longTaskCount: true,
  },
  params: [
    { name: 'sessionId', required: true, transform: { type: 'scalar' }, locs: [{ a: 83, b: 93 }] },
    { name: 'route', required: true, transform: { type: 'scalar' }, locs: [{ a: 96, b: 102 }] },
    { name: 'cls', required: true, transform: { type: 'scalar' }, locs: [{ a: 105, b: 109 }] },
    { name: 'lcp', required: true, transform: { type: 'scalar' }, locs: [{ a: 112, b: 116 }] },
    { name: 'inp', required: true, transform: { type: 'scalar' }, locs: [{ a: 119, b: 123 }] },
    {
      name: 'longTaskCount',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 126, b: 140 }],
    },
  ],
  statement:
    'INSERT INTO web_vitals (session_id, route, cls, lcp, inp, long_task_count)\nVALUES (:sessionId!, :route!, :cls!, :lcp!, :inp!, :longTaskCount!)',
};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO web_vitals (session_id, route, cls, lcp, inp, long_task_count)
 * VALUES (:sessionId!, :route!, :cls!, :lcp!, :inp!, :longTaskCount!)
 * ```
 */
export const recordWebVitals = new PreparedQuery<IRecordWebVitalsParams, IRecordWebVitalsResult>(
  recordWebVitalsIR,
);

/** 'GetWebVitalsAggregates' parameters type */
export interface IGetWebVitalsAggregatesParams {
  days?: string | null | void;
}

/** 'GetWebVitalsAggregates' return type */
export interface IGetWebVitalsAggregatesResult {
  avgLongTasks: string | null;
  date: Date | null;
  p75Cls: number | null;
  p75Inp: number | null;
  p75Lcp: number | null;
  route: string;
  sampleCount: number | null;
}

/** 'GetWebVitalsAggregates' query type */
export interface IGetWebVitalsAggregatesQuery {
  params: IGetWebVitalsAggregatesParams;
  result: IGetWebVitalsAggregatesResult;
}

const getWebVitalsAggregatesIR: any = {
  usedParamSet: { days: true },
  params: [
    { name: 'days', required: false, transform: { type: 'scalar' }, locs: [{ a: 375, b: 379 }] },
  ],
  statement:
    'SELECT \n  collected_at::date as date,\n  route,\n  COUNT(*)::integer as "sampleCount",\n  percentile_cont(0.75) WITHIN GROUP (ORDER BY cls) as "p75Cls",\n  percentile_cont(0.75) WITHIN GROUP (ORDER BY lcp) as "p75Lcp",\n  percentile_cont(0.75) WITHIN GROUP (ORDER BY inp) as "p75Inp",\n  AVG(long_task_count) as "avgLongTasks"\nFROM web_vitals\nWHERE collected_at >= CURRENT_DATE - (:days || \' days\')::interval\nGROUP BY date, route\nORDER BY date DESC, route',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   collected_at::date as date,
 *   route,
 *   COUNT(*)::integer as "sampleCount",
 *   percentile_cont(0.75) WITHIN GROUP (ORDER BY cls) as "p75Cls",
 *   percentile_cont(0.75) WITHIN GROUP (ORDER BY lcp) as "p75Lcp",
 *   percentile_cont(0.75) WITHIN GROUP (ORDER BY inp) as "p75Inp",
 *   AVG(long_task_count) as "avgLongTasks"
 * FROM web_vitals
 * WHERE collected_at >= CURRENT_DATE - (:days || ' days')::interval
 * GROUP BY date, route
 * ORDER BY date DESC, route
 * ```
 */
export const getWebVitalsAggregates = new PreparedQuery<
  IGetWebVitalsAggregatesParams,
  IGetWebVitalsAggregatesResult
>(getWebVitalsAggregatesIR);

/** 'GetWebVitalsAggregatesAverage' parameters type */
export interface IGetWebVitalsAggregatesAverageParams {
  days?: string | null | void;
}

/** 'GetWebVitalsAggregatesAverage' return type */
export interface IGetWebVitalsAggregatesAverageResult {
  avgCls: number | null;
  avgInp: number | null;
  avgLcp: number | null;
  avgLongTasks: string | null;
  date: Date | null;
  route: string;
  sampleCount: number | null;
}

/** 'GetWebVitalsAggregatesAverage' query type */
export interface IGetWebVitalsAggregatesAverageQuery {
  params: IGetWebVitalsAggregatesAverageParams;
  result: IGetWebVitalsAggregatesAverageResult;
}

const getWebVitalsAggregatesAverageIR: any = {
  usedParamSet: { days: true },
  params: [
    { name: 'days', required: false, transform: { type: 'scalar' }, locs: [{ a: 252, b: 256 }] },
  ],
  statement:
    'SELECT \n  collected_at::date as date,\n  route,\n  COUNT(*)::integer as "sampleCount",\n  AVG(cls) as "avgCls",\n  AVG(lcp) as "avgLcp",\n  AVG(inp) as "avgInp",\n  AVG(long_task_count) as "avgLongTasks"\nFROM web_vitals\nWHERE collected_at >= CURRENT_DATE - (:days || \' days\')::interval\nGROUP BY date, route\nORDER BY date DESC, route',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   collected_at::date as date,
 *   route,
 *   COUNT(*)::integer as "sampleCount",
 *   AVG(cls) as "avgCls",
 *   AVG(lcp) as "avgLcp",
 *   AVG(inp) as "avgInp",
 *   AVG(long_task_count) as "avgLongTasks"
 * FROM web_vitals
 * WHERE collected_at >= CURRENT_DATE - (:days || ' days')::interval
 * GROUP BY date, route
 * ORDER BY date DESC, route
 * ```
 */
export const getWebVitalsAggregatesAverage = new PreparedQuery<
  IGetWebVitalsAggregatesAverageParams,
  IGetWebVitalsAggregatesAverageResult
>(getWebVitalsAggregatesAverageIR);
