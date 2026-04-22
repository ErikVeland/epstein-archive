import { describe, expect, it } from 'vitest';

import { withSafeStatsContract } from '../server/utils/stats.js';

describe('withSafeStatsContract', () => {
  it('fills missing fields with safe defaults', () => {
    expect(withSafeStatsContract(undefined)).toEqual({
      totalEntities: 0,
      totalDocuments: 0,
      totalRelationships: 0,
      totalMentions: 0,
      averageRedFlagRating: 0,
      totalUniqueRoles: 0,
      entitiesWithDocuments: 0,
      documentsWithMetadata: 0,
      documentsFixed: 0,
      activeInvestigations: 0,
      topRoles: [],
      topEntities: [],
      likelihoodDistribution: [
        { level: 'HIGH', count: 0 },
        { level: 'MEDIUM', count: 0 },
        { level: 'LOW', count: 0 },
      ],
      redFlagDistribution: [],
      collectionCounts: [],
      collectionStats: [],
      pipeline_status: null,
    });
  });

  it('normalizes likelihood distribution ordering and number coercion', () => {
    const result = withSafeStatsContract({
      totalEntities: '12',
      activeInvestigations: '3',
      topRoles: [{ role: 'pilot', count: 7 }],
      likelihoodDistribution: [
        { level: 'LOW', count: '2' },
        { level: 'HIGH', count: '9' },
      ],
      pipeline_status: { state: 'running' },
    });

    expect(result.totalEntities).toBe(12);
    expect(result.activeInvestigations).toBe(3);
    expect(result.topRoles).toEqual([{ role: 'pilot', count: 7 }]);
    expect(result.likelihoodDistribution).toEqual([
      { level: 'HIGH', count: 9 },
      { level: 'MEDIUM', count: 0 },
      { level: 'LOW', count: 2 },
    ]);
    expect(result.pipeline_status).toEqual({ state: 'running' });
  });
});
