import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryMock = vi.fn();

vi.mock('../../../src/server/db/connection.js', () => ({
  getApiPool: () => ({ query: queryMock }),
}));

vi.mock('../../../src/server/services/Logger.js', () => ({
  logger: { warn: vi.fn() },
}));

describe('email correspondence narrative queries', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('reconstructs curated threads and excludes low-context bulk mail', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    const { getEmailThreads } = await import('../../../src/server/db/healthQueries');
    await getEmailThreads({
      mailboxId: 'all',
      limit: 50,
      parsedCursor: null,
      collection: 'curated',
      sortBy: 'date',
      sortOrder: 'asc',
    });

    expect(queryMock).toHaveBeenCalledTimes(1);
    const sql = queryMock.mock.calls.map((call) => String(call[0])).join('\n');
    expect(sql).toContain("'story:' || md5");
    expect(sql).toContain('COUNT(DISTINCT e.id) AS keyEntityCount');
    expect(sql).toContain('keyEntityCount >= 2');
    expect(sql).toContain('messageCount >= 2');
    expect(sql).toContain("LENGTH(TRIM(COALESCE(d.content_refined, ''))) > 20");
    expect(sql).toContain('morning squawk');
    expect(sql).toContain('COUNT(*) OVER() AS "totalCount"');
    expect(sql).toContain('ORDER BY firstMessageAt ASC');
  });

  it('applies the same evidence filter when a curated thread opens', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    const { getEmailThreadMessageHeaders } = await import('../../../src/server/db/healthQueries');
    await getEmailThreadMessageHeaders('story:example');

    const sql = String(queryMock.mock.calls[0]?.[0] ?? '');
    expect(sql).toContain("$1 LIKE 'story:%'");
    expect(sql).toContain("'story:' || md5");
    expect(sql).toContain("'2019-08-15T23:59:59.999Z'");
    expect(sql).toContain('unsubscribe|newsletter');
  });
});
