import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import * as Sentry from '@sentry/react';
import App from './App';
import './index.css';
import { NavigationProvider } from './services/ContentNavigationService';
import ErrorBoundary from './components/common/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';

import { SensitiveSettingsProvider } from './contexts/SensitiveSettingsContext';
import { FilterProvider } from './contexts/FilterContext';
import { DegradedModeProvider } from './contexts/DegradedModeContext';
import { ApiStatusProvider } from './contexts/ApiStatusContext';

// Initialise Sentry before anything else renders.
// VITE_SENTRY_DSN must be set at build time; placeholder/example values are ignored.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN?.trim();
if (sentryDsn && sentryDsn !== 'your-sentry-dsn-here' && sentryDsn !== 'YOUR_SENTRY_DSN') {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION as string | undefined,
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.1),
    sendDefaultPii: false,
  });
}

// Forward uncaught errors to Sentry (and keep console logging for dev).
window.onerror = function (message, source, lineno, colno, error) {
  console.error('Global Error Caught:', { message, source, lineno, colno, error });
  if (error) Sentry.captureException(error);
};

window.onunhandledrejection = function (event) {
  console.error('Unhandled Promise Rejection:', event.reason);
  Sentry.captureException(event.reason);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <AuthProvider>
          <SensitiveSettingsProvider>
            <BrowserRouter>
              <NavigationProvider>
                <DegradedModeProvider>
                  <FilterProvider>
                    <ApiStatusProvider>
                      <App />
                    </ApiStatusProvider>
                  </FilterProvider>
                </DegradedModeProvider>
              </NavigationProvider>
            </BrowserRouter>
          </SensitiveSettingsProvider>
        </AuthProvider>
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
