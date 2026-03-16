import type {
  InvestigationCaseEvidenceItemDto,
  InvestigationEvidenceByTypeResponseDto,
  InvestigationEvidenceListItemDto,
  InvestigationEvidenceListResponseDto,
} from '@shared/dto/investigations';

const safeMetadataJson = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  if (value == null) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

const normalizeTargetType = (value: unknown): 'document' | 'entity' | 'media' | null => {
  if (value === 'document' || value === 'entity' || value === 'media') return value;
  return null;
};

export const mapInvestigationEvidenceListItemDto = (
  row: any,
): InvestigationEvidenceListItemDto => ({
  id: Number(row.id || 0),
  type: String(row.type || 'document'),
  title: String(row.title || 'Untitled evidence'),
  description: String(row.description || ''),
  sourcePath: String(row.source_path || row.sourcePath || ''),
  metadataJson: safeMetadataJson(row.metadata_json ?? row.metadataJson),
  investigationEvidenceId: Number(
    row.investigation_evidence_id ?? row.investigationEvidenceId ?? row.id ?? 0,
  ),
  relevance: String(row.relevance || 'medium'),
  extractedAt: String(row.extracted_at || row.extractedAt || row.added_at || ''),
  extractedBy:
    row.extracted_by || row.extractedBy ? String(row.extracted_by ?? row.extractedBy) : null,
});

export const mapInvestigationEvidenceListResponseDto = (
  result: any,
): InvestigationEvidenceListResponseDto => ({
  data: Array.isArray(result?.data)
    ? result.data.map(mapInvestigationEvidenceListItemDto)
    : Array.isArray(result)
      ? result.map(mapInvestigationEvidenceListItemDto)
      : [],
  total: Number(result?.total || 0),
  limit: Number(result?.limit || 0),
  offset: Number(result?.offset || 0),
});

export const mapInvestigationCaseEvidenceItemDto = (
  row: any,
): InvestigationCaseEvidenceItemDto => ({
  id: Number(row.id || 0),
  type: String(row.type || 'other'),
  title: String(row.title || 'Untitled evidence'),
  description: String(row.description || ''),
  sourcePath: String(row.source_path || row.sourcePath || ''),
  metadataJson: safeMetadataJson(row.metadata_json ?? row.metadataJson),
  investigationEvidenceId:
    typeof row.investigation_evidence_id === 'number'
      ? row.investigation_evidence_id
      : typeof row.investigationEvidenceId === 'number'
        ? row.investigationEvidenceId
        : Number(row.investigation_evidence_id ?? row.investigationEvidenceId ?? 0) || undefined,
  documentId:
    (row.document_id ?? row.documentId) == null
      ? null
      : Number.isFinite(Number(row.document_id ?? row.documentId))
        ? Number(row.document_id ?? row.documentId)
        : null,
  mediaItemId:
    (row.media_item_id ?? row.mediaItemId) == null
      ? null
      : Number.isFinite(Number(row.media_item_id ?? row.mediaItemId))
        ? Number(row.media_item_id ?? row.mediaItemId)
        : null,
  redFlagRating: Number(row.red_flag_rating ?? row.redFlagRating ?? 0),
  relevance: String(row.relevance || 'medium'),
  addedAt: String(row.added_at || row.addedAt || row.extracted_at || ''),
  addedBy: row.added_by || row.addedBy ? String(row.added_by ?? row.addedBy) : null,
  notes: String(row.notes || ''),
  targetType: normalizeTargetType(row.target_type ?? row.targetType),
  targetId:
    (row.target_id ?? row.targetId) == null
      ? null
      : Number.isFinite(Number(row.target_id ?? row.targetId))
        ? Number(row.target_id ?? row.targetId)
        : null,
  ingestRunId: row.ingest_run_id ?? row.ingestRunId ?? null,
  evidenceLadder:
    (row.evidence_ladder ?? row.evidenceLadder)
      ? String(row.evidence_ladder ?? row.evidenceLadder)
      : null,
  pipelineVersion:
    (row.pipeline_version ?? row.pipelineVersion)
      ? String(row.pipeline_version ?? row.pipelineVersion)
      : null,
  evidencePack: row.evidence_pack ?? row.evidencePack ?? null,
  wasAgentic: Boolean(row.was_agentic ?? row.wasAgentic),
});

export const mapInvestigationEvidenceByTypeResponseDto = (
  payload: any,
): InvestigationEvidenceByTypeResponseDto => {
  const allItems = Array.isArray(payload?.all)
    ? payload.all.map(mapInvestigationCaseEvidenceItemDto)
    : [];

  const byType: Record<string, InvestigationCaseEvidenceItemDto[]> = {};
  for (const [type, items] of Object.entries(payload?.byType || {})) {
    byType[type] = Array.isArray(items)
      ? (items as any[]).map(mapInvestigationCaseEvidenceItemDto)
      : [];
  }

  const counts: Record<string, number> = {};
  for (const [type, items] of Object.entries(byType)) {
    counts[type] = Array.isArray(items) ? items.length : 0;
  }

  return {
    all: allItems,
    byType,
    counts,
    total: Number(payload?.total || allItems.length),
  };
};
