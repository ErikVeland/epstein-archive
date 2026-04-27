import { describe, expect, it, vi } from 'vitest';

const queryMock = vi.fn();

vi.mock('../../../src/server/db/connection.js', () => {
  return {
    getApiPool: () => ({
      query: queryMock,
    }),
  };
});

describe('mediaRepository.getMediaItems', () => {
  it('uses safe text joins for media_item_people and faces (prevents cast-related misses/crashes)', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    const { mediaRepository } = await import('../../../src/server/db/mediaRepository');
    await mediaRepository.getMediaItems('42');

    expect(queryMock).toHaveBeenCalledTimes(1);
    const sql = String(queryMock.mock.calls[0]?.[0] ?? '');

    // Critical: avoid casting m.id to bigint (ids are text in some datasets)
    expect(sql).toContain('mip2.media_item_id::text = m.id::text');
    expect(sql).toContain('mip.media_item_id::text = m.id::text');
    expect(sql).toContain('f2.media_item_id::text = m.id::text');
    expect(sql).toContain('f.media_item_id::text = m.id::text');
  });
});
