import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import {
  MAX_OFFSET,
  offsetForPage,
  rejectDeepOffset,
  rejectOffset,
} from '../server/utils/paginationGuards.js';

const buildResponse = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };

  return res as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
};

describe('paginationGuards', () => {
  it('normalizes invalid page and limit values before calculating offsets', () => {
    expect(offsetForPage(3, 50)).toBe(100);
    expect(offsetForPage(0, 50)).toBe(0);
    expect(offsetForPage(3, 0)).toBe(2);
  });

  it('allows list requests inside the configured offset budget', () => {
    const res = buildResponse();

    expect(rejectDeepOffset(res, 'Document', 2, 50)).toBe(false);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('rejects list requests that walk beyond the configured offset budget', () => {
    const res = buildResponse();

    expect(rejectDeepOffset(res, 'Document', MAX_OFFSET + 2, 1)).toBe(true);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error:
        'Document list offset is too deep. Refine filters or use search instead of walking deep pages.',
      code: 'LIST_OFFSET_TOO_DEEP',
      maxOffset: MAX_OFFSET,
      offset: MAX_OFFSET + 1,
    });
  });

  it('rejects offset-based list requests with the same canonical response', () => {
    const res = buildResponse();

    expect(rejectOffset(res, 'Iceberg lead', MAX_OFFSET + 1)).toBe(true);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error:
        'Iceberg lead list offset is too deep. Refine filters or use search instead of walking deep pages.',
      code: 'LIST_OFFSET_TOO_DEEP',
      maxOffset: MAX_OFFSET,
      offset: MAX_OFFSET + 1,
    });
  });
});
