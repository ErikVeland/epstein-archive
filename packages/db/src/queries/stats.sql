/* @name getGlobalStats */
SELECT
  COUNT(*)::integer as "totalEntities",
  SUM(COALESCE(mentions, 0)) as "totalMentions",
  AVG(COALESCE(red_flag_rating, 0)) as "averageRedFlagRating",
  COUNT(DISTINCT CASE WHEN primary_role IS NOT NULL AND primary_role != '' THEN primary_role END) as "totalUniqueRoles",
  COUNT(*)::integer FILTER (WHERE mentions > 0) as "entitiesWithDocuments",
  (SELECT COUNT(*)::integer FROM documents) as "totalDocuments",
  (SELECT COUNT(*)::integer FROM documents WHERE metadata_json IS NOT NULL AND (jsonb_typeof(metadata_json) = 'object' AND metadata_json <> '{}'::jsonb)) as "documentsWithMetadata",
  (SELECT COUNT(*)::integer FROM documents WHERE content_refined IS NOT NULL) as "documentsFixed"
FROM entities;

/* @name getRiskDistribution */
SELECT
  COALESCE(risk_level, 'LOW') as level,
  COUNT(*)::integer as count
FROM entities
GROUP BY risk_level;

/* @name getRedFlagDistribution */
SELECT
  red_flag_rating as rating,
  COUNT(*)::integer as count
FROM entities
WHERE red_flag_rating IS NOT NULL
GROUP BY red_flag_rating
ORDER BY red_flag_rating ASC;

/* @name getTopRoles */
SELECT primary_role as role, COUNT(*)::integer as count 
FROM entities 
WHERE primary_role IS NOT NULL AND primary_role != ''
GROUP BY primary_role 
ORDER BY count DESC
LIMIT :limit!;

/* @name getTopEntities */
SELECT 
  CASE 
    WHEN (full_name IN ('Donald Trump', 'President Trump', 'Mr Trump', 'Trump', 'Donald J Trump', 'Donald J. Trump')) THEN 'Donald Trump'
    WHEN (full_name IN ('Jeffrey Epstein', 'Epstein', 'Jeffrey', 'Jeff Epstein', 'Mr Epstein')) THEN 'Jeffrey Epstein'
    WHEN (full_name IN ('Ghislaine Maxwell', 'Maxwell', 'Ghislaine', 'Ms Maxwell', 'Miss Maxwell')) THEN 'Ghislaine Maxwell'
    WHEN (full_name IN ('Bill Clinton', 'President Clinton', 'Mr Clinton', 'Clinton', 'William Clinton')) 
         AND lower(full_name) NOT LIKE '%hillary%' AND lower(full_name) NOT LIKE '%chelsea%' THEN 'Bill Clinton'
    WHEN (full_name IN ('Prince Andrew', 'Duke of York', 'Andrew') OR lower(full_name) LIKE '%prince andrew%') THEN 'Prince Andrew'
    WHEN (full_name IN ('Alan Dershowitz', 'Dershowitz', 'Mr Dershowitz')) THEN 'Alan Dershowitz'
    WHEN (full_name IN ('Ivanka Trump', 'Ivanka')) THEN 'Ivanka Trump'
    WHEN (full_name IN ('Melania Trump', 'Melania')) THEN 'Melania Trump'
    ELSE full_name
  END as name,
  SUM(mentions) as mentions,
  MAX(red_flag_rating) as "redFlagRating",
  MAX(bio) as bio,
  MAX(primary_role) as "primaryRole",
  MAX(entity_type) as "entityType",
  MAX(red_flag_description) as "redFlagDescription"
FROM entities
WHERE mentions > 0 
AND (entity_type = 'Person' OR entity_type IS NULL)
AND full_name NOT LIKE 'The %'
AND full_name NOT LIKE '% Like'
AND full_name NOT LIKE 'They %'
AND length(full_name) > 3
AND full_name NOT LIKE '%Group'
AND full_name NOT LIKE '%Inc'
AND full_name NOT LIKE '%LLC'
GROUP BY name
ORDER BY mentions DESC
LIMIT :limit!;

/* @name getCollectionCounts */
SELECT source_collection as "sourceCollection", COUNT(*)::integer as count 
FROM documents 
WHERE source_collection IS NOT NULL 
GROUP BY source_collection;

/* @name getActiveInvestigationsCount */
SELECT COUNT(*)::integer as count FROM investigations WHERE status IN ('active', 'open');

/* @name getRecentProcessedCount */
SELECT COUNT(*)::integer as count 
FROM documents 
WHERE last_processed_at > CURRENT_TIMESTAMP - (INTERVAL '1 second' * :seconds!);

/* @name getActiveWorkersCount */
SELECT COUNT(DISTINCT worker_id) as count 
FROM documents 
WHERE processing_status = 'processing' 
  AND lease_expires_at > CURRENT_TIMESTAMP;

/* @name getTimelineEvents */
SELECT 
  te.event_date as date,
  te.event_description as description,
  te.event_type as type,
  d.file_name as title,
  d.id as document_id,
  e.full_name as primary_entity,
  'medium' as significance_score
FROM timeline_events te
LEFT JOIN documents d ON te.document_id = d.id
LEFT JOIN entities e ON te.entity_id = e.id
WHERE te.event_date IS NOT NULL
ORDER BY te.event_date DESC
LIMIT :limit!;
