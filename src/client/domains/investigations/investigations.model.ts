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

export type EvidenceTargetType = 'document' | 'entity' | 'media' | null;

export interface NormalizedCaseEvidenceItem extends Omit<
  InvestigationCaseEvidenceItemDto,
  'targetId' | 'targetType'
> {
  targetType: EvidenceTargetType;
  targetId: string | null;
  metadata: Record<string, any>;
}

const safeParseJson = (value: unknown): Record<string, any> => {
  if (!value) return {};
  if (typeof value === 'object') return value as Record<string, any>;
  if (typeof value !== 'string') return {};
  try {
    return JSON.parse(value) as Record<string, any>;
  } catch {
    return {};
  }
};

export const mapApiInvestigation = (inv: any): Investigation & { uuid?: string } => ({
  id: String(inv.id),
  title: inv.title,
  description: inv.description || '',
  hypothesis: inv.scope || '',
  status:
    inv.status === 'open'
      ? 'active'
      : inv.status === 'in_review'
        ? 'review'
        : inv.status === 'closed'
          ? 'published'
          : 'archived',
  createdAt: new Date(inv.createdAt),
  updatedAt: new Date(inv.updatedAt),
  team: [],
  leadInvestigator: String(inv.ownerId || ''),
  permissions: [],
  tags: [],
  priority: 'medium',
  uuid: inv.uuid ? String(inv.uuid) : undefined,
});

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
): { targetType: EvidenceTargetType; targetId: string | null; metadata: Record<string, any> } => {
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

export const selectShareableInvestigationId = (inv: any): string =>
  String(inv?.uuid || inv?.id || '');
