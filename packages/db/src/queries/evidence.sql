/* @name getEntitySummary */
SELECT id, full_name, primary_role, entity_category, risk_level
FROM entities
WHERE id = :entityId!;

/* @name getEntityEvidence */
SELECT 
  d.id,
  d.evidence_type as "evidenceType",
  d.title,
  COALESCE(d.content_preview, LEFT(d.content, 320)) as description,
  d.file_path as "sourcePath",
  d.file_path as "cleanedPath",
  d.red_flag_rating as "redFlagRating",
  d.created_at as "createdAt",
  'mentioned' as role,
  MAX(em.confidence) as confidence,
  MAX(em.mention_context) as "mentionContext"
FROM documents d
INNER JOIN investigation_evidence ie ON ie.document_id = d.id
INNER JOIN entity_mentions em ON em.document_id = ie.document_id
WHERE em.entity_id = :entityId!
GROUP BY d.id
ORDER BY d.created_at DESC
LIMIT :limit! OFFSET :offset!;

/* @name countEntityEvidence */
SELECT COUNT(*)::integer as total
FROM documents d
INNER JOIN investigation_evidence ie ON ie.document_id = d.id
INNER JOIN entity_mentions em ON em.document_id = ie.document_id
WHERE em.entity_id = :entityId!;

/* @name getEvidenceTypeBreakdownByEntity */
SELECT 
  d.evidence_type as "evidenceType",
  COUNT(*)::integer as count
FROM documents d
INNER JOIN investigation_evidence ie ON ie.document_id = d.id
INNER JOIN entity_mentions em ON em.document_id = ie.document_id
WHERE em.entity_id = :entityId!
GROUP BY d.evidence_type
ORDER BY count DESC;

/* @name getRoleBreakdownByEntity */
SELECT 
  'mentioned' as role,
  COUNT(*)::integer as count
FROM entity_mentions em
WHERE em.entity_id = :entityId!
GROUP BY role
ORDER BY count DESC;

/* @name getRedFlagDistributionByEntity */
SELECT 
  d.red_flag_rating,
  COUNT(*)::integer as count
FROM documents d
INNER JOIN investigation_evidence ie ON ie.document_id = d.id
INNER JOIN entity_mentions em ON em.document_id = ie.document_id
WHERE em.entity_id = :entityId! AND d.red_flag_rating IS NOT NULL
GROUP BY d.red_flag_rating
ORDER BY d.red_flag_rating DESC;

/* @name getRelatedEntitiesByEntity */
SELECT 
  ent.id,
  ent.full_name as "fullName",
  ent.entity_category as "entityCategory",
  COUNT(DISTINCT em1.document_id)::integer as "sharedEvidenceCount"
FROM entity_mentions em1
INNER JOIN entity_mentions em2 ON em1.document_id = em2.document_id
INNER JOIN entities ent ON ent.id = em2.entity_id
WHERE em1.entity_id = :entityId! AND em2.entity_id != :entityId!
GROUP BY ent.id, ent.full_name, ent.entity_category
ORDER BY "sharedEvidenceCount" DESC
LIMIT :limit!;

/* @name createEvidenceFull */
INSERT INTO documents (
  evidence_type,
  file_path,
  file_name,
  title,
  content_preview,
  content,
  red_flag_rating,
  metadata_json,
  file_size,
  word_count,
  created_at
) VALUES (
  :evidenceType!, 
  :sourcePath!, 
  :originalFilename!, 
  :title!, 
  :description, 
  :extractedText, 
  :redFlagRating!, 
  :metadata, 
  0,
  LENGTH(COALESCE(:extractedText, '')),
  CURRENT_TIMESTAMP
)
ON CONFLICT (file_path) DO UPDATE SET
  title = COALESCE(EXCLUDED.title, documents.title),
  content_preview = COALESCE(EXCLUDED.content_preview, documents.content_preview),
  content = COALESCE(NULLIF(EXCLUDED.content, ''), documents.content),
  evidence_type = COALESCE(EXCLUDED.evidence_type, documents.evidence_type),
  red_flag_rating = COALESCE(EXCLUDED.red_flag_rating, documents.red_flag_rating),
  metadata_json = COALESCE(documents.metadata_json, '{}'::jsonb) || COALESCE(EXCLUDED.metadata_json, '{}'::jsonb)
RETURNING id;

/* @name addEvidenceToInvestigation */
INSERT INTO investigation_evidence (
  investigation_id,
  document_id,
  notes,
  relevance,
  added_at
) VALUES (:investigationId!, :evidenceId!, :notes, :relevance, CURRENT_TIMESTAMP)
ON CONFLICT (investigation_id, document_id) DO UPDATE SET
  notes = EXCLUDED.notes,
  relevance = EXCLUDED.relevance,
  added_at = CURRENT_TIMESTAMP
