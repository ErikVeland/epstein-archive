import { useEffect } from 'react';
import type { Location } from 'react-router-dom';
import { investigationActions } from '../investigations.actions';
import { getSelectedCaseEvidenceId } from '@client/features/investigation/investigationRouteUtils';
import type {
  InvestigationCaseEvidenceItemDto,
  InvestigationEvidenceByTypeResponseDto,
} from '@shared/dto/investigations';

interface UseEvidenceNavigationArgs {
  selectedInvestigationId: string | null;
  selectedInvestigationUuid?: string | null;
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
  selectedInvestigationUuid,
  location,
  activeTab,
  navigateToTab,
  loadCaseFolder,
  openEvidence,
  addToast,
}: UseEvidenceNavigationArgs) => {
  const deepLinkedEvidenceId = getSelectedCaseEvidenceId(
    location.pathname,
    location.search,
    selectedInvestigationId,
    selectedInvestigationUuid,
  );

  useEffect(() => {
    if (!deepLinkedEvidenceId) return;

    const openEvidenceFromRoute = async () => {
      if (activeTab !== 'casefolder') navigateToTab('casefolder');

      try {
        const payload = await loadCaseFolder();
        const match = investigationActions.resolveDeepLinkedItem(payload, deepLinkedEvidenceId);
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
  }, [activeTab, addToast, deepLinkedEvidenceId, loadCaseFolder, navigateToTab, openEvidence]);

  return { deepLinkedEvidenceId };
};
