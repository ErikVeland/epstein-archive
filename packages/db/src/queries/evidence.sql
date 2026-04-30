/* @name getEntitySummary */
SELECT id, full_name, primary_role, entity_category, risk_level
FROM entities
WHERE id = :entityId!;

/* @name getEntityEvidence */
SELECT 
  e.id,
  e.evidence_type as "evidenceType",
  e.title,
  e.description,
  e.source_path as "sourcePath",
  e.cleaned_path as "cleanedPath",
  e.red_flag_rating as "redFlagRating",
  e.created_at as "createdAt",
  ee.role,
  ee.confidence,
  ee.mention_context as "mentionContext"
FROM evidence e
INNER JOIN evidence_entity ee ON ee.evidence_id = e.id
WHERE ee.entity_id = :entityId!
ORDER BY e.created_at DESC
LIMIT :limit! OFFSET :offset!;

/* @name countEntityEvidence */
SELECT COUNT(*)::integer as total
FROM evidence e
INNER JOIN evidence_entity ee ON ee.evidence_id = e.id
WHERE ee.entity_id = :entityId!;

/* @name getEvidenceTypeBreakdownByEntity */
SELECT 
  e.evidence_type as "evidenceType",
  COUNT(*)::integer as count
FROM evidence e
INNER JOIN evidence_entity ee ON ee.evidence_id = e.id
WHERE ee.entity_id = :entityId!
GROUP BY e.evidence_type
ORDER BY count DESC;

/* @name getRoleBreakdownByEntity */
SELECT 
  ee.role,
  COUNT(*)::integer as count
FROM evidence_entity ee
WHERE ee.entity_id = :entityId!
GROUP BY ee.role
ORDER BY count DESC;

/* @name getRedFlagDistributionByEntity */
SELECT 
  e.red_flag_rating,
  COUNT(*)::integer as count
FROM evidence e
INNER JOIN evidence_entity ee ON ee.evidence_id = e.id
WHERE ee.entity_id = :entityId! AND e.red_flag_rating IS NOT NULL
GROUP BY e.red_flag_rating
ORDER BY e.red_flag_rating DESC;

/* @name getRelatedEntitiesByEntity */
SELECT 
  ent.id,
  ent.full_name as "fullName",
  ent.entity_category as "entityCategory",
  COUNT(DISTINCT ee1.evidence_id) as "sharedEvidenceCount"
FROM evidence_entity ee1
INNER JOIN evidence_entity ee2 ON ee1.evidence_id = ee2.evidence_id
INNER JOIN entities ent ON ent.id = ee2.entity_id
WHERE ee1.entity_id = :entityId! AND ee2.entity_id != :entityId!
GROUP BY ent.id, ent.full_name, ent.entity_category
ORDER BY "sharedEvidenceCount" DESC
LIMIT :limit!;

/* @name createEvidenceFull */
INSERT INTO evidence (
  evidence_type,
  source_path,
  original_filename,
  title,
  description,
  extracted_text,
  red_flag_rating,
  evidence_tags,
  metadata_json,
  created_at,
  ingested_at
) VALUES (
  :evidenceType!, 
  :sourcePath!, 
  :originalFilename!, 
  :title!, 
  :description, 
  :extractedText, 
  :redFlagRating!, 
  :evidenceTags, 
  :metadata, 
  CURRENT_TIMESTAMP, 
  CURRENT_TIMESTAMP
)
RETURNING id;

/* @name addEvidenceToInvestigation */
INSERT INTO investigation_evidence (
  investigation_id,
  evidence_id,
  notes,
  relevance,
  added_at
) VALUES (:investigationId!, :evidenceId!, :notes, :relevance, CURRENT_TIMESTAMP)
ON CONFLICT (investigation_id, evidence_id) DO UPDATE SET
  notes = EXCLUDED.notes,
  relevance = EXCLUDED.relevance,
  added_at = CURRENT_TIMESTAMP
RETURNING id;

/* @name getInvestigationEvidenceSummary */
SELECT 
  e.id,
  e.evidence_type as "evidenceType",
  e.title,
  e.description,
  e.red_flag_rating as "redFlagRating",
  e.created_at as "createdAt",
  e.source_path as "source",
  e.cleaned_path as "cleanedPath",
  e.original_file_path as "originalFilePath",
  ie.notes,
  ie.relevance,
  ie.added_at as "addedAt"
FROM investigation_evidence ie
INNER JOIN evidence e ON e.id = ie.evidence_id
WHERE ie.investigation_id = :investigationId!
ORDER BY ie.added_at DESC;

