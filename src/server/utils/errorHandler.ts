import { Request, Response, NextFunction } from 'express';
import { getApiPool } from '../db/connection.js';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string = 'INTERNAL_ERROR',
    public isOperational: boolean = true,
    public details?: Record<string, any>,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND', true);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED', true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN', true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 409, 'CONFLICT', true, details);
  }
}

type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
};

function pgErrorCode(message: string): string {
  return /relation .* does not exist|column .* does not exist|syntax error|permission denied|timeout|pool/i.test(
    message || '',
  )
    ? 'PG_QUERY_FAILED'
    : 'INTERNAL_SERVER_ERROR';
}

function buildErrorBody(req: Request, statusCode: number, err: Error): ApiErrorBody {
  const requestId = (req as any).requestId || 'no-req-id';

  if (err instanceof AppError) {
    return {
      error: {
        code: err.code || (statusCode >= 500 ? pgErrorCode(err.message) : 'BAD_REQUEST'),
        message: err.message,
        requestId,
      },
    };
  }

  return {
    error: {
      code: pgErrorCode(err.message),
      message: 'Internal server error',
      requestId,
    },
  };
}

export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const duration = Date.now() - (req as any)._startTime || Date.now();
  const requestId = (req as any).requestId || 'no-req-id';
  let poolStats: { total: number; idle: number; waiting: number } | null = null;
  try {
    const pool = getApiPool();
    poolStats = {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    };
  } catch {
    poolStats = null;
  }
  console.error(
    `[ERROR] [requestId=${requestId}] route=${req.method} ${req.path} (${duration}ms)`,
    {
      method: req.method,
      path: req.path,
      query: req.query,
      bodyKeys:
        req.body && typeof req.body === 'object' && !Array.isArray(req.body)
          ? Object.keys(req.body as Record<string, unknown>)
          : undefined,
      message: err.message,
      stack: err.stack,
      userAgent: req.get('User-Agent'),
      pgCode: (err as any).code,
      pgMessage: (err as any).message,
      pgQueryName: (err as any)._pgQueryName,
      pgSqlHash: (err as any)._pgSqlHash,
      pool: poolStats,
    },
  );

  if (err instanceof AppError) {
    if (err.isOperational) {
      console.warn(`Operational error: ${err.message}`, {
        statusCode: err.statusCode,
        path: req.path,
        code: err.code,
      });
    } else {
      console.error(`Programming error: ${err.message}`, {
        stack: err.stack,
        path: req.path,
        code: err.code,
      });
    }

    const body = buildErrorBody(req, err.statusCode, err);
    res.status(err.statusCode).json(body);
    return;
  }

  const body = buildErrorBody(req, 500, err);
  res.status(500).json(body);
};

export const catchAsync = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};
