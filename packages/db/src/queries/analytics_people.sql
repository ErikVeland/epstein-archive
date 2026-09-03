/* @name getAnalyticsPeople */
WITH candidates AS (
  SELECT id, full_name, is_vip, manually_reviewed, mentions
  FROM entities
  WHERE (is_vip = 1 OR manually_reviewed = 1)
    AND COALESCE(junk_tier, 'clean') = 'clean'
    AND COALESCE(quarantine_status, 0) = 0
    AND lower(entity_type) = 'person'
    AND (canonical_id IS NULL OR canonical_id = id)
    AND NULLIF(trim(full_name), '') IS NOT NULL
  ORDER BY is_vip DESC NULLS LAST, mentions DESC NULLS LAST, id
  LIMIT 500
)
SELECT c.id, c.full_name AS name, COALESCE(c.is_vip, 0) AS "isVip",
  COALESCE(c.manually_reviewed, 0) AS reviewed,
  c.mentions AS "storedMentions",
  (SELECT count(DISTINCT em.document_id)::integer FROM entity_mentions em WHERE em.entity_id = c.id) AS "documentCount",
  (SELECT count(*)::integer FROM entity_relationships er WHERE er.source_entity_id = c.id OR er.target_entity_id = c.id) AS "relationshipCount"
FROM candidates c;

/* @name getAnalyticsPeers */
WITH connected AS (
  SELECT CASE WHEN source_entity_id = :entityId!::bigint THEN target_entity_id ELSE source_entity_id END AS peer_id,
    relationship_type
  FROM entity_relationships
  WHERE source_entity_id = :entityId!::bigint OR target_entity_id = :entityId!::bigint
)
SELECT e.id, e.full_name AS name, COALESCE(e.is_vip, 0) AS "isVip",
  count(*)::integer AS "relationshipCount",
  string_agg(DISTINCT connected.relationship_type, ', ') AS types
FROM connected JOIN entities e ON e.id = connected.peer_id
WHERE (e.is_vip = 1 OR e.manually_reviewed = 1)
  AND COALESCE(e.junk_tier, 'clean') = 'clean'
  AND COALESCE(e.quarantine_status, 0) = 0
  AND lower(e.entity_type) = 'person'
  AND (e.canonical_id IS NULL OR e.canonical_id = e.id)
  AND e.id != :entityId!::bigint
GROUP BY e.id, e.full_name, e.is_vip
ORDER BY e.is_vip DESC NULLS LAST, count(*) DESC, e.full_name
LIMIT 50;
