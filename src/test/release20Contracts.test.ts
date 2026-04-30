import { describe, expect, it } from 'vitest';

import { searchSchema } from '../server/middleware/validate';
import { archiveStatusSchema } from '../shared/schemas/stats';

describe('20.0 release contract schemas', () => {
  it('accepts archive freshness status payloads', () => {
    expect(() =>
      archiveStatusSchema.parse({
        lastIngestedAt: '2026-04-29T00:00:00.000Z',
        status: 'current',
        documentCount: 120,
        entityCount: 40,
      }),
    ).not.toThrow();
  });

  it('accepts additive search filters required by 20.0', () => {
    const result = searchSchema.parse({
      query: {
        q: 'epstein',
        sourceType: 'legal',
        confidenceMin: '0.7',
        confidenceMax: '1',
        reviewState: 'unreviewed',
        dateFrom: '2026-01-01',
        dateTo: '2026-04-29',
        entityType: 'Person',
        mediaType: 'image',
      },
    });

    expect(result.query.confidenceMin).toBe(0.7);
    expect(result.query.reviewState).toBe('unreviewed');
    expect(result.query.mediaType).toBe('image');
  });
});
