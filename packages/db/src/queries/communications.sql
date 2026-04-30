/* @name getThreads */
SELECT 
  COALESCE(metadata_json->>'thread_id', id::text) as "threadId",
  MIN(metadata_json->>'subject') as "subjectCanonical",
  COUNT(*)::integer as "messageCount",
  MIN(date_created) as "firstDate",
  MAX(date_created) as "lastDate",
  jsonb_agg(metadata_json->>'from') as "participantsJson",
  (SELECT content FROM documents d2 WHERE d2.id = MAX(d.id)) as "previewSnippet"
FROM documents d
WHERE evidence_type = 'email'
GROUP BY "threadId"
ORDER BY "lastDate" DESC
LIMIT :limit! OFFSET :offset!;

/* @name getThreadMessages */
SELECT id, content, date_created as "dateCreated", evidence_type as "evidenceType", metadata_json as "metadataJson"
FROM documents
WHERE evidence_type = 'email'
AND (
  metadata_json->>'thread_id' = :threadId
  OR id::text = :threadId
)
ORDER BY date_created ASC;

/* @name getThreadIdForDocument */
SELECT metadata_json->>'thread_id' as "threadId" 
FROM documents 
WHERE id = :documentId!;

/* @name getMessageById */
SELECT * 
FROM documents 
WHERE id = :messageId! AND evidence_type = 'email';

/* @name searchThreads */
SELECT 
  COALESCE(metadata_json->>'thread_id', id::text) as "threadId",
  MAX(date_created) as "lastDate"
FROM documents
WHERE evidence_type = 'email'
AND (
  file_name ILIKE '%' || :query || '%' OR 
  content ILIKE '%' || :query || '%' OR
  metadata_json->>'subject' ILIKE '%' || :query || '%'
)
GROUP BY "threadId"
ORDER BY "lastDate" DESC
LIMIT 50;

/* @name getCommunicationsForEntity */
SELECT d.* 
FROM entity_mentions em
JOIN documents d ON em.document_id = d.id
WHERE em.entity_id = :entityId! AND d.evidence_type = 'email'
ORDER BY d.date_created DESC
LIMIT 500;
