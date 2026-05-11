/* @name getGraphCommunities */
SELECT 
    'community-' || community_id as id,
    (
        SELECT full_name 
        FROM entities e2 
        WHERE e2.community_id = entities.community_id 
        ORDER BY red_flag_rating DESC, mentions DESC 
        LIMIT 1
    ) || ' Group' as label,
    'cluster' as type,
    MAX(red_flag_rating) as risk,
    COUNT(*)::integer as size,
    SUM(mentions) as mentions
FROM entities
WHERE community_id IS NOT NULL AND entity_type = 'Person'
GROUP BY community_id
HAVING COUNT(*)::integer > 10
ORDER BY size DESC
LIMIT 50;

/* @name getGraphNeighbors */
SELECT t.canonical_id as "canonicalId", MAX(er.strength) as weight 
FROM entity_relationships er
JOIN entities s ON er.source_entity_id = s.id
JOIN entities t ON er.target_entity_id = t.id
WHERE s.canonical_id = :sourceCanonicalId!::bigint
  AND (:endDate::timestamptz IS NULL OR er.first_seen_at <= :endDate::timestamptz)
  AND (:startDate::timestamptz IS NULL OR er.last_seen_at >= :startDate::timestamptz)
GROUP BY t.canonical_id;

/* @name getGraphPathNodes */
SELECT 
    canonical_id as id, 
    MAX(full_name) as label, 
    MAX(red_flag_rating) as risk, 
    MAX(primary_role) as type,
    SUM(mentions) as val,
    MAX(community_id) as community
FROM entities 
WHERE canonical_id = ANY(:pathNodes!::bigint[])
GROUP BY canonical_id;

/* @name getGraphPathEdges */
SELECT 
    s.canonical_id as source, 
    t.canonical_id as target, 
    er.relationship_type as type,
    MAX(er.strength) as weight,
    MAX(er.confidence) as confidence,
    CASE 
        WHEN er.relationship_type LIKE '%infer%' OR MAX(er.confidence) < 0.8 THEN 'INFERRED' 
        ELSE 'EVIDENCE_BACKED' 
    END as classification
FROM entity_relationships er
JOIN entities s ON er.source_entity_id = s.id
JOIN entities t ON er.target_entity_id = t.id
WHERE s.canonical_id = ANY(:pathNodes!::bigint[]) 
  AND t.canonical_id = ANY(:pathNodes!::bigint[])
  AND (:endDate::timestamptz IS NULL OR er.first_seen_at <= :endDate::timestamptz)
  AND (:startDate::timestamptz IS NULL OR er.last_seen_at >= :startDate::timestamptz)
GROUP BY s.canonical_id, t.canonical_id, er.relationship_type;

/* @name getGlobalGraphNodes */
WITH candidate_entities AS (
    SELECT id FROM entities WHERE entity_type = 'Person' AND red_flag_rating >= :minRisk!
),
rel_counts AS (
SELECT entity_id, SUM(cnt) as degree FROM (
    SELECT source_entity_id as entity_id, COUNT(*)::integer as cnt FROM entity_relationships 
    WHERE source_entity_id IN (SELECT id FROM candidate_entities)
      AND (:endDate::timestamptz IS NULL OR first_seen_at <= :endDate::timestamptz) 
      AND (:startDate::timestamptz IS NULL OR last_seen_at >= :startDate::timestamptz)
    GROUP BY source_entity_id
    UNION ALL
    SELECT target_entity_id as entity_id, COUNT(*)::integer as cnt FROM entity_relationships 
    WHERE target_entity_id IN (SELECT id FROM candidate_entities)
      AND (:endDate::timestamptz IS NULL OR first_seen_at <= :endDate::timestamptz) 
      AND (:startDate::timestamptz IS NULL OR last_seen_at >= :startDate::timestamptz)
    GROUP BY target_entity_id
) t
GROUP BY entity_id
)
SELECT 
e.canonical_id as id,
MAX(e.full_name) as label, 
MAX(e.primary_role) as type,
MAX(e.red_flag_rating) as risk,
SUM(COALESCE(rc.degree, 0)) as "connectionCount",
SUM(e.mentions) as mentions,
MAX(e.entity_type) as entity_type,
MAX(e.community_id) as community_id
FROM entities e
LEFT JOIN rel_counts rc ON e.id = rc.entity_id
WHERE e.entity_type = 'Person' 
    AND (e.red_flag_rating >= :minRisk!)
GROUP BY e.canonical_id
ORDER BY risk DESC, "connectionCount" DESC
LIMIT :limit!;

/* @name getGlobalGraphEdges */
SELECT 
    s.canonical_id as source,
    t.canonical_id as target,
    er.relationship_type as type,
    MAX(er.strength) as weight,
    MAX(er.confidence) as confidence,
    CASE 
        WHEN er.relationship_type LIKE '%infer%' OR er.relationship_type LIKE '%agentic%' OR MAX(er.confidence) < 0.8 
        THEN 'INFERRED' 
        ELSE 'EVIDENCE_BACKED' 
    END as classification
