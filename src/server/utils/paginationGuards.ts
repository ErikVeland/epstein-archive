import type { Response } from 'express';

export const MAX_OFFSET = Number(process.env.API_LIST_MAX_OFFSET || 10_000);

// Standard per-page limit caps shared across list endpoints.
export const LIST_LIMIT_CAP = 500; // primary list endpoints (entities, flights, properties)
export const ENTITY_TAB_LIMIT_CAP = 200; // entity detail tab sub-lists (documents, connections)
export const SEARCH_LIMIT_CAP = 100; // search and filtered sub-queries
export const RELATED_LIST_LIMIT_CAP = 50; // compact related-item panels
export const ADMIN_AUDIT_LIMIT_CAP = 1000; // bounded operational audit views
export const BULK_EXPORT_LIMIT_CAP = 10_000; // large but explicit archival exports

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
