/* @name getEntityMentionDetails */
SELECT id, full_name, primary_role, entity_category, risk_level, red_flag_rating
FROM entities
WHERE id = :entityId!;

 /* @name getMentionDerivedEvidence */
SELECT
  em.id as evidence_id,
  em.document_id,
  em.mention_context,
  em.confidence as score,
  em.id as mention_id,
  d.title AS document_title,
  d.file_path,
  d.evidence_type,
  d.red_flag_rating,
  d.date_created,
  q.flag_type,
  q.severity
FROM entity_mentions em
JOIN documents d ON d.id = em.document_id
LEFT JOIN quality_flags q ON q.target_type = 'mention' AND q.target_id = em.id::text
WHERE em.entity_id = :entityId!
ORDER BY d.date_created DESC, em.id DESC
LIMIT :limit!;

/* @name getRelatedEntitiesByRelations */
SELECT
  other.id,
  other.full_name,
  other.entity_category,
  SUM(COALESCE(er.strength, er.proximity_score, 1)) as shared_evidence_count
FROM entity_relationships er
JOIN entities other ON
  other.id = CASE
    WHEN er.source_entity_id = :entityId THEN er.target_entity_id
    ELSE er.source_entity_id
  END
WHERE er.source_entity_id = :entityId OR er.target_entity_id = :entityId
GROUP BY other.id, other.full_name, other.entity_category
ORDER BY shared_evidence_count DESC
LIMIT :limit!;

/* @name getRelationEvidenceForEntity */
SELECT
  CONCAT(er.source_entity_id, ':', er.target_entity_id, ':', er.relationship_type) as relation_id,
  er.source_entity_id as subject_entity_id,
  er.target_entity_id as object_entity_id,
  er.relationship_type as predicate,
  'directed' as direction,
  COALESCE(er.strength, er.proximity_score, 0) as weight,
  er.first_seen_at,
  er.last_seen_at,
  re.id as relation_evidence_id,
  re.document_id,
  re.span_id,
  re.quote_text,
  re.confidence,
  re.mention_ids,
  d.title as document_title,
  d.file_path as document_path
FROM entity_relationships er
JOIN relation_evidence re
  ON re.source_entity_id = er.source_entity_id
 AND re.target_entity_id = er.target_entity_id
 AND re.relationship_type = er.relationship_type
LEFT JOIN documents d ON d.id = re.document_id
WHERE er.source_entity_id = :entityId! OR er.target_entity_id = :entityId!
ORDER BY weight DESC, re.confidence DESC;