FROM entity_relationships er
JOIN entities s ON er.source_entity_id = s.id
JOIN entities t ON er.target_entity_id = t.id
WHERE s.canonical_id = ANY(:canonicalIds!::bigint[])
    AND t.canonical_id = ANY(:canonicalIds!::bigint[])
    AND s.canonical_id != t.canonical_id
    AND (:endDate::timestamptz IS NULL OR er.first_seen_at <= :endDate::timestamptz)
    AND (:startDate::timestamptz IS NULL OR er.last_seen_at >= :startDate::timestamptz)
GROUP BY s.canonical_id, t.canonical_id, er.relationship_type
ORDER BY weight DESC
LIMIT 5000;

/* @name getEdgeEvidenceDocuments */
SELECT 
    d.id as "documentId", 
    d.file_name as title, 
    d.evidence_type as "sourceType", 
    d.red_flag_rating as risk,
    d.date_created as date,
    ir.agentic_model_id as model,
    ir.extractor_versions as pipeline,
    (
        SELECT mention_context
        FROM entity_mentions em
        JOIN entities e ON em.entity_id = e.id
        WHERE em.document_id = d.id
        AND e.canonical_id IN (:sourceId!::bigint, :targetId!::bigint)
        LIMIT 1
    ) as snippet
FROM documents d
JOIN entity_mentions em ON em.document_id = d.id
JOIN entities e ON em.entity_id = e.id
LEFT JOIN ingest_runs ir ON em.ingest_run_id = ir.id
WHERE e.canonical_id IN (:sourceId!::bigint, :targetId!::bigint)
GROUP BY d.id, ir.agentic_model_id, ir.extractor_versions
HAVING COUNT(DISTINCT e.canonical_id) >= 2
ORDER BY d.red_flag_rating DESC
LIMIT 20;

/* @name getEdgeRelationship */
SELECT er.relationship_type as "relationshipType", er.proximity_score as "proximityScore", er.confidence, er.was_agentic as "wasAgentic"
FROM entity_relationships er
JOIN entities s ON er.source_entity_id = s.id
JOIN entities t ON er.target_entity_id = t.id
WHERE (s.canonical_id = :sourceId!::bigint AND t.canonical_id = :targetId!::bigint)
    OR (s.canonical_id = :targetId!::bigint AND t.canonical_id = :sourceId!::bigint)
LIMIT 1;

/* @name getMapEntities */
SELECT 
    id, 
    COALESCE(title, full_name) as label, 
    location_lat as lat, 
    location_lng as lng,
    mentions,
    COALESCE(risk_level, 'LOW') as "risk_level",
    COALESCE(red_flag_rating, 0) as "risk_score",
    COALESCE(entity_type, 'Person') as type
FROM entities 
WHERE 
    location_lat IS NOT NULL 
    AND location_lng IS NOT NULL 
    AND location_lat BETWEEN -90 AND 90 
    AND location_lng BETWEEN -180 AND 180
    AND COALESCE(junk_tier, 'clean') = 'clean'
    AND COALESCE(quarantine_status, 0) = 0
    AND COALESCE(red_flag_rating, 0) >= :minRisk!
ORDER BY mentions DESC, red_flag_rating DESC
LIMIT :limit!;

/* @name clearAdjacencyCache */
DELETE FROM entity_adjacency;

/* @name insertAdjacencyCache */
WITH base_canonical AS (
  SELECT 
    s.canonical_id AS s_cid,
    t.canonical_id AS t_cid,
    er.proximity_score,
    er.relationship_type,
    er.risk_score,
    er.confidence,
    s.community_id AS s_comm,
    t.community_id AS t_comm
  FROM entity_relationships er
  JOIN entities s ON er.source_entity_id = s.id
  JOIN entities t ON er.target_entity_id = t.id
  WHERE s.canonical_id != t.canonical_id
),
symmetric_edges AS (
  SELECT s_cid AS src, t_cid AS tgt, proximity_score, relationship_type, risk_score, confidence, s_comm, t_comm FROM base_canonical
  UNION ALL
  SELECT t_cid AS src, s_cid AS tgt, proximity_score, relationship_type, risk_score, confidence, t_comm, s_comm FROM base_canonical
)
INSERT INTO entity_adjacency (entity_id, neighbor_id, weight, bridge_score, relationship_types, risk_score, confidence)
SELECT 
  src as entity_id,
  tgt as neighbor_id,
  MAX(proximity_score) as weight,
  CASE WHEN s_comm != t_comm THEN 1.0 ELSE 0.0 END as bridge_score,
  STRING_AGG(DISTINCT relationship_type, ',') as relationship_types,
  MAX(risk_score) as risk_score,
  MAX(confidence) as confidence
FROM symmetric_edges
GROUP BY src, tgt, s_comm, t_comm;

/* @name updateGraphCacheState */
UPDATE graph_cache_state SET last_rebuild = CURRENT_TIMESTAMP, is_dirty = 0 WHERE id = 1;
