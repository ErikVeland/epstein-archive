import React, { createContext, useContext, useEffect, useState } from 'react';

const SENSITIVE_STORAGE_KEY = 'epstein-archive-show-sensitive';

function readSensitivePreference(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.localStorage.getItem(SENSITIVE_STORAGE_KEY) === 'true' ||
    window.sessionStorage.getItem(SENSITIVE_STORAGE_KEY) === 'true'
  );
}

interface SensitiveSettingsContextType {
  showAllSensitive: boolean;
  setShowAllSensitive: (show: boolean) => void;
  toggleShowAllSensitive: () => void;
}

const SensitiveSettingsContext = createContext<SensitiveSettingsContextType | undefined>(undefined);

export const SensitiveSettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [showAllSensitive, setShowAllSensitiveState] = useState(readSensitivePreference);

  const setShowAllSensitive = (show: boolean) => {
    setShowAllSensitiveState(show);
    localStorage.setItem(SENSITIVE_STORAGE_KEY, String(show));
    sessionStorage.setItem(SENSITIVE_STORAGE_KEY, String(show));
  };

  const toggleShowAllSensitive = () => setShowAllSensitive(!showAllSensitive);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === SENSITIVE_STORAGE_KEY) {
        setShowAllSensitiveState(event.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <SensitiveSettingsContext.Provider
      value={{ showAllSensitive, setShowAllSensitive, toggleShowAllSensitive }}
    >
      {children}
    </SensitiveSettingsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSensitiveSettings = () => {
  const context = useContext(SensitiveSettingsContext);
  if (!context) {
    throw new Error('useSensitiveSettings must be used within a SensitiveSettingsProvider');
  }
  return context;
};
