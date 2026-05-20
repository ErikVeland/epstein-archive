import React, { type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from './design-system/components/interactive/Tooltip';
import ToastProvider from './components/common/ToastProvider';
import { UndoProvider } from './components/UndoManager';
import { InvestigationsProvider } from './contexts/InvestigationsContext';
import { queryClient } from './queryClient';

export interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps): React.ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ToastProvider>
          <UndoProvider>
            <InvestigationsProvider>{children}</InvestigationsProvider>
          </UndoProvider>
        </ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
