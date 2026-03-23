import { useEffect, useState } from 'react';
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
  const [deepLinkedEvidenceId, setDeepLinkedEvidenceId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedInvestigationId) return;

    const pathMatch =
      location.pathname.match(/^\/investigate\/case\/([^/]+)\/evidence\/([^/?#]+)/) ||
      location.pathname.match(/^\/investigations\/([^/]+)\/evidence\/([^/?#]+)/);
    const queryEvidenceId = new URLSearchParams(location.search).get('evidenceId');

    if (!pathMatch && !queryEvidenceId) {
      setDeepLinkedEvidenceId(null);
      return;
    }

    const routeInvestigationId = pathMatch?.[1] || selectedInvestigationId;
    const routeEvidenceId = pathMatch?.[2] || queryEvidenceId;

    if (!routeEvidenceId) return;
    if (String(routeInvestigationId) !== String(selectedInvestigationId)) return;

    setDeepLinkedEvidenceId(String(routeEvidenceId));

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
    loadCaseFolder,
    location.pathname,
    location.search,
    navigateToTab,
    openEvidence,
    selectedInvestigationId,
  ]);

  return { deepLinkedEvidenceId };
};