RETURNING id;

/* @name getInvestigationEvidenceSummary */
SELECT 
  d.id,
  d.evidence_type as "evidenceType",
  d.title,
  COALESCE(d.content_preview, LEFT(d.content, 320)) as description,
  d.red_flag_rating as "redFlagRating",
  d.created_at as "createdAt",
  d.file_path as "source",
  d.file_path as "cleanedPath",
  ie.notes,
  ie.relevance,
  ie.added_at as "addedAt"
FROM investigation_evidence ie
INNER JOIN documents d ON d.id = ie.document_id
WHERE ie.investigation_id = :investigationId!
ORDER BY ie.added_at DESC;

/* @name getInvestigationEntityCoverage */
SELECT 
  ent.id,
  ent.full_name as "fullName",
  ent.entity_category as "entityCategory",
  COUNT(DISTINCT ie.document_id)::integer as "evidenceCount"
FROM investigation_evidence ie
INNER JOIN entity_mentions em ON em.document_id = ie.document_id
INNER JOIN entities ent ON ent.id = em.entity_id
WHERE ie.investigation_id = :investigationId!
GROUP BY ent.id, ent.full_name, ent.entity_category
ORDER BY "evidenceCount" DESC
LIMIT :limit!;

/* @name removeEvidenceFromInvestigation */
DELETE FROM investigation_evidence
WHERE id = :id!;

/* @name searchEvidenceFull */
SELECT DISTINCT
  d.id,
  d.title,
  d.evidence_type as "evidenceType",
  d.red_flag_rating as "redFlagRating",
  d.created_at as "createdAt",
  COALESCE(d.metadata_json->>'tags', '[]') as "evidenceTags",
  ts_headline('english', COALESCE(d.content, ''), websearch_to_tsquery('english', :query!), 'MaxWords=25,MinWords=8') as snippet
FROM documents d
WHERE (:query::text IS NULL OR d.fts_vector @@ websearch_to_tsquery('english', :query))
  AND (:evidenceType::text IS NULL OR d.evidence_type = :evidenceType)
  AND (:redFlagMin::int IS NULL OR d.red_flag_rating >= :redFlagMin)
  AND (:startDate::timestamptz IS NULL OR d.created_at >= :startDate)
  AND (:endDate::timestamptz IS NULL OR d.created_at <= :endDate)
ORDER BY d.created_at DESC
LIMIT :limit! OFFSET :offset!;

/* @name countSearchEvidence */
SELECT COUNT(DISTINCT d.id) as total
FROM documents d
WHERE (:query::text IS NULL OR d.fts_vector @@ websearch_to_tsquery('english', :query))
  AND (:evidenceType::text IS NULL OR d.evidence_type = :evidenceType)
  AND (:redFlagMin::int IS NULL OR d.red_flag_rating >= :redFlagMin)
  AND (:startDate::timestamptz IS NULL OR d.created_at >= :startDate)
  AND (:endDate::timestamptz IS NULL OR d.created_at <= :endDate);

/* @name getEvidenceByIdDetailed */
SELECT 
  d.id,
  d.evidence_type as "evidenceType",
  d.title,
  COALESCE(d.content_preview, LEFT(d.content, 320)) as description,
  d.file_name as "originalFilename",
  d.file_path as "sourcePath",
  d.file_path as "cleanedPath",
  d.content as "extractedText",
  d.created_at as "createdAt",
  d.last_processed_at as "modifiedAt",
  d.red_flag_rating as "redFlagRating",
  COALESCE(d.metadata_json->>'tags', '[]') as "evidenceTags",
  d.metadata_json as "metadataJson",
  d.word_count as "wordCount",
  d.file_size as "fileSize"
FROM documents d
WHERE d.id = :id!;

/* @name getEvidenceEntities */
SELECT 
  ent.id,
  ent.full_name as name,
  ent.primary_role as category,
  'mentioned' as role,
  MAX(em.confidence) as confidence,
  MAX(em.mention_context) as "contextSnippet"
FROM investigation_evidence ie
INNER JOIN entity_mentions em ON em.document_id = ie.document_id
INNER JOIN entities ent ON ent.id = em.entity_id
WHERE ie.document_id = :evidenceId!
GROUP BY ent.id, ent.full_name, ent.primary_role;

/* @name getEvidenceTypesCounts */
SELECT 
  evidence_type as type,
  COUNT(*)::integer as count
FROM documents
WHERE evidence_type IS NOT NULL
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
