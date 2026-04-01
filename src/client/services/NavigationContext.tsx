import { createContext, useContext } from 'react';

export interface NavigationContextType {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filters: Record<string, unknown>;
  setFilters: (filters: Record<string, unknown>) => void;
  selectedEntity: string | null;
  setSelectedEntity: (entity: string | null) => void;
  selectedDocument: string | null;
  setSelectedDocument: (document: string | null) => void;
  clearNavigation: () => void;
}

export const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
