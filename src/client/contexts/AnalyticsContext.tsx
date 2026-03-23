import React from 'react';
import { AnalyticsContext } from './AnalyticsContextState';
import type { AnalyticsContextValue } from './AnalyticsContextState';

export const AnalyticsProvider: React.FC<{
  value: AnalyticsContextValue;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
};
