import type { ReactNode } from 'react';
import ToastProvider from '../components/common/ToastProvider';
import UndoProvider from '../components/UndoManager';
import { InvestigationsProvider } from '../contexts/InvestigationsContext';
import { TooltipProvider } from '../design-system/lib';

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <TooltipProvider>
      <ToastProvider>
        <UndoProvider>
          <InvestigationsProvider>{children}</InvestigationsProvider>
        </UndoProvider>
      </ToastProvider>
    </TooltipProvider>
  );
}
