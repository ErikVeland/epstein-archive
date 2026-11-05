import React, {
  createContext,
  useContext,
  useState,
  useRef,
  ReactNode,
  useCallback,
  useMemo,
} from 'react';
import { Investigation } from '@client/types/investigation';
import { useAuth } from './AuthContext';
import { useApiStatus } from './ApiStatusContext';
import { apiClient } from '@client/services/apiClient';
import { trackInvestigationEvent } from '@client/utils/investigationTelemetry';
import { mapApiInvestigation } from '@client/domains/investigations/investigations.model';
import {
  buildInvestigationEvidencePayload,
  type InvestigationEvidenceItem as InvestigationItem,
} from './investigationEvidencePayload';

interface InvestigationsContextType {
  investigations: Investigation[];
  selectedInvestigation: Investigation | null;
  isLoading: boolean;
  error: string | null;
  loadInvestigations: () => Promise<Investigation[]>;
  selectInvestigation: (id: string) => void;
  createInvestigation: (
    data: Omit<Investigation, 'id' | 'createdAt' | 'updatedAt' | 'team' | 'permissions' | 'tags'>,
  ) => Promise<Investigation | null>;
  addToInvestigation: (
    investigationId: string,
    item: InvestigationItem,
    relevance: 'high' | 'medium' | 'low',
  ) => Promise<void>;
}

const InvestigationsContext = createContext<InvestigationsContextType | undefined>(undefined);

interface InvestigationsProviderProps {
  children: ReactNode;
}

export const InvestigationsProvider: React.FC<InvestigationsProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { status: apiStatus } = useApiStatus();
  const isDev = Boolean(import.meta.env.DEV);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [selectedInvestigation, setSelectedInvestigation] = useState<Investigation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingLoad = useRef<Promise<Investigation[]> | null>(null);

  const loadInvestigations = useCallback(async (): Promise<Investigation[]> => {
    if (pendingLoad.current) return pendingLoad.current;
    if (apiStatus === 'down') {
      const message = isDev
        ? 'API not available. Start the backend with "pnpm server" (default http://localhost:3012/api).'
        : 'Service temporarily unavailable. Please try again shortly.';
      setError(message);
      throw new Error(message);
    }
    setIsLoading(true);
    setError(null);
    const request = (async () => {
      try {
        const payload = await apiClient.getInvestigations();
        const mapped = payload.data.map(mapApiInvestigation);
        setInvestigations(mapped);
        return mapped;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load investigations');
        throw err;
      } finally {
        pendingLoad.current = null;
        setIsLoading(false);
      }
    })();
    pendingLoad.current = request;
    return request;
  }, [apiStatus, isDev]);

  const selectInvestigation = useCallback(
    (id: string) => {
      const investigation = investigations.find((inv) => inv.id === id) || null;
      setSelectedInvestigation(investigation);
    },
    [investigations],
  );

  const createInvestigation = useCallback(
    async (
      data: Omit<Investigation, 'id' | 'createdAt' | 'updatedAt' | 'team' | 'permissions' | 'tags'>,
    ): Promise<Investigation | null> => {
      if (!user || (user.role !== 'admin' && user.role !== 'investigator')) {
        setError('Sign in with an investigator account to create a case.');
        return null;
      }
      setIsLoading(true);
      setError(null);
      try {
        const inv = await apiClient.createInvestigation({
          title: data.title,
          description: data.description,
          scope: data.hypothesis,
        });
        if (!inv) throw new Error('The server did not return the new case.');

        const newInvestigation: Investigation = {
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
          team: [
            {
              id: user?.id || '',
              name: user?.username || 'Current User',
              email: user?.email || '',
              role: 'lead',
              permissions: ['read', 'write', 'admin'],
              joinedAt: new Date(inv.createdAt),
              organization: '',
              expertise: [],
              status: 'active',
            },
          ],
          leadInvestigator: user?.id || '',
          permissions: [],
          tags: [],
          priority: 'medium',
        };

        setInvestigations((current) => [
          newInvestigation,
          ...current.filter((item) => item.id !== newInvestigation.id),
        ]);
        return newInvestigation;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create investigation';
        setError(errorMessage);
        console.error('Error creating investigation:', err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [user],
  );

  const addToInvestigation = useCallback(
    async (
      investigationId: string,
      item: InvestigationItem,
      relevance: 'high' | 'medium' | 'low',
    ) => {
      if (!user || (user.role !== 'admin' && user.role !== 'investigator')) {
        const message = 'Sign in with an investigator account to add evidence.';
        setError(message);
        throw new Error(message);
      }
      setError(null);
      try {
        const evidencePayload = buildInvestigationEvidencePayload(item, relevance);

        // Call the API to persist
        const result = await apiClient.post<{ id: string | number }>(
          `/investigations/${encodeURIComponent(investigationId)}/evidence`,
          evidencePayload,
        );

        // Dispatch a custom event for other components to listen to
        const event = new CustomEvent('investigation-item-added', {
          detail: { investigationId, item, relevance, evidenceId: result.id },
        });
        window.dispatchEvent(event);
        trackInvestigationEvent('investigation_evidence_added', {
          caseId: investigationId,
          metadata: { evidenceType: item.type || 'unknown', relevance },
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to add item to investigation';
        setError(errorMessage);
        console.error('Error adding to investigation:', err);
        throw err; // Re-throw so UI can handle
      }
    },
    [user],
  );

  const contextValue = useMemo(
    () => ({
      investigations,
      selectedInvestigation,
      isLoading,
      error,
      loadInvestigations,
      selectInvestigation,
      createInvestigation,
      addToInvestigation,
    }),
    [
      investigations,
      selectedInvestigation,
      isLoading,
      error,
      loadInvestigations,
      selectInvestigation,
      createInvestigation,
      addToInvestigation,
    ],
  );

  return (
    <InvestigationsContext.Provider value={contextValue}>{children}</InvestigationsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useInvestigations = () => {
  const context = useContext(InvestigationsContext);
  if (context === undefined) {
    throw new Error('useInvestigations must be used within an InvestigationsProvider');
  }
  return context;
};
