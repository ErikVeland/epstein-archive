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
    // getMediaItems can make more than one query (e.g., entity name lookup). Always return empty.
    queryMock.mockResolvedValue({ rows: [] });

    const { mediaRepository } = await import('../../../src/server/db/mediaRepository');
    await mediaRepository.getMediaItems('42');

    expect(queryMock).toHaveBeenCalled();
    const sqlCombined = queryMock.mock.calls.map((c) => String(c?.[0] ?? '')).join('\n---\n');

    // Critical: avoid casting m.id to bigint (ids are text in some datasets)
    expect(sqlCombined).toContain('mip2.media_item_id::text = m.id::text');
    expect(sqlCombined).toContain('mip.media_item_id::text = m.id::text');
    expect(sqlCombined).toContain('f2.media_item_id::text = m.id::text');
    expect(sqlCombined).toContain('f.media_item_id::text = m.id::text');
  });
});
