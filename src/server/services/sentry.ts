/**
 * Sentry server-side initialisation.
 *
 * Call `initSentry()` once at process start, before any routes are registered.
 * Set SENTRY_DSN in your environment to enable reporting; if the variable is
 * absent the module is a no-op so local dev is unaffected.
 */
import * as Sentry from '@sentry/node';
import type { ErrorRequestHandler } from 'express';
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
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    sendDefaultPii: false,
    beforeSend(event) {
      // Scrub sensitive fields from request bodies before they leave the process.
      const PII_FIELDS = ['password', 'token', 'secret', 'ssn', 'credit_card', 'authorization'];
      if (event.request?.data && typeof event.request.data === 'object') {
        const data = event.request.data as Record<string, unknown>;
        for (const field of PII_FIELDS) {
          if (field in data) data[field] = '[Filtered]';
        }
      }
      return event;
    },
  });

  Sentry.setTag('service', 'epstein-api');
  logger.info('Sentry initialised (service=epstein-api)');
}

/**
 * Express error handler that forwards unhandled errors to Sentry.
 * Mount this AFTER all routes and BEFORE your own error handler.
 */
export const sentryErrorHandler = Sentry.expressErrorHandler() as unknown as ErrorRequestHandler;