/* @name getInvestigationEntityCoverage */
SELECT 
  ent.id,
  ent.full_name as "fullName",
  ent.entity_category as "entityCategory",
  COUNT(DISTINCT ee.evidence_id) as "evidenceCount"
FROM investigation_evidence ie
INNER JOIN evidence_entity ee ON ee.evidence_id = ie.evidence_id
INNER JOIN entities ent ON ent.id = ee.entity_id
WHERE ie.investigation_id = :investigationId!
GROUP BY ent.id, ent.full_name, ent.entity_category
ORDER BY "evidenceCount" DESC
LIMIT :limit!;

/* @name removeEvidenceFromInvestigation */
DELETE FROM investigation_evidence
WHERE id = :id!;

/* @name searchEvidenceFull */
SELECT DISTINCT
  e.id,
  e.title,
  e.evidence_type as "evidenceType",
  e.red_flag_rating as "redFlagRating",
  e.created_at as "createdAt",
  e.evidence_tags as "evidenceTags",
  ts_headline('english', e.extracted_text, websearch_to_tsquery('english', :query!), 'MaxWords=25,MinWords=8') as snippet
FROM evidence e
WHERE (:query::text IS NULL OR e.fts_vector @@ websearch_to_tsquery('english', :query))
  AND (:evidenceType::text IS NULL OR e.evidence_type = :evidenceType)
  AND (:redFlagMin::int IS NULL OR e.red_flag_rating >= :redFlagMin)
  AND (:startDate::timestamptz IS NULL OR e.created_at >= :startDate)
  AND (:endDate::timestamptz IS NULL OR e.created_at <= :endDate)
ORDER BY e.created_at DESC
LIMIT :limit! OFFSET :offset!;

/* @name countSearchEvidence */
SELECT COUNT(DISTINCT e.id) as total
FROM evidence e
WHERE (:query::text IS NULL OR e.fts_vector @@ websearch_to_tsquery('english', :query))
  AND (:evidenceType::text IS NULL OR e.evidence_type = :evidenceType)
  AND (:redFlagMin::int IS NULL OR e.red_flag_rating >= :redFlagMin)
  AND (:startDate::timestamptz IS NULL OR e.created_at >= :startDate)
  AND (:endDate::timestamptz IS NULL OR e.created_at <= :endDate);

/* @name getEvidenceByIdDetailed */
SELECT 
  e.id,
  e.evidence_type as "evidenceType",
  e.title,
  e.description,
  e.original_filename as "originalFilename",
  e.source_path as "sourcePath",
  e.cleaned_path as "cleanedPath",
  e.original_file_path as "originalFilePath",
  e.extracted_text as "extractedText",
  e.created_at as "createdAt",
  e.modified_at as "modifiedAt",
  e.red_flag_rating as "redFlagRating",
  e.evidence_tags as "evidenceTags",
  e.metadata_json as "metadataJson",
  e.word_count as "wordCount",
  e.file_size as "fileSize"
FROM evidence e
WHERE e.id = :id!;

/* @name getEvidenceEntities */
SELECT 
  ent.id,
  ent.full_name as name,
  ent.primary_role as category,
  ee.role,
  ee.confidence,
  ee.mention_context as "contextSnippet"
FROM evidence_entity ee
INNER JOIN entities ent ON ent.id = ee.entity_id
WHERE ee.evidence_id = :evidenceId!;

/* @name getEvidenceTypesCounts */
SELECT 
  evidence_type as type,
  COUNT(*)::integer as count
FROM evidence
GROUP BY evidence_type
ORDER BY count DESC;

/* @name getDocumentDetailsForEvidence */
SELECT id, file_path, file_name, evidence_type, red_flag_rating
FROM documents
WHERE id = :id!;

/* @name getMediaItemForEvidence */
SELECT 
  id,
  file_path as "filePath",
  file_type as "fileType",
  title,
  description,
  red_flag_rating as "redFlagRating",
  metadata_json as "metadataJson",
  created_at as "createdAt"
FROM media_items
WHERE id = :id!;

/* @name getMediaItemTags */
SELECT t.name 
FROM media_item_tags mt 
INNER JOIN media_tags t ON t.id = mt.tag_id 
WHERE mt.media_item_id = :mediaItemId!;

/* @name getMediaItemPeople */
SELECT entity_id, role 
FROM media_item_people 
WHERE media_item_id = :mediaItemId!;

/* @name insertEvidenceEntity */
INSERT INTO evidence_entity (
  evidence_id,
  entity_id,
  role,
  confidence,
  mention_context
) VALUES (:evidenceId!, :entityId!, :role!, :confidence!, :mentionContext)
ON CONFLICT (evidence_id, entity_id) DO NOTHING;
