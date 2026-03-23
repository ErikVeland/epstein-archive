import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';
import { NavigationProvider } from './services/ContentNavigationService.tsx';
import ErrorBoundary from './components/common/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import ToastProvider from './components/common/ToastProvider';
import { cssVariables } from '../designTokens';

import { SensitiveSettingsProvider } from './contexts/SensitiveSettingsContext';
import { FilterProvider } from './contexts/FilterContext';
import { DegradedModeProvider } from './contexts/DegradedModeContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './services/queryClient';

// Global error handlers for production debugging
window.onerror = function (message, source, lineno, colno, error) {
  console.error('Global Error Caught:', { message, source, lineno, colno, error });
  // You could also send this to an endpoint if needed
};

window.onunhandledrejection = function (event) {
  console.error('Unhandled Promise Rejection:', event.reason);
  if (event.reason && event.reason.stack) {
    console.error('Stack trace:', event.reason.stack);
  }
};

const injectDesignTokens = () => {
  const styleId = 'design-token-runtime';
  if (document.getElementById(styleId)) return;
  const styleTag = document.createElement('style');
  styleTag.id = styleId;
  styleTag.textContent = cssVariables;
  document.head.appendChild(styleTag);
};

injectDesignTokens();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <HelmetProvider>
          <AuthProvider>
            <SensitiveSettingsProvider>
              <BrowserRouter>
                <NavigationProvider>
                  <DegradedModeProvider>
                    <FilterProvider>
                      <QueryClientProvider client={queryClient}>
                        <App />
                        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
                      </QueryClientProvider>
                    </FilterProvider>
                  </DegradedModeProvider>
                </NavigationProvider>
              </BrowserRouter>
            </SensitiveSettingsProvider>
          </AuthProvider>
        </HelmetProvider>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
