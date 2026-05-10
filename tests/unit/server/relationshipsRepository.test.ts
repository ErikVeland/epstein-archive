import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryMock = vi.fn();

vi.mock('../../../src/server/db/connection.js', () => {
  return {
    getApiPool: () => ({
      query: queryMock,
    }),
  };
});

vi.mock('@epstein/db', () => {
  return {
    relationshipsQueries: {
      getNeighborsCached: { run: vi.fn() },
      getRelationshipStats: { run: vi.fn() },
      getTopEntitiesByRelationshipCount: { run: vi.fn() },
      getEntityDetailsAggregated: { run: vi.fn() },
      getRelationships: { run: vi.fn() },
    },
  };
});

describe('relationshipsRepository.getRelationships', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('queries relationships using canonical_id when available', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ id: '42', canonical_id: 1 }],
    });
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          sourceId: 1,
          targetId: 2,
          relationshipType: 'connected',
          proximityScore: 42,
          riskScore: 0,
          confidence: 1,
          metadataJson: null,
        },
      ],
    });
    // Third query: batch entity name lookup added in data-joins enrichment
    queryMock.mockResolvedValueOnce({
      rows: [
        { id: 1, full_name: 'Entity One' },
        { id: 2, full_name: 'Entity Two' },
      ],
    });

    const { relationshipsRepository } =
      await import('../../../src/server/db/relationshipsRepository');
    const result = await relationshipsRepository.getRelationships(42, { limit: 50 });

    expect(result.canonicalId).toBe(1);
    expect(queryMock).toHaveBeenCalledTimes(3);
    // Ensure the SQL bind uses canonicalId (1), not the requested entityId (42).
    expect(queryMock.mock.calls[1]?.[1]?.[0]).toBe(1);
    expect(result.relationships).toHaveLength(1);
    expect(result.relationships[0]?.source_id).toBe(1);
    expect(result.relationships[0]?.target_id).toBe(2);
  });

  it('falls back to the requested id when canonical lookup fails', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    queryMock.mockResolvedValueOnce({ rows: [] });

    const { relationshipsRepository } =
      await import('../../../src/server/db/relationshipsRepository');
    const result = await relationshipsRepository.getRelationships(42, { limit: 50 });

    expect(result.canonicalId).toBe(42);
    expect(queryMock.mock.calls.at(-1)?.[1]?.[0]).toBe(42);
  });
});

describe('relationshipsRepository.resolveShortestPath', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('uses the current entity_relationships table in the recursive path query', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    const { relationshipsRepository } =
      await import('../../../src/server/db/relationshipsRepository');
    await relationshipsRepository.resolveShortestPath('1', '2');

    const sql = String(queryMock.mock.calls[0]?.[0] ?? '');
    expect(sql).toContain('JOIN entity_relationships r');
    expect(sql).not.toContain('JOIN relationships r');
  });
});
