import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from 'react';
import { Investigation } from '../types/investigation';
import { useAuth } from './AuthContext';

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
    item: any,
    relevance: 'high' | 'medium' | 'low',
  ) => Promise<void>;
}

const InvestigationsContext = createContext<InvestigationsContextType | undefined>(undefined);

interface InvestigationsProviderProps {
  children: ReactNode;
}

export const InvestigationsProvider: React.FC<InvestigationsProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [selectedInvestigation, setSelectedInvestigation] = useState<Investigation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInvestigations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/investigations');
      const data = await resp.json();
      const mapped: Investigation[] = (data.data || []).map((inv: any) => ({
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
        team: inv.team || [
          {
            id: inv.owner_id,
            name: inv.owner_name || 'Investigation Owner',
            email: inv.owner_email || '',
            role: 'lead',
            permissions: ['read', 'write', 'admin'],
            joinedAt: new Date(inv.created_at),
            organization: inv.owner_organization || '',
            expertise: [],
          },
        ],
        leadInvestigator: inv.owner_id,
        permissions: [],
        tags: [],
        priority: 'medium',
      }));
      setInvestigations(mapped);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load investigations';
      setError(errorMessage);
      console.error('Error loading investigations:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    async (investigationId: string, item: any, relevance: 'high' | 'medium' | 'low') => {
      setError(null);
      try {
        // Map the item to evidence format based on type
        const evidencePayload: any = {
          relevance,
          notes: item.description || '',
        };

        // Handle different item types
        if (item.type === 'entity') {
          evidencePayload.type = 'entity';
          evidencePayload.title = item.title || 'Entity';
          evidencePayload.description = item.description || '';
          evidencePayload.source_path = `entity:${item.sourceId || item.id}`;
          evidencePayload.entity_id = item.sourceId || item.id;
        } else if (item.type === 'document') {
          evidencePayload.type = 'document';
          evidencePayload.title = item.title || 'Document';
          evidencePayload.description = item.description || '';
          evidencePayload.source_path = `document:${item.sourceId || item.id}`;
          evidencePayload.document_id = item.sourceId || item.id;
        } else if (item.type === 'flight') {
          evidencePayload.type = 'flight_log';
          evidencePayload.title = item.title || 'Flight Record';
          evidencePayload.description = item.description || '';
          evidencePayload.source_path = `flight:${item.sourceId || item.id}`;
        } else if (item.type === 'property') {
          evidencePayload.type = 'property_record';
          evidencePayload.title = item.title || 'Property Record';
          evidencePayload.description = item.description || '';
          evidencePayload.source_path = `property:${item.sourceId || item.id}`;
        } else if (item.type === 'email') {
          evidencePayload.type = 'email';
          evidencePayload.title = item.title || 'Email';
          evidencePayload.description = item.description || '';
          evidencePayload.source_path = `email:${item.sourceId || item.id}`;
        } else {
          // Generic evidence
          evidencePayload.type = item.type || 'evidence';
          evidencePayload.title = item.title || 'Evidence';
          evidencePayload.description = item.description || '';
          evidencePayload.source_path = item.source || `evidence:${item.id || Date.now()}`;
        }

        // Include any additional metadata
        if (item.metadata) {
          evidencePayload.metadata = item.metadata;
        }

        // Call the API to persist
        const response = await fetch(`/api/investigations/${investigationId}/evidence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ evidence: evidencePayload, relevance }),
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
