/* @name getSubjectCards */
SELECT 
  e.id,
  e.full_name as "fullName",
  e.primary_role as "primaryRole",
  e.bio,
  e.mentions,
  e.risk_level as "riskLevel",
  e.red_flag_rating as "redFlagRating",
  e.connections_summary as "connections",
  e.was_agentic as "wasAgentic",
  (SELECT COUNT(*) FROM entity_mentions em JOIN documents d ON d.id = em.document_id WHERE em.entity_id = e.id AND d.evidence_type = 'media') as "mediaCount",
  (SELECT COUNT(*) FROM black_book_entries WHERE person_id = e.id) as "blackBookCount",
  (
    SELECT d.id
    FROM entity_mentions em 
    JOIN documents d ON d.id = em.document_id 
    WHERE em.entity_id = e.id
    AND d.evidence_type = 'media'
    AND (d.file_type ILIKE 'image/%' OR d.file_type IS NULL)
    ORDER BY d.red_flag_rating DESC, d.id DESC
    LIMIT 1
  ) as "topPhotoId",
  (
    SELECT d.file_path
    FROM entity_mentions em 
    JOIN documents d ON d.id = em.document_id 
    WHERE em.entity_id = e.id
    AND d.evidence_type = 'media'
    AND (d.file_type ILIKE 'image/%' OR d.file_type IS NULL)
    ORDER BY d.red_flag_rating DESC, d.id DESC
    LIMIT 1
  ) as "topPhotoPath",
  (
    SELECT f.crop_path
    FROM face_clusters fc
    JOIN faces f ON fc.id = f.cluster_id
    WHERE fc.entity_id = e.id
    AND f.crop_path IS NOT NULL
    ORDER BY f.detection_confidence DESC
    LIMIT 1
  ) as "faceCropPath"
FROM entities e
WHERE (:searchTerm::text IS NULL OR e.full_name ILIKE :searchTerm OR e.primary_role ILIKE :searchTerm OR e.aliases ILIKE :searchTerm)
  AND (e.risk_level = ANY(:riskLevels) OR :riskLevels IS NULL)
  AND (e.red_flag_rating >= :minRedFlag OR :minRedFlag IS NULL)
  AND (e.red_flag_rating <= :maxRedFlag OR :maxRedFlag IS NULL)
  AND (e.primary_role = :role OR :role IS NULL)
ORDER BY 
  COALESCE(e.is_vip, 0) DESC,
  CASE WHEN :sortBy = 'name' THEN e.full_name END ASC,
  CASE WHEN :sortBy = 'recent' THEN e.id END DESC,
  e.red_flag_rating DESC,
  e.mentions DESC
LIMIT :limit! OFFSET :offset!;

/* @name countSubjectCards */
SELECT COUNT(*) as total 
FROM entities e
WHERE (:searchTerm::text IS NULL OR e.full_name ILIKE :searchTerm OR e.primary_role ILIKE :searchTerm OR e.aliases ILIKE :searchTerm)
  AND (e.risk_level = ANY(:riskLevels) OR :riskLevels IS NULL);

/* @name getEntityById */
SELECT 
  e.*,
  (
    SELECT f.crop_path
    FROM face_clusters fc
    JOIN faces f ON fc.id = f.cluster_id
    WHERE fc.entity_id = e.id
    AND f.crop_path IS NOT NULL
    ORDER BY f.detection_confidence DESC
    LIMIT 1
  ) as "faceCropPath"
FROM entities e WHERE e.id = :id!;
/* @name getVipEntities */
SELECT full_name, aliases, COALESCE(mentions, 0) as mentions
FROM entities
WHERE COALESCE(is_vip, 0) = 1
  AND full_name IS NOT NULL
  AND TRIM(full_name) != '';

/* @name getEntityRelationships */
SELECT 
  er.*,
  e.full_name as "targetName",
  e.primary_role as "targetRole"
FROM entity_relationships er
JOIN entities e ON er.target_entity_id = e.id
WHERE er.source_entity_id = :entityId!
ORDER BY er.confidence DESC;

/* @name getEntityMentions */
SELECT 
  em.*,
  d.file_name as "documentTitle",
  d.date_created as "documentDate"
FROM entity_mentions em
JOIN documents d ON em.document_id = d.id
WHERE em.entity_id = :entityId!
ORDER BY d.date_created DESC
LIMIT :limit!;

/* @name getMaxConnectivity */
SELECT MAX(cnt) as "maxConn" FROM (
  SELECT source_entity_id, COUNT(*) as cnt 
  FROM entity_relationships 
  GROUP BY source_entity_id
) AS subquery;
