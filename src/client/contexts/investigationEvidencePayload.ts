export interface InvestigationEvidenceItem {
  id?: string | number;
  type?: string;
  title?: string;
  description?: string;
  sourceId?: string | number;
  source?: string;
  metadata?: Record<string, unknown>;
}

export type InvestigationEvidenceRelevance = 'high' | 'medium' | 'low';

/** Builds the flat request body accepted by POST /investigations/:id/evidence. */
export function buildInvestigationEvidencePayload(
  item: InvestigationEvidenceItem,
  relevance: InvestigationEvidenceRelevance,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    relevance,
    notes: item.description || '',
  };
  const sourceId = item.sourceId || item.id;

  if (item.type === 'entity') {
    payload.type = 'entity';
    payload.title = item.title || 'Entity';
    payload.description = item.description || '';
    payload.source_path = `entity:${sourceId}`;
    payload.entity_id = sourceId;
  } else if (item.type === 'document') {
    payload.type = 'document';
    payload.title = item.title || 'Document';
    payload.description = item.description || '';
    payload.source_path = `document:${sourceId}`;
    payload.document_id = sourceId;
  } else if (item.type === 'flight') {
    payload.type = 'flight_log';
    payload.title = item.title || 'Flight Record';
    payload.description = item.description || '';
    payload.source_path = `flight:${sourceId}`;
  } else if (item.type === 'property') {
    payload.type = 'property_record';
    payload.title = item.title || 'Property Record';
    payload.description = item.description || '';
    payload.source_path = `property:${sourceId}`;
  } else if (item.type === 'email') {
    payload.type = 'email';
    payload.title = item.title || 'Email';
    payload.description = item.description || '';
    payload.source_path = `email:${sourceId}`;
  } else {
    payload.type = item.type || 'evidence';
    payload.title = item.title || 'Evidence';
    payload.description = item.description || '';
    payload.source_path = item.source || `evidence:${item.id || item.sourceId || 'manual'}`;
  }

  if (item.metadata) payload.metadata = item.metadata;
  return payload;
}
