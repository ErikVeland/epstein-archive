/* @name getMentionsQueue */
SELECT
  m.id, m.entity_id as "entityId", m.document_id as "documentId", m.mention_context as "mentionContext", m.confidence as "confidenceScore",
  e.full_name as "entityName", d.file_name as "fileName", ds.signal_score as "signalScore"
FROM entity_mentions m
JOIN entities e ON m.entity_id = e.id
JOIN documents d ON m.document_id = d.id
LEFT JOIN document_sentences ds ON m.sentence_id = ds.id
WHERE m.verified = 0
ORDER BY ds.signal_score DESC, m.confidence ASC
LIMIT :limit!;

/* @name verifyMention */
UPDATE entity_mentions
SET verified = 1, verified_by = :verifiedBy!, verified_at = CURRENT_TIMESTAMP
WHERE id = :id!;

/* @name rejectMention */
UPDATE entity_mentions
SET verified = -1, verified_by = :verifiedBy!, verified_at = CURRENT_TIMESTAMP, rejection_reason = :reason!
WHERE id = :id!;

/* @name getClaimsQueue */
SELECT
  c.id, c.subject_entity_id as "subjectEntityId", c.predicate, c.object_text as "objectText", c.confidence,
  ds.signal_score as "signalScore", d.file_name as "fileName",
  e.full_name as "subjectEntityName"
FROM claim_triples c
JOIN documents d ON c.document_id = d.id
LEFT JOIN document_sentences ds ON c.sentence_id = ds.id
LEFT JOIN entities e ON c.subject_entity_id = e.id
WHERE c.verified = 0
ORDER BY ds.signal_score DESC, c.confidence ASC
LIMIT :limit!;

/* @name verifyClaim */
UPDATE claim_triples
SET verified = 1, verified_by = :verifiedBy!, verified_at = CURRENT_TIMESTAMP
WHERE id = :id!;

/* @name rejectClaim */
UPDATE claim_triples
SET verified = -1, verified_by = :verifiedBy!, verified_at = CURRENT_TIMESTAMP, rejection_reason = :reason!
WHERE id = :id!;
