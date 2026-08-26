import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from 'react';
import { Investigation } from '@client/types/investigation';
import { useAuth } from './AuthContext';
import { useApiStatus } from './ApiStatusContext';
import {
  buildInvestigationEvidencePayload,
  type InvestigationEvidenceItem as InvestigationItem,
} from './investigationEvidencePayload';

interface InvestigationsContextType {
  investigations: Investigation[];
  selectedInvestigation: Investigation | null;
  isLoading: boolean;
  error: string | null;
  loadInvestigations: () => Promise<void>;
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

  const loadInvestigations = useCallback(async () => {
    if (apiStatus === 'down') {
      setIsLoading(false);
      setError(
        isDev
          ? 'API not available. Start the backend with "pnpm server" (default http://localhost:3012/api).'
          : 'Service temporarily unavailable. Please try again shortly.',
      );
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/investigations');
      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        throw new Error(`Failed to load investigations (${resp.status})${body ? `: ${body}` : ''}`);
      }
      const payload: unknown = await resp.json();
      const data =
        typeof payload === 'object' && payload !== null
          ? (payload as { data?: unknown })
          : { data: [] };
      const rows = Array.isArray(data.data) ? (data.data as Array<Record<string, unknown>>) : [];
      const mapped: Investigation[] = rows.map((inv) => ({
        id: String(inv.id),
        title: String(inv.title || ''),
        description: String(inv.description || ''),
        hypothesis: String(inv.scope || ''),
        status:
          inv.status === 'open'
            ? 'active'
            : inv.status === 'in_review'
              ? 'review'
              : inv.status === 'closed'
                ? 'published'
                : ('archived' as Investigation['status']),
        createdAt: new Date(String(inv.created_at || '')),
        updatedAt: new Date(String(inv.updated_at || '')),
        team: (inv.team as Investigation['team']) || [
          {
            id: String(inv.owner_id || ''),
            name: String(inv.owner_name || 'Investigation Owner'),
            email: String(inv.owner_email || ''),
            role: 'lead' as const,
            permissions: ['read', 'write', 'admin'],
            joinedAt: new Date(String(inv.created_at || '')),
            organization: String(inv.owner_organization || ''),
            expertise: [],
          },
        ],
        leadInvestigator: String(inv.owner_id || ''),
        permissions: [],
        tags: [],
        priority: 'medium' as const,
      }));
      setInvestigations(mapped);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load investigations';
      setError(errorMessage);
      console.error('Error loading investigations:', err);
    } finally {
      setIsLoading(false);
    }
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
      setIsLoading(true);
      setError(null);
      try {
        const resp = await fetch('/api/investigations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: data.title,
            description: data.description,
            ownerId: user?.id,
            scope: data.hypothesis,
          }),
        });

        if (!resp.ok) {
          throw new Error('Failed to create investigation');
        }

        const inv = await resp.json();
        await loadInvestigations(); // Refresh the list

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
          createdAt: new Date(inv.created_at),
          updatedAt: new Date(inv.updated_at),
          team: [
            {
              id: user?.id || '',
              name: user?.username || 'Current User',
              email: user?.email || '',
              role: 'lead',
              permissions: ['read', 'write', 'admin'],
              joinedAt: new Date(inv.created_at),
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
    [loadInvestigations, user],
  );

  const addToInvestigation = useCallback(
    async (
      investigationId: string,
      item: InvestigationItem,
      relevance: 'high' | 'medium' | 'low',
    ) => {
      setError(null);
      try {
        const evidencePayload = buildInvestigationEvidencePayload(item, relevance);

        // Call the API to persist
        const response = await fetch(`/api/investigations/${investigationId}/evidence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(evidencePayload),
        });

        if (!response.ok) {
          throw new Error(`Failed to add evidence: ${response.statusText}`);
        }

        const result = await response.json();

        // Dispatch a custom event for other components to listen to
        const event = new CustomEvent('investigation-item-added', {
          detail: { investigationId, item, relevance, evidenceId: result.id },
        });
        window.dispatchEvent(event);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to add item to investigation';
        setError(errorMessage);
        console.error('Error adding to investigation:', err);
        throw err; // Re-throw so UI can handle
      }
    },
    [],
  );

  useEffect(() => {
    loadInvestigations();
  }, [loadInvestigations]);

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
