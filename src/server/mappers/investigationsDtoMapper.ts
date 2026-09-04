import type { InvestigationEvidenceRow } from '../db/rowTypes';
import type {
  InvestigativeLeadDto,
  InvestigationListItemDto,
  InvestigationEvidenceByTypeResponseDto,
  InvestigationEvidenceListItemDto,
  InvestigationEvidenceListResponseDto,
  InvestigationCaseEvidenceItemDto,
  LeadStatus,
  LeadPriority,
} from '@shared/dto/investigations';

export const mapInvestigativeLeadDto = (row: Record<string, unknown>): InvestigativeLeadDto => ({
  id: Number(row.id || 0),
  investigationId: Number(row.investigationId ?? row.investigation_id ?? 0),
  title: String(row.title ?? ''),
  description: typeof row.description === 'string' ? row.description : null,
  status: (row.status ?? 'open') as LeadStatus,
  priority: (row.priority ?? 'medium') as LeadPriority,
  sourceDocumentId:
    (row.sourceDocumentId ?? row.source_document_id) != null
      ? Number(row.sourceDocumentId ?? row.source_document_id)
      : null,
  sourceEftaRef: typeof row.sourceEftaRef === 'string' ? row.sourceEftaRef : null,
  assignedTo: typeof row.assignedTo === 'string' ? row.assignedTo : null,
  createdBy: typeof row.createdBy === 'string' ? row.createdBy : null,
  resolvedAt: typeof row.resolvedAt === 'string' ? row.resolvedAt : null,
  resolutionNotes: typeof row.resolutionNotes === 'string' ? row.resolutionNotes : null,
  createdAt: String(row.createdAt ?? row.created_at ?? ''),
  updatedAt: String(row.updatedAt ?? row.updated_at ?? ''),
  leadKind: (row.leadKind ?? row.lead_kind) as InvestigativeLeadDto['leadKind'],
  motifType: (row.motifType ?? row.motif_type ?? null) as string | null,
  harmType: (row.harmType ?? row.harm_type ?? null) as string | null,
  confidence:
    (row.confidence ?? null) !== null && Number.isFinite(Number(row.confidence))
      ? Number(row.confidence)
      : null,
  riskScore:
    (row.riskScore ?? row.risk_score ?? null) !== null &&
    Number.isFinite(Number(row.riskScore ?? row.risk_score))
      ? Number(row.riskScore ?? row.risk_score)
      : null,
  evidenceCount: Number(row.evidenceCount ?? row.evidence_count ?? 0),
  pathLength:
    (row.pathLength ?? row.path_length ?? null) !== null
      ? Number(row.pathLength ?? row.path_length)
      : null,
  sourceSummary: (row.sourceSummary ?? row.source_summary ?? null) as string | null,
  primaryEntities: Array.isArray(row.primaryEntities) ? row.primaryEntities : undefined,
  supportingDocuments: Array.isArray(row.supportingDocuments) ? row.supportingDocuments : undefined,
  contradictionCount: Number(row.contradictionCount ?? row.contradiction_count ?? 0),
  reviewState: String(row.reviewState ?? row.review_state ?? 'unreviewed'),
  explainability: row.explainability ?? row.explainability_json,
});

export const mapInvestigationListItemDto = (
  row: Record<string, unknown>,
): InvestigationListItemDto => ({
  id: Number(row.id || 0),
  uuid: typeof row.uuid === 'string' ? row.uuid : null,
  title: String(row.title ?? ''),
  description: typeof row.description === 'string' ? row.description : null,
  ownerId:
    typeof (row.ownerId ?? row.owner_id) === 'string' ? String(row.ownerId ?? row.owner_id) : null,
  status: String(row.status ?? 'active'),
  scope: typeof row.scope === 'string' ? row.scope : null,
  priority: String(row.priority ?? 'medium'),
  createdAt: String(row.createdAt ?? row.created_at ?? ''),
  updatedAt: String(row.updatedAt ?? row.updated_at ?? ''),
  leadCount: Number(row.leadCount ?? row.lead_count ?? 0),
  evidenceCount: Number(row.evidenceCount ?? row.evidence_count ?? 0),
});

