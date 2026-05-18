/* @name getForensicSignals */
SELECT
       s.id,
       s.signal_type,
       s.confidence,
       s.risk_score,
       s.source_type,
       s.source_ref_id,
       s.entity_ids,
       s.metadata_json,
       s.status,
       s.created_at,
       s.updated_at,
       (SELECT json_agg(json_build_object('id', e.id, 'name', e.full_name, 'role', se.role))
        FROM forensic_signal_entities se
        JOIN entities e ON se.entity_id = e.id
        WHERE se.signal_id = s.id) as entities,
       (SELECT json_agg(json_build_object('id', d.id, 'file_name', d.file_name, 'snippet', sev.snippet))
        FROM forensic_signal_evidence sev
        JOIN documents d ON sev.document_id = d.id
        WHERE sev.signal_id = s.id) as evidence
FROM forensic_signals s
WHERE (:status::text IS NULL OR s.status = :status)
  AND (:type::text IS NULL OR s.signal_type = :type)
ORDER BY s.created_at DESC
LIMIT :limit! OFFSET :offset!;

/* @name getForensicSignalById */
SELECT
       s.id,
       s.signal_type,
       s.confidence,
       s.risk_score,
       s.source_type,
       s.source_ref_id,
       s.entity_ids,
       s.metadata_json,
       s.status,
       s.created_at,
       s.updated_at,
       (SELECT json_agg(json_build_object('id', e.id, 'name', e.full_name, 'role', se.role))
        FROM forensic_signal_entities se
        JOIN entities e ON se.entity_id = e.id
        WHERE se.signal_id = s.id) as entities,
       (SELECT json_agg(json_build_object('id', d.id, 'file_name', d.file_name, 'snippet', sev.snippet))
        FROM forensic_signal_evidence sev
        JOIN documents d ON sev.document_id = d.id
        WHERE sev.signal_id = s.id) as evidence
FROM forensic_signals s
WHERE s.id = :id!;

/* @name createForensicSignal */
INSERT INTO forensic_signals (signal_type, confidence, risk_score, status, metadata_json)
VALUES (:signalType!, :confidence, :riskScore, :status, :metadata)
RETURNING id;

/* @name addEntityToSignal */
INSERT INTO forensic_signal_entities (signal_id, entity_id, role)
VALUES (:signalId!, :entityId!, :role)
ON CONFLICT (signal_id, entity_id) DO UPDATE SET
  role = EXCLUDED.role;

/* @name addEvidenceToSignal */
INSERT INTO forensic_signal_evidence (signal_id, document_id, snippet)
VALUES (:signalId!, :documentId!, :snippet)
ON CONFLICT (signal_id, document_id) DO UPDATE SET
  snippet = EXCLUDED.snippet;

/* @name updateSignalStatus */
UPDATE forensic_signals
SET 
  status = :status!,
  updated_at = CURRENT_TIMESTAMP
WHERE id = :id!;

/* @name getSignalsByEntityId */
SELECT
  s.id,
  s.signal_type,
  s.confidence,
  s.risk_score,
  s.source_type,
  s.source_ref_id,
  s.entity_ids,
  s.metadata_json,
  s.status,
  s.created_at,
  s.updated_at
FROM forensic_signals s
JOIN forensic_signal_entities se ON s.id = se.signal_id
WHERE se.entity_id = :entityId!
ORDER BY s.created_at DESC;
