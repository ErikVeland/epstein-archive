import { investigationsApi } from './investigations.api';
import {
  findEvidenceByDeepLinkId,
  normalizeCaseFolder,
  resolveCaseEvidenceTarget,
  selectShareableInvestigationId,
} from './investigations.model';
import type {
  InvestigationCaseEvidenceItemDto,
  InvestigationEvidenceByTypeResponseDto,
} from '@shared/dto/investigations';

export const investigationActions = {
  async createCaseAndAdd(args: {
    title: string;
    description?: string;
    ownerId: string;
    scope?: string;
    evidence?: any;
  }): Promise<{ investigation: any; added: boolean; shareId: string }> {
    const investigation = await investigationsApi.create({
      title: args.title,
      description: args.description,
      ownerId: args.ownerId,
      scope: args.scope,
    });

    let added = false;
    if (args.evidence) {
      await investigationsApi.addEvidence(String(investigation.id), args.evidence);
      added = true;
    }

    return {
      investigation,
      added,
      shareId: selectShareableInvestigationId(investigation),
    };
  },

  async addEvidence(investigationId: string, payload: any): Promise<any> {
    return investigationsApi.addEvidence(investigationId, payload);
  },

  async loadCaseFolder(investigationId: string): Promise<InvestigationEvidenceByTypeResponseDto> {
    return investigationsApi.getCaseFolder(investigationId);
  },

  async exportArtifacts(_investigationId: string): Promise<{
    available: boolean;
    reason?: string;
    alternative?: string;
  }> {
    return {
      available: false,
      reason: 'Artifact export orchestration endpoint is not available in this build.',
      alternative: 'Use Evidence Packet Export from the Export tab.',
    };
  },

  async openEvidence(
    item: InvestigationCaseEvidenceItemDto,
    deps: {
      navigate: (to: string) => void;
      setDocumentId: (id: string) => void;
      setEntityId: (id: string) => void;
      setFocusReturnEl?: (el: HTMLElement | null) => void;
      triggerEl?: HTMLElement | null;
      addToast: (payload: {
        text: string;
        type: 'success' | 'error' | 'warning' | 'info';
        action?: { label: string; onClick: () => void | Promise<void> };
      }) => void;
      isAdmin?: boolean;
      onRemoveBrokenLink?: (investigationEvidenceId: number) => Promise<void>;
    },
  ): Promise<boolean> {
    deps.setFocusReturnEl?.(deps.triggerEl || null);

    const { targetType, targetId, metadata } = resolveCaseEvidenceTarget(item);

    if (targetType === 'document' && targetId) {
      deps.setDocumentId(String(targetId));
      return true;
    }

    if (targetType === 'entity' && targetId) {
      deps.setEntityId(String(targetId));
      return true;
    }

    if (targetType === 'media' && targetId) {
      if (metadata.document_id) {
        deps.setDocumentId(String(metadata.document_id));
        return true;
      }
      const evidenceType = String(item?.type || '');
      if (evidenceType === 'audio') {
        deps.navigate(`/media/audio?id=${targetId}`);
      } else if (evidenceType === 'video') {
        deps.navigate(`/media/video?id=${targetId}`);
      } else {
        deps.navigate(`/media/photos?photoId=${targetId}`);
      }
      return true;
    }

    const evidenceLinkId = item.investigationEvidenceId;
    deps.addToast({
      text: 'Source missing for this evidence link.',
      type: 'warning',
      action:
        deps.isAdmin &&
        Number.isFinite(Number(evidenceLinkId)) &&
        typeof deps.onRemoveBrokenLink === 'function'
          ? {
              label: 'Remove link',
              onClick: async () => {
                await deps.onRemoveBrokenLink!(Number(evidenceLinkId));
              },
            }
          : undefined,
    });

    return false;
  },

  resolveDeepLinkedItem(
    caseFolderPayload: InvestigationEvidenceByTypeResponseDto | null,
    evidenceId: string | null,
  ): InvestigationCaseEvidenceItemDto | null {
    return findEvidenceByDeepLinkId(caseFolderPayload, evidenceId);
  },

  normalizeCaseFolder,
};
