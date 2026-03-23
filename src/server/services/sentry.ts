/**
 * Sentry server-side initialisation.
 *
 * Call `initSentry()` once at process start, before any routes are registered.
 * Set SENTRY_DSN in your environment to enable reporting; if the variable is
 * absent the module is a no-op so local dev is unaffected.
 */
import * as Sentry from '@sentry/node';
import { logger } from './Logger.js';

export function initSentry(): void {
  const rawDsn = process.env.SENTRY_DSN?.trim();
  const dsn =
    rawDsn && rawDsn !== 'your-sentry-dsn-here' && rawDsn !== 'YOUR_SENTRY_DSN' ? rawDsn : null;
  if (!dsn) {
    logger.info('SENTRY_DSN not configured — error reporting disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.npm_package_version,
    // Capture 10 % of transactions for performance monitoring.
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    // Never send PII.
    sendDefaultPii: false,
  });

  logger.info('Sentry initialised');
}

/**
 * Express error handler that forwards unhandled errors to Sentry.
 * Mount this AFTER all routes and BEFORE your own error handler.
 */
export const sentryErrorHandler = Sentry.expressErrorHandler();
