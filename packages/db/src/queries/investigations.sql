/* @name getInvestigations */
SELECT 
  id,
  uuid,
  title,
  description,
  owner_id,
  collaborator_ids,
  status,
  scope,
  created_at,
  updated_at
FROM investigations
WHERE (:status::text IS NULL OR status = :status)
  AND (:ownerId::text IS NULL OR owner_id = :ownerId)
ORDER BY updated_at DESC
LIMIT :limit! OFFSET :offset!;

/* @name countInvestigations */
SELECT COUNT(*)::integer as total 
FROM investigations 
WHERE (:status::text IS NULL OR status = :status)
  AND (:ownerId::text IS NULL OR owner_id = :ownerId);

/* @name getInvestigationById */
SELECT 
  id,
  uuid,
  title,
  description,
  owner_id,
  collaborator_ids,
  status,
  scope,
  created_at,
  updated_at
FROM investigations 
WHERE id = :id!;

/* @name getInvestigationByUuid */
SELECT 
  id,
  uuid,
  title,
  description,
  owner_id,
  collaborator_ids,
  status,
  scope,
  created_at,
  updated_at
FROM investigations 
WHERE uuid = :uuid!;

/* @name deleteInvestigation */
DELETE FROM investigations WHERE id = :id!;

/* @name createInvestigation */
INSERT INTO investigations (title, description, owner_id)
VALUES (:title!, :description, :ownerId!)
RETURNING id;

/* @name updateInvestigation */
UPDATE investigations
SET 
  title = COALESCE(:title, title),
  description = COALESCE(:description, description),
  status = COALESCE(:status, status),
  scope = COALESCE(:scope, scope),
  updated_at = CURRENT_TIMESTAMP
WHERE id = :id!
RETURNING *;

/* @name addCollaborator */
INSERT INTO investigation_collaborators (investigation_id, user_id, permission_level)
VALUES (:investigationId!, :userId!, :permissionLevel)
ON CONFLICT (investigation_id, user_id) DO UPDATE SET
  permission_level = EXCLUDED.permission_level,
  joined_at = CURRENT_TIMESTAMP;

/* @name removeCollaborator */
DELETE FROM investigation_collaborators 
WHERE investigation_id = :investigationId! AND user_id = :userId!;

/* @name getCollaborators */
SELECT user_id, permission_level, joined_at
FROM investigation_collaborators
WHERE investigation_id = :investigationId!;

/* @name getEvidence */
SELECT 
  e.id, 
  e.evidence_type as type, 
  e.title, 
  e.description, 
  e.source_path, 
  e.metadata_json,
  ie.id as investigation_evidence_id,
  ie.relevance, 
  ie.added_at, 
  ie.added_by
FROM investigation_evidence ie
LEFT JOIN evidence e ON ie.evidence_id = e.id
WHERE ie.investigation_id = :investigationId!
ORDER BY ie.added_at DESC
LIMIT :limit OFFSET :offset;

/* @name countEvidence */
SELECT COUNT(*)::integer as total FROM investigation_evidence WHERE investigation_id = :investigationId!;

/* @name getEvidenceBySourcePath */
SELECT id FROM evidence WHERE source_path = :sourcePath!;

/* @name createEvidence */
INSERT INTO evidence (title, description, evidence_type, source_path, original_filename, red_flag_rating)
VALUES (:title!, :description, :evidenceType!, :sourcePath!, :originalFilename!, :redFlagRating!)
RETURNING id;

/* @name addEvidenceToInvestigation */
INSERT INTO investigation_evidence (investigation_id, evidence_id, notes, relevance, added_by)
VALUES (:investigationId!, :evidenceId!, :notes, :relevance, :addedBy)
ON CONFLICT (investigation_id, evidence_id) DO NOTHING
RETURNING id;

/* @name getTimelineEvents */
SELECT * FROM investigation_timeline_events 
WHERE investigation_id = :investigationId! 
ORDER BY start_date ASC;

/* @name createTimelineEvent */
INSERT INTO investigation_timeline_events (investigation_id, title, description, type, start_date, end_date)
VALUES (:investigationId!, :title!, :description, :type!, :startDate!, :endDate)
RETURNING id;

