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
  (SELECT COUNT(*)::integer FROM entity_mentions em JOIN documents d ON d.id = em.document_id WHERE em.entity_id = e.id AND d.evidence_type = 'media') as "mediaCount",
  (SELECT COUNT(*)::integer FROM black_book_entries WHERE person_id = e.id) as "blackBookCount",
  (
    SELECT mi.id
    FROM media_items mi
    LEFT JOIN media_item_people mip ON mi.id::text = mip.media_item_id::text
    WHERE (mi.entity_id = e.id OR mip.entity_id = e.id)
      AND mi.file_type ILIKE 'image/%'
    ORDER BY mi.red_flag_rating DESC NULLS LAST, mi.id DESC
    LIMIT 1
  ) as "topPhotoId"
FROM entities e
WHERE (:searchTerm::text IS NULL OR e.full_name ILIKE :searchTerm OR e.primary_role ILIKE :searchTerm OR e.aliases ILIKE :searchTerm)
  AND COALESCE(e.junk_tier, 'clean') = 'clean'
  AND COALESCE(e.quarantine_status, 0) = 0
  AND e.full_name IS NOT NULL
  AND BTRIM(e.full_name) != ''
  AND LOWER(e.full_name) !~* '^(to|from|cc|bcc|subject|re|fwd|fw|sent|received)\M[:\s-]*'
  AND LOWER(e.full_name) !~* '^(on|at|in|with)\s+(mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\M'
  AND LOWER(e.full_name) !~* '\m(mon|tue|wed|thu|fri|sat|sun)\M\s*$'
  AND LOWER(e.full_name) !~* '\m([[:alpha:]]{3,})\s+\1\M'
  AND LOWER(e.full_name) !~* '\m(department|office|policy|inc|llc|corp|corporation|ltd|associates|foundation|trust|university|school|academy|committee|ministry|agency|bureau|division|building|street|road|avenue|contact|privacy|terms)\M'
  AND LOWER(e.full_name) !~* '\m(bluray|blu-ray|disc|rewritable|dumpster|hauls|columns|demolition|ditchin|postage|acoustics|personnel|persoanel)\M'
  AND LOWER(e.full_name) !~* '^(east|west|north|south)\s+(if|aft|aftstreet|street|road|avenue)\M'
  AND LOWER(e.full_name) !~* '\m(direction|provided)\M\s*$'
  AND LOWER(e.full_name) !~* '\m(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\M\s*$'
  AND LOWER(e.full_name) !~* '\m[[:alpha:]]+''?s\s+(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\M'
  AND LOWER(e.full_name) !~* '^(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\M'
  AND (e.risk_level = ANY(:riskLevels) OR :riskLevels IS NULL)
  AND (e.red_flag_rating >= :minRedFlag OR :minRedFlag IS NULL)
  AND (e.red_flag_rating <= :maxRedFlag OR :maxRedFlag IS NULL)
  AND (e.primary_role = :role OR :role IS NULL)
ORDER BY 
  CASE
    WHEN :searchTerm::text IS NULL AND LOWER(e.full_name) = 'jeffrey epstein' THEN 0
    WHEN :searchTerm::text IS NULL AND LOWER(e.full_name) = 'donald trump' THEN 1
    ELSE 2
  END ASC,
  COALESCE(e.is_vip, 0) DESC,
  CASE WHEN :sortBy = 'name' THEN e.full_name END ASC,
  CASE WHEN :sortBy = 'recent' THEN e.id END DESC,
  e.red_flag_rating DESC,
  e.mentions DESC
LIMIT :limit! OFFSET :offset!;

/* @name countSubjectCards */
SELECT COUNT(*)::integer as total 
FROM entities e
WHERE (:searchTerm::text IS NULL OR e.full_name ILIKE :searchTerm OR e.primary_role ILIKE :searchTerm OR e.aliases ILIKE :searchTerm)
  AND COALESCE(e.junk_tier, 'clean') = 'clean'
  AND COALESCE(e.quarantine_status, 0) = 0
  AND e.full_name IS NOT NULL
  AND BTRIM(e.full_name) != ''
  AND LOWER(e.full_name) !~* '^(to|from|cc|bcc|subject|re|fwd|fw|sent|received)\M[:\s-]*'
  AND LOWER(e.full_name) !~* '^(on|at|in|with)\s+(mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\M'
  AND LOWER(e.full_name) !~* '\m(mon|tue|wed|thu|fri|sat|sun)\M\s*$'
  AND LOWER(e.full_name) !~* '\m([[:alpha:]]{3,})\s+\1\M'
  AND LOWER(e.full_name) !~* '\m(department|office|policy|inc|llc|corp|corporation|ltd|associates|foundation|trust|university|school|academy|committee|ministry|agency|bureau|division|building|street|road|avenue|contact|privacy|terms)\M'
  AND LOWER(e.full_name) !~* '\m(bluray|blu-ray|disc|rewritable|dumpster|hauls|columns|demolition|ditchin|postage|acoustics|personnel|persoanel)\M'
  AND LOWER(e.full_name) !~* '^(east|west|north|south)\s+(if|aft|aftstreet|street|road|avenue)\M'
  AND LOWER(e.full_name) !~* '\m(direction|provided)\M\s*$'
  AND LOWER(e.full_name) !~* '\m(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\M\s*$'
  AND LOWER(e.full_name) !~* '\m[[:alpha:]]+''?s\s+(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\M'
  AND LOWER(e.full_name) !~* '^(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\M'
  AND (e.risk_level = ANY(:riskLevels) OR :riskLevels IS NULL);

/* @name getEntityById */
SELECT
  id,
  full_name,
  primary_role,
  bio,
  aliases,
  mentions,
  risk_level,
  red_flag_rating,
  red_flag_score,
  red_flag_description,
  connections_summary,
  was_agentic,
  is_vip,
  title,
  entity_type,
  entity_category,
  canonical_id,
  birth_date,
  death_date,
  location_lat,
  location_lng,
  calculated_rank_score,
  community_id,
  evidence_count,
  entity_metadata_json,
  notes,
  junk_flag,
  junk_probability,
  junk_reason,
  junk_tier,
  quarantine_status,
  manually_reviewed,
  needs_review,
  fts_vector,
  created_at,
  updated_at
FROM entities
WHERE id = :id!;
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
  d.date_created as "documentDate",
  d.file_path as "documentPath"
FROM entity_mentions em
JOIN documents d ON em.document_id = d.id
WHERE em.entity_id = :entityId!
ORDER BY d.date_created DESC
LIMIT :limit!;

/* @name getMaxConnectivity */
SELECT MAX(cnt) as "maxConn" FROM (
  SELECT source_entity_id, COUNT(*)::integer as cnt 
  FROM entity_relationships 
  GROUP BY source_entity_id
) AS subquery;
