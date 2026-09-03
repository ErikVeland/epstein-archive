import React, { useState, useEffect, ReactNode } from 'react';
import { NavigationContext } from './NavigationContext';

// Internal provider implementation
const NavigationProviderImpl = ({ children }: { children: ReactNode }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filters, setFilters] = useState<Record<string, unknown>>(() => {
    const saved = localStorage.getItem('navigationFilters');
    return saved ? JSON.parse(saved) : {};
  });
  const [selectedEntity, setSelectedEntity] = useState<string | null>(() =>
    localStorage.getItem('navigationSelectedEntity'),
  );
  const [selectedDocument, setSelectedDocument] = useState<string | null>(() =>
    localStorage.getItem('navigationSelectedDocument'),
  );

  // Search text is route-scoped. Older builds persisted it globally, which caused
  // machine-generated context and highlights to leak into unrelated screens.
  useEffect(() => {
    localStorage.removeItem('navigationSearchTerm');
  }, []);

  useEffect(() => {
    localStorage.setItem('navigationFilters', JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    if (selectedEntity) {
      localStorage.setItem('navigationSelectedEntity', selectedEntity);
    } else {
      localStorage.removeItem('navigationSelectedEntity');
    }
  }, [selectedEntity]);

  useEffect(() => {
    if (selectedDocument) {
      localStorage.setItem('navigationSelectedDocument', selectedDocument);
    } else {
      localStorage.removeItem('navigationSelectedDocument');
    }
  }, [selectedDocument]);

  const clearNavigation = () => {
    setSearchTerm('');
    setFilters({});
    setSelectedEntity(null);
    setSelectedDocument(null);
    localStorage.removeItem('navigationSearchTerm');
    localStorage.removeItem('navigationFilters');
    localStorage.removeItem('navigationSelectedEntity');
    localStorage.removeItem('navigationSelectedDocument');
  };

  return (
    <NavigationContext.Provider
      value={{
        searchTerm,
        setSearchTerm,
        filters,
        setFilters,
        selectedEntity,
        setSelectedEntity,
        selectedDocument,
        setSelectedDocument,
        clearNavigation,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => (
  <NavigationProviderImpl>{children}</NavigationProviderImpl>
);

export default NavigationProvider;
