/* @name getDocuments */
SELECT 
  id,
  file_name as "fileName",
  file_type as "fileType",
  file_size as "fileSize",
  date_created as "dateCreated",
  extracted_date as "extractedDate",
  content_refined as "contentRefined",
  evidence_type as "evidenceType",
  metadata_json as "metadata",
  word_count as "wordCount",
  red_flag_rating as "redFlagRating",
  COALESCE(NULLIF(title, ''), file_name) as "title",
  source_collection as "sourceCollection",
  COUNT(*)::integer OVER () as "totalCount"
FROM documents
WHERE (
  :search::text IS NULL
  OR file_name ILIKE :search
  OR source_collection ILIKE :search
  OR file_path ILIKE :search
  OR fts_vector @@ websearch_to_tsquery('english', :search)
)
  AND (file_type = ANY(:fileTypes) OR :fileTypes IS NULL)
  AND (evidence_type = :evidenceType OR :evidenceType IS NULL)
  AND (source_collection = ANY(:sources) OR :sources IS NULL)
  AND (COALESCE(extracted_date, date_created) >= :startDate OR :startDate IS NULL)
  AND (COALESCE(extracted_date, date_created) <= :endDate OR :endDate IS NULL)
  AND (red_flag_rating >= :minRedFlag OR :minRedFlag IS NULL)
  AND (red_flag_rating <= :maxRedFlag OR :maxRedFlag IS NULL)
ORDER BY red_flag_rating DESC, COALESCE(extracted_date, date_created) DESC
LIMIT :limit! OFFSET :offset!;

/* @name countDocuments */
SELECT COUNT(*)::integer as total 
FROM documents
WHERE (
  :search::text IS NULL
  OR file_name ILIKE :search
  OR source_collection ILIKE :search
  OR file_path ILIKE :search
  OR fts_vector @@ websearch_to_tsquery('english', :search)
)
  AND (file_type = ANY(:fileTypes) OR :fileTypes IS NULL)
  AND (evidence_type = :evidenceType OR :evidenceType IS NULL)
  AND (source_collection = ANY(:sources) OR :sources IS NULL)
  AND (COALESCE(extracted_date, date_created) >= :startDate OR :startDate IS NULL)
  AND (COALESCE(extracted_date, date_created) <= :endDate OR :endDate IS NULL)
  AND (red_flag_rating >= :minRedFlag OR :minRedFlag IS NULL)
  AND (red_flag_rating <= :maxRedFlag OR :maxRedFlag IS NULL);

/* @name getDocumentById */
SELECT 
  id,
  file_name as "fileName",
  file_path as "filePath",
  file_type as "fileType",
  file_size as "fileSize",
  date_created as "dateCreated",
  extracted_date as "extractedDate",
  content_hash as "contentHash",
  word_count as "wordCount",
  red_flag_rating as "redFlagRating",
  metadata_json as "metadataJson",
  content_refined as "content",
  title,
  evidence_type as "evidenceType",
  unredaction_attempted as "unredactionAttempted",
  unredaction_succeeded as "unredactionSucceeded",
  redaction_coverage_before as "redactionCoverageBefore",
  redaction_coverage_after as "redactionCoverageAfter",
  unredacted_text_gain as "unredactedTextGain",
  unredaction_baseline_vocab as "unredactionBaselineVocab",
  source_url as "originalFileUrl"
FROM documents
WHERE id = :id!;

/* @name getDocumentEntities */
SELECT
  e.id as "entityId",
  e.full_name as "name",
  COALESCE(e.entity_type, 'unknown') as "entityType",
  COALESCE(e.red_flag_rating, 0) as "redFlagRating",
  COUNT(*)::integer as "mentions"
FROM entity_mentions em
JOIN entities e ON e.id = em.entity_id
WHERE em.document_id = :documentId!
GROUP BY e.id, e.full_name, e.entity_type, e.red_flag_rating
ORDER BY mentions DESC, "redFlagRating" DESC, e.full_name ASC
LIMIT 200;
/* @name getMentionContexts */
SELECT mention_context
FROM entity_mentions
WHERE document_id = :documentId! AND entity_id = :entityId! AND mention_context IS NOT NULL AND mention_context != ''
LIMIT 3;

/* @name getRedactionSpans */
SELECT
  id,
  document_id,
  span_start,
  span_end,
  replacement_text,
  created_at
FROM redaction_spans
WHERE document_id = :documentId!
ORDER BY span_start ASC;

/* @name getClaimTriples */
SELECT
  ct.id,
  ct.subject_entity_id,
  ct.predicate,
  ct.object_entity_id,
  ct.object_text,
  ct.document_id,
  ct.sentence_id,
  ct.confidence,
  ct.modality,
  ct.evidence_json,
  ct.created_at,
  ct.verified,
  ct.verified_by,
  ct.verified_at,
  ct.rejection_reason,
  s.full_name as subject_name,
  o.full_name as object_name
FROM claim_triples ct
LEFT JOIN entities s ON ct.subject_entity_id = s.id
LEFT JOIN entities o ON ct.object_entity_id = o.id
WHERE ct.document_id = :documentId!
ORDER BY ct.confidence DESC;

/* @name getDocumentSentences */
SELECT id, sentence_index, sentence_text, is_boilerplate, signal_score
FROM document_sentences
WHERE document_id = :documentId!
ORDER BY sentence_index ASC;

/* @name getRelatedDocuments */
SELECT 
  d.id,
  COALESCE(NULLIF(d.title, ''), d.file_name) as title,
  d.file_name as "fileName",
  d.file_type as "fileType",
  d.evidence_type as "evidenceType",
  d.red_flag_rating as "redFlagRating",
  d.date_created as "dateCreated",
  COUNT(DISTINCT em.entity_id) as "sharedEntityCount",
  STRING_AGG(DISTINCT e.full_name, ', ') as "sharedEntitiesList"
FROM documents d
JOIN entity_mentions em ON d.id = em.document_id
JOIN entities e ON em.entity_id = e.id
WHERE em.entity_id IN (
  SELECT entity_id FROM entity_mentions WHERE document_id = :documentId!
)
  AND d.id != :documentId!
GROUP BY d.id, d.title, d.file_name, d.file_type, d.evidence_type, d.red_flag_rating, d.date_created, d.extracted_date
ORDER BY "sharedEntityCount" DESC, d.red_flag_rating DESC, COALESCE(d.extracted_date, d.date_created) DESC
LIMIT :limit!;