const asJsonString = (value: unknown): string | null => {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const mapInvestigationEvidenceListItemDto = (
  row: InvestigationEvidenceRow,
): InvestigationEvidenceListItemDto => {
  const addedAt = String(row.addedAt ?? row.added_at ?? '');
  const addedBy = (row.addedBy ?? row.added_by ?? null) as string | null;
  return {
    id: Number(row.id || 0),
    type: String(row.type ?? row.evidence_type ?? ''),
    title: row.title != null ? String(row.title) : null,
    description: row.description != null ? String(row.description) : null,
    sourcePath: String(row.sourcePath ?? row.source_path ?? ''),
    metadataJson: asJsonString(row.metadataJson ?? row.metadata_json),
    investigationEvidenceId: Number(
      row.investigationEvidenceId ?? row.investigation_evidence_id ?? 0,
    ),
    relevance: String(row.relevance ?? 'medium'),
    addedAt,
    addedBy,
    // Back-compat aliases used by some UI normalizers
    extractedAt: addedAt,
    extractedBy: addedBy ?? 'system',
  };
};

export const mapInvestigationEvidenceListResponseDto = (
  payload: Record<string, unknown>,
): InvestigationEvidenceListResponseDto => ({
  data: Array.isArray(payload.data)
    ? (payload.data as InvestigationEvidenceRow[]).map(mapInvestigationEvidenceListItemDto)
    : [],
  total: Number(payload.total ?? 0),
  limit: Number(payload.limit ?? 0),
  offset: Number(payload.offset ?? 0),
});

export const mapInvestigationCaseEvidenceItemDto = (
  row: InvestigationEvidenceRow,
): InvestigationCaseEvidenceItemDto => {
  const base = mapInvestigationEvidenceListItemDto(row);
  return {
    ...base,
    notes: row.notes ?? null,
    documentId:
      (row.documentId ?? row.document_id) != null
        ? Number(row.documentId ?? row.document_id)
        : null,
    mediaItemId:
      (row.mediaItemId ?? row.media_item_id) != null
        ? Number(row.mediaItemId ?? row.media_item_id)
        : null,
    redFlagRating: Number(row.redFlagRating ?? row.red_flag_rating ?? 0),
    ingestRunId:
      (row.ingestRunId ?? row.ingest_run_id) != null
        ? Number(row.ingestRunId ?? row.ingest_run_id)
        : null,
    evidenceLadder: (row.evidenceLadder ?? row.evidence_ladder ?? null) as string | null,
    pipelineVersion: (row.pipelineVersion ?? row.pipeline_version ?? null) as string | null,
    evidencePack: (row.evidencePack ?? row.evidence_pack ?? null) as string | null,
    wasAgentic: Boolean(row.wasAgentic ?? row.was_agentic ?? false),
  };
};

export const mapInvestigationEvidenceByTypeResponseDto = (
  payload: Record<string, unknown>,
): InvestigationEvidenceByTypeResponseDto => {
  const all = Array.isArray(payload.all)
    ? (payload.all as InvestigationEvidenceRow[]).map(mapInvestigationCaseEvidenceItemDto)
    : [];

  const byType: Record<string, InvestigationCaseEvidenceItemDto[]> = {};
  const rawByType = payload.byType as Record<string, unknown> | undefined;
  if (rawByType && typeof rawByType === 'object') {
    for (const [type, items] of Object.entries(rawByType)) {
      byType[type] = Array.isArray(items)
        ? (items as InvestigationEvidenceRow[]).map(mapInvestigationCaseEvidenceItemDto)
        : [];
    }
  }

  return {
    all,
    byType,
    counts: (payload.counts && typeof payload.counts === 'object' ? payload.counts : {}) as Record<
      string,
      number
    >,
    total: Number(payload.total ?? all.length),
  };
};
