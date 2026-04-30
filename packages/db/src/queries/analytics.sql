/* @name getDocsByType */
SELECT
  type,
  count,
  sensitive AS redacted,
  avg_signal AS "avgRisk"
FROM mv_docs_by_type
ORDER BY count DESC;

/* @name getTimelineData */
SELECT
  period,
  total,
  emails,
  images AS photos,
  pdfs AS documents,
  0::bigint AS financial
FROM mv_timeline_data
ORDER BY (CASE WHEN period = 'Unknown' THEN '9999-99' ELSE period END) ASC;

/* @name getTopConnected */
SELECT
  id,
  name,
  role,
  type,
  risk_level AS "riskLevel",
  connection_count AS "connectionCount",
  mentions
FROM mv_top_connected
ORDER BY "connectionCount" DESC
LIMIT 100;

/* @name getEntityTypeDistribution */
SELECT
  type,
  count,
  avg_risk AS "avgRisk"
FROM mv_entity_type_dist
ORDER BY count DESC;

/* @name getRedactionStats */
SELECT
  total_documents AS "totalDocuments",
  redacted_documents AS "redactedDocuments",
  redaction_percentage AS "redactionPercentage",
  total_unredactions AS "totalRedactions"
FROM mv_redaction_stats;

/* @name getTopRelationships */
SELECT
  er.source_entity_id AS "sourceId",
  er.target_entity_id AS "targetId",
  e1.full_name AS source,
  e2.full_name AS target,
  er.relationship_type AS type,
  er.strength AS weight
FROM entity_relationships er
JOIN entities e1 ON er.source_entity_id = e1.id
JOIN entities e2 ON er.target_entity_id = e2.id
ORDER BY er.strength DESC
LIMIT 500;

/* @name getTotalCounts */
SELECT
  (SELECT COUNT(*)::integer FROM entities  WHERE COALESCE(junk_tier,'clean') = 'clean') AS entities,
  (SELECT COUNT(*)::integer FROM documents)                                               AS documents,
  (SELECT COUNT(*)::integer FROM documents WHERE evidence_type IS NOT NULL)               AS evidence_files,
  (SELECT COUNT(*)::integer FROM documents WHERE evidence_type IS NULL)                   AS unclassified_documents,
  (SELECT COUNT(*)::integer FROM entity_relationships)                                    AS relationships;

/* @name getReconciliationCounts */
SELECT
  (SELECT COUNT(*)::integer FROM documents WHERE evidence_type IS NULL) AS unclassified,
  (SELECT COUNT(*)::integer FROM documents
     WHERE date_created IS NULL
       OR date_created > '2026-12-31'::date) AS unknown_date;

/* @name recordWebVitals */
INSERT INTO web_vitals (session_id, route, cls, lcp, inp, long_task_count)
VALUES (:sessionId!, :route!, :cls!, :lcp!, :inp!, :longTaskCount!);

/* @name getWebVitalsAggregates */
SELECT 
  collected_at::date as date,
  route,
  COUNT(*)::integer as "sampleCount",
  percentile_cont(0.75) WITHIN GROUP (ORDER BY cls) as "p75Cls",
  percentile_cont(0.75) WITHIN GROUP (ORDER BY lcp) as "p75Lcp",
  percentile_cont(0.75) WITHIN GROUP (ORDER BY inp) as "p75Inp",
  AVG(long_task_count) as "avgLongTasks"
FROM web_vitals
WHERE collected_at >= CURRENT_DATE - (:days || ' days')::interval
GROUP BY date, route
ORDER BY date DESC, route;

/* @name getWebVitalsAggregatesAverage */
SELECT 
  collected_at::date as date,
  route,
  COUNT(*)::integer as "sampleCount",
  AVG(cls) as "avgCls",
  AVG(lcp) as "avgLcp",
  AVG(inp) as "avgInp",
  AVG(long_task_count) as "avgLongTasks"
FROM web_vitals
WHERE collected_at >= CURRENT_DATE - (:days || ' days')::interval
GROUP BY date, route
ORDER BY date DESC, route;

