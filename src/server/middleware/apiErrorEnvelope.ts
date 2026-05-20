import type { NextFunction, Request, Response } from 'express';

type CanonicalApiError = {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: Record<string, unknown>;
  };
};

const DEFAULT_STATUS_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_SERVER_ERROR',
  503: 'SERVICE_UNAVAILABLE',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const asString = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) return value;
  if (value instanceof Error && value.message) return value.message;
  return null;
};

const normalizeCode = (rawCode: unknown, statusCode: number): string => {
  const code = asString(rawCode);
  if (code) return code.toUpperCase().replace(/[^A-Z0-9_]+/g, '_');
  return (
    DEFAULT_STATUS_CODES[statusCode] ??
    (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_FAILED')
  );
};

const requestIdFor = (req: Request): string =>
  (req as Request & { requestId?: string }).requestId || 'no-req-id';

export const toApiErrorEnvelope = (
  req: Request,
  statusCode: number,
  body: unknown,
): CanonicalApiError => {
  const requestId = requestIdFor(req);

  if (isRecord(body) && isRecord(body.error)) {
    const nested = body.error;
    const message =
      asString(nested.message) ||
      asString(nested.error) ||
      asString(body.message) ||
      DEFAULT_STATUS_CODES[statusCode] ||
      'Request failed';

    const details = isRecord(nested.details)
      ? nested.details
      : isRecord(body.details)
        ? body.details
        : undefined;

    return {
      error: {
        code: normalizeCode(nested.code, statusCode),
        message,
        requestId: asString(nested.requestId) || requestId,
        ...(details ? { details } : {}),
      },
    };
  }

  if (isRecord(body)) {
    const message =
      asString(body.error) ||
      asString(body.message) ||
      asString(body.reason) ||
      DEFAULT_STATUS_CODES[statusCode] ||
      'Request failed';

    const details: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (key !== 'error' && key !== 'message' && key !== 'code') details[key] = value;
    }

    return {
      error: {
        code: normalizeCode(body.code, statusCode),
        message,
        requestId,
        ...(Object.keys(details).length > 0 ? { details } : {}),
      },
    };
  }

  return {
    error: {
      code: normalizeCode(null, statusCode),
      message: asString(body) || DEFAULT_STATUS_CODES[statusCode] || 'Request failed',
      requestId,
    },
  };
};

export const apiErrorEnvelopeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);

  res.json = function jsonWithCanonicalError(body: unknown) {
    if (res.statusCode >= 400 && req.path.startsWith('/api')) {
      return originalJson(toApiErrorEnvelope(req, res.statusCode, body));
    }
    return originalJson(body);
  };

  next();
};
