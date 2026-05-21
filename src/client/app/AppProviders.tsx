import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import ToastProvider from '../components/common/ToastProvider';
import UndoProvider from '../components/UndoManager';
import { InvestigationsProvider } from '../contexts/InvestigationsContext';
import { TooltipProvider } from '../design-system/lib';
import { queryClient } from '../queryClient';

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ToastProvider>
          <UndoProvider>
            <InvestigationsProvider>{children}</InvestigationsProvider>
          </UndoProvider>
        </ToastProvider>
      </TooltipProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
