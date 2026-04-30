/* @name getRelationships */
SELECT 
  source_entity_id as "sourceId", 
  target_entity_id as "targetId", 
  relationship_type as "relationshipType", 
  proximity_score as "proximityScore",
  0 as "riskScore", 
  1 as confidence, 
  NULL as "metadataJson"
FROM entity_relationships
WHERE (source_entity_id = :entityId!::bigint OR target_entity_id = :entityId!::bigint)
  AND (:minWeight::float IS NULL OR proximity_score >= :minWeight)
  AND (:minConfidence::float IS NULL OR 1 >= :minConfidence)
ORDER BY proximity_score DESC;

/* @name rebuildAdjacencyCache */
INSERT INTO entity_adjacency (entity_id, neighbor_id, weight, bridge_score, relationship_types, risk_score, confidence)
SELECT 
  s.canonical_id as entity_id,
  t.canonical_id as neighbor_id,
  MAX(er.proximity_score) as weight,
  CASE WHEN s.community_id != t.community_id THEN 1.0 ELSE 0.0 END as bridge_score,
  STRING_AGG(DISTINCT er.relationship_type, ',') as relationship_types,
  MAX(er.risk_score) as risk_score,
  MAX(er.confidence) as confidence
FROM entity_relationships er
JOIN entities s ON er.source_entity_id = s.id
JOIN entities t ON er.target_entity_id = t.id
WHERE s.canonical_id != t.canonical_id
GROUP BY s.canonical_id, t.canonical_id, s.community_id, t.community_id
ON CONFLICT (entity_id, neighbor_id) DO UPDATE SET
  weight = EXCLUDED.weight,
  bridge_score = EXCLUDED.bridge_score,
  relationship_types = EXCLUDED.relationship_types,
  risk_score = EXCLUDED.risk_score,
  confidence = EXCLUDED.confidence;

/* @name getEntityCanonical */
SELECT COALESCE(canonical_id, id) as cid FROM entities WHERE id = :id!;

/* @name getEntityDetailsAggregated */
SELECT 
    canonical_id as id, 
    MAX(full_name) as "fullName", 
    MAX(primary_role) as "primaryRole", 
    MAX(red_flag_rating) as "redFlagRating"
FROM entities 
WHERE canonical_id = :canonicalId!
GROUP BY canonical_id;

/* @name getTopPhotoForEntity */
SELECT mi.id
FROM media_item_people mip
JOIN media_items mi ON mip.media_item_id = mi.id
WHERE mip.entity_id = :entityId!::bigint
AND (mi.file_type LIKE 'image/%' OR mi.file_type IS NULL)
ORDER BY mi.red_flag_rating DESC, mi.id DESC
LIMIT 1;

/* @name getNeighborsCached */
SELECT 
  neighbor_id as "targetId",
  weight as "proximityScore",
  bridge_score as "bridgeScore",
  relationship_types as "relationshipTypes",
  risk_score as "riskScore",
  confidence as "confidence"
FROM entity_adjacency
WHERE entity_id = :entityId!
ORDER BY bridge_score DESC, weight DESC
LIMIT :limit!;

/* @name getRelationshipStats */
SELECT 
  COUNT(*)::integer as "totalRelationships",
  AVG(proximity_score) as "avgProximityScore",
  0 as "avgRiskScore",
  1 as "avgConfidence"
FROM entity_relationships;

/* @name getTopEntitiesByRelationshipCount */
SELECT source_entity_id as "entityId", COUNT(*)::integer as count
FROM entity_relationships
GROUP BY source_entity_id
ORDER BY count DESC
LIMIT :limit!;
