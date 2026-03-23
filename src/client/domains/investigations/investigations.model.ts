import type {
  Investigation,
  EvidenceItem as WorkspaceEvidenceItem,
} from '../../../types/investigation';
import type {
  InvestigationCaseEvidenceItemDto,
  InvestigationEvidenceByTypeResponseDto,
  InvestigationEvidenceListItemDto,
  InvestigationEvidenceListResponseDto,
} from '@shared/dto/investigations';
import type { InvestigationSummaryDto } from './investigations.api';

export type EvidenceTargetType = 'document' | 'entity' | 'media' | null;

export interface NormalizedCaseEvidenceItem extends Omit<
  InvestigationCaseEvidenceItemDto,
  'targetId' | 'targetType'
> {
  targetType: EvidenceTargetType;
  targetId: string | null;
  metadata: Record<string, unknown>;
}

const safeParseJson = (value: unknown): Record<string, unknown> => {
  if (!value) return {};
  if (typeof value === 'object') return value as Record<string, unknown>;
  if (typeof value !== 'string') return {};
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
};

export const mapApiInvestigation = (
  inv: InvestigationSummaryDto | Record<string, unknown>,
): Investigation & { uuid?: string } => {
  const r = inv as Record<string, unknown>;
  return {
    id: String(r.id),
    title: String(r.title || ''),
    description: String(r.description || ''),
    hypothesis: String(r.scope || ''),
    status:
      r.status === 'open'
        ? 'active'
        : r.status === 'in_review'
          ? 'review'
          : r.status === 'closed'
            ? 'published'
            : ('archived' as Investigation['status']),
    createdAt: new Date(String(r.createdAt || '')),
    updatedAt: new Date(String(r.updatedAt || '')),
    team: [],
    leadInvestigator: String(r.ownerId || ''),
    permissions: [],
    tags: [],
    priority: 'medium' as const,
    uuid: r.uuid ? String(r.uuid) : undefined,
  };
};

export const normalizeEvidenceListItem = (
  row: InvestigationEvidenceListItemDto,
): WorkspaceEvidenceItem => ({
  id: String(row.id),
  title: row.title || 'Untitled evidence',
  description: row.description || '',
  type: (row.type || 'document') as WorkspaceEvidenceItem['type'],
  sourceId: String(row.id || ''),
  source: row.sourcePath || '',
  relevance: (row.relevance || 'medium') as WorkspaceEvidenceItem['relevance'],
  credibility: 'verified',
  extractedAt: new Date(row.extractedAt || Date.now()),
  extractedBy: row.extractedBy || 'system',
});

export const normalizeEvidencePage = (payload: InvestigationEvidenceListResponseDto) => ({
  data: (payload.data || []).map(normalizeEvidenceListItem),
  total: Number(payload.total || 0),
  limit: Number(payload.limit || 0),
  offset: Number(payload.offset || 0),
});

export const resolveCaseEvidenceTarget = (
  item: InvestigationCaseEvidenceItemDto,
): {
  targetType: EvidenceTargetType;
  targetId: string | null;
  metadata: Record<string, unknown>;
} => {
  const metadata = safeParseJson(item.metadataJson);
  const sourcePath = String(item.sourcePath || '');

  const explicitType = item.targetType || null;
  const explicitId = item.targetId;
  if (explicitType && explicitId != null) {
    return { targetType: explicitType, targetId: String(explicitId), metadata };
  }

  if (sourcePath.startsWith('entity:')) {
    const id = sourcePath.split(':')[1] || metadata.entity_id;
    return { targetType: 'entity', targetId: id ? String(id) : null, metadata };
  }

  if (sourcePath.startsWith('document:') || sourcePath.startsWith('doc:') || metadata.document_id) {
    const id = sourcePath.split(':')[1] || metadata.document_id;
    return { targetType: 'document', targetId: id ? String(id) : null, metadata };
  }

  if (
    sourcePath.startsWith('media:') ||
    sourcePath.startsWith('audio:') ||
    sourcePath.startsWith('video:') ||
    metadata.media_item_id
  ) {
    const id = sourcePath.split(':')[1] || metadata.media_item_id;
    return { targetType: 'media', targetId: id ? String(id) : null, metadata };
  }

  return { targetType: null, targetId: null, metadata };
};

export const normalizeCaseFolder = (
  payload: InvestigationEvidenceByTypeResponseDto,
): InvestigationEvidenceByTypeResponseDto & { normalizedAll: NormalizedCaseEvidenceItem[] } => {
  const all = Array.isArray(payload?.all) ? payload.all : [];
  const normalizedAll = all.map((item) => {
    const resolved = resolveCaseEvidenceTarget(item);
    return {
      ...item,
      targetType: resolved.targetType,
      targetId: resolved.targetId,
      metadata: resolved.metadata,
    };
  });

  return {
    all,
    byType: payload?.byType || {},
    counts: payload?.counts || {},
    total: Number(payload?.total || all.length),
    normalizedAll,
  };
};

export const findEvidenceByDeepLinkId = (
  evidence: InvestigationEvidenceByTypeResponseDto | null,
  evidenceId: string | null | undefined,
): InvestigationCaseEvidenceItemDto | null => {
  if (!evidenceId || !evidence?.all?.length) return null;
  const linked = String(evidenceId);
  return (
    evidence.all.find(
      (item) =>
        String(item.id) === linked ||
        String(item.investigationEvidenceId || '') === linked ||
        String(item.investigationEvidenceId || item.id) === linked,
    ) || null
  );
};

export const selectShareableInvestigationId = (inv: Record<string, unknown>): string =>
  String(inv?.uuid || inv?.id || '');
