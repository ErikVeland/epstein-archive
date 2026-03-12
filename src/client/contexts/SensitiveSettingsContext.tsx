import React, { createContext, useContext, useState } from 'react';

interface SensitiveSettingsContextType {
  showAllSensitive: boolean;
  setShowAllSensitive: (show: boolean) => void;
  toggleShowAllSensitive: () => void;
}

const SensitiveSettingsContext = createContext<SensitiveSettingsContextType | undefined>(undefined);

export const SensitiveSettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [showAllSensitive, setShowAllSensitiveState] = useState(() => {
    return sessionStorage.getItem('epstein-archive-show-sensitive') === 'true';
  });

  const setShowAllSensitive = (show: boolean) => {
    setShowAllSensitiveState(show);
    sessionStorage.setItem('epstein-archive-show-sensitive', String(show));
  };

  const toggleShowAllSensitive = () => setShowAllSensitive(!showAllSensitive);

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
