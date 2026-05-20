import type { Response } from 'express';

export const MAX_OFFSET = Number(process.env.API_LIST_MAX_OFFSET || 10_000);

export const offsetForPage = (page: number, limit: number): number =>
  (Math.max(1, page) - 1) * Math.max(1, limit);

export const rejectOffset = (res: Response, resource: string, offset: number): boolean => {
  if (offset <= MAX_OFFSET) return false;

  res.status(400).json({
    error: `${resource} list offset is too deep. Refine filters or use search instead of walking deep pages.`,
    code: 'LIST_OFFSET_TOO_DEEP',
    maxOffset: MAX_OFFSET,
    offset,
  });
  return true;
};

export const rejectDeepOffset = (
  res: Response,
  resource: string,
  page: number,
  limit: number,
): boolean => rejectOffset(res, resource, offsetForPage(page, limit));
