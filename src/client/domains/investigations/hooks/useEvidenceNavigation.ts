import { useEffect } from 'react';
import type { Location } from 'react-router-dom';
import { investigationActions } from '../investigations.actions';
import type {
  InvestigationCaseEvidenceItemDto,
  InvestigationEvidenceByTypeResponseDto,
} from '@shared/dto/investigations';

interface UseEvidenceNavigationArgs {
  selectedInvestigationId: string | null;
  location: Location;
  activeTab: string;
  navigateToTab: (tab: string) => void;
  loadCaseFolder: () => Promise<InvestigationEvidenceByTypeResponseDto | null>;
  openEvidence: (
    item: InvestigationCaseEvidenceItemDto,
    triggerEl?: HTMLElement | null,
  ) => Promise<boolean>;
  addToast: (payload: { text: string; type: 'success' | 'error' | 'warning' | 'info' }) => void;
}

export const useEvidenceNavigation = ({
  selectedInvestigationId,
  location,
  activeTab,
  navigateToTab,
  loadCaseFolder,
  openEvidence,
  addToast,
}: UseEvidenceNavigationArgs) => {
  const pathMatch =
    location.pathname.match(/^\/investigate\/case\/([^/]+)\/evidence\/([^/?#]+)/) ||
    location.pathname.match(/^\/investigations\/([^/]+)\/evidence\/([^/?#]+)/);
  const queryEvidenceId = new URLSearchParams(location.search).get('evidenceId');

  const routeInvestigationId = pathMatch?.[1] || selectedInvestigationId;
  const routeEvidenceId = pathMatch?.[2] || queryEvidenceId;

  const deepLinkedEvidenceId =
    selectedInvestigationId &&
    routeEvidenceId &&
    String(routeInvestigationId) === String(selectedInvestigationId)
      ? String(routeEvidenceId)
      : null;

  useEffect(() => {
    if (!deepLinkedEvidenceId) return;

    const openEvidenceFromRoute = async () => {
      if (activeTab !== 'casefolder') navigateToTab('casefolder');

      try {
        const payload = await loadCaseFolder();
        const match = investigationActions.resolveDeepLinkedItem(payload, routeEvidenceId);
        if (match) {
          await openEvidence(match, null);
        } else {
          addToast({
            text: 'Evidence deep link not found in this case.',
            type: 'warning',
          });
        }
      } catch (error) {
        console.error('Failed to resolve evidence deep link', error);
        addToast({
          text: 'Failed to resolve evidence deep link.',
          type: 'error',
        });
      }
    };

    void openEvidenceFromRoute();
  }, [
    activeTab,
    addToast,
    deepLinkedEvidenceId,
    loadCaseFolder,
    navigateToTab,
    openEvidence,
    routeEvidenceId,
  ]);

  return { deepLinkedEvidenceId };
};