/* @name updateTimelineEvent */
UPDATE investigation_timeline_events
SET 
  title = COALESCE(:title, title),
  description = COALESCE(:description, description),
  type = COALESCE(:type, type),
  start_date = COALESCE(:startDate, start_date),
  end_date = COALESCE(:endDate, end_date),
  confidence = COALESCE(:confidence, confidence),
  entities_json = COALESCE(:entities, entities_json),
  documents_json = COALESCE(:documents, documents_json)
WHERE id = :id!;

/* @name deleteTimelineEvent */
DELETE FROM investigation_timeline_events WHERE id = :id!;

/* @name getChainOfCustody */
SELECT * FROM chain_of_custody WHERE evidence_id = :evidenceId! ORDER BY date ASC;

/* @name addChainOfCustody */
INSERT INTO chain_of_custody (evidence_id, date, actor, action, notes, signature)
VALUES (:evidenceId!, :date!, :actor, :action, :notes, :signature)
RETURNING id;

/* @name getNotebook */
SELECT * FROM investigation_notebook WHERE investigation_id = :investigationId!;

/* @name saveNotebook */
INSERT INTO investigation_notebook (investigation_id, order_json, annotations_json, updated_at)
VALUES (:investigationId!, :orderJson!, :annotationsJson!, CURRENT_TIMESTAMP)
ON CONFLICT (investigation_id) DO UPDATE SET
  order_json = EXCLUDED.order_json,
  annotations_json = EXCLUDED.annotations_json,
  updated_at = EXCLUDED.updated_at;

/* @name getHypotheses */
SELECT * FROM hypotheses WHERE investigation_id = :investigationId! ORDER BY created_at DESC;

/* @name getHypothesisEvidence */
SELECT he.*, e.title as evidence_title, e.evidence_type 
FROM hypothesis_evidence he
LEFT JOIN evidence e ON he.evidence_id = e.id
WHERE he.hypothesis_id = :hypothesisId!;

/* @name createHypothesis */
INSERT INTO hypotheses (investigation_id, title, description)
VALUES (:investigationId!, :title!, :description)
RETURNING id;

/* @name updateHypothesis */
UPDATE hypotheses
SET 
  title = COALESCE(:title, title),
  description = COALESCE(:description, description),
  status = COALESCE(:status, status),
  confidence = COALESCE(:confidence, confidence),
  updated_at = CURRENT_TIMESTAMP
WHERE id = :id!;

/* @name deleteHypothesis */
DELETE FROM hypotheses WHERE id = :id!;

/* @name addEvidenceToHypothesis */
INSERT INTO hypothesis_evidence (hypothesis_id, evidence_id, relevance)
VALUES (:hypothesisId!, :evidenceId!, :relevance)
ON CONFLICT DO NOTHING
RETURNING id;

/* @name removeEvidenceFromHypothesis */
DELETE FROM hypothesis_evidence 
WHERE hypothesis_id = :hypothesisId! AND evidence_id = :evidenceId!;

/* @name logActivity */
INSERT INTO investigation_activity (
  investigation_id, user_id, user_name, action_type, 
  target_type, target_id, target_title, metadata_json,
  doc_id, ent_id, lead_id
) VALUES (
  :investigationId!, :userId, :userName, :actionType!, 
  :targetType, :targetId, :targetTitle, :metadata,
  :docId, :entId, :leadId
)
RETURNING id;

/* @name getActivity */
SELECT * FROM investigation_activity
WHERE investigation_id = :investigationId!
ORDER BY created_at DESC
LIMIT :limit!;

/* @name getDetailedEvidence */
SELECT 
  e.id, 
  e.evidence_type as type, 
  e.title, 
  e.description, 
  e.source_path,
  e.metadata_json,
  ie.id as investigation_evidence_id,
  d.id as document_id,
  m.id as media_item_id,
  e.red_flag_rating,
  ie.relevance, 
  ie.added_at, 
  ie.added_by,
  ie.notes
FROM investigation_evidence ie
LEFT JOIN evidence e ON ie.evidence_id = e.id
LEFT JOIN documents d ON d.file_path = e.source_path
LEFT JOIN media_items m ON m.file_path = e.source_path
WHERE ie.investigation_id = :investigationId! 
ORDER BY ie.added_at DESC;

/* @name getInvestigationsByEvidenceId */
SELECT DISTINCT i.* 
FROM investigations i
JOIN investigation_evidence ie ON i.id = ie.investigation_id
WHERE ie.evidence_id = :evidenceId!
ORDER BY i.updated_at DESC;
