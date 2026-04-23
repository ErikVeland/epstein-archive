export function withSafeStatsContract(input: unknown) {
  const source = (input as Record<string, unknown>) || {};
  // Collect degraded signals from sub-queries that failed but returned fallback data.
  // Clients can check _meta.degraded to show a "partial data" warning in the UI.
  const degradedSources: string[] = [];
  if ((source.collectionStats as Record<string, unknown> | null)?.degraded) {
    degradedSources.push('collectionStats');
  }
  const existing = Array.isArray(source.likelihoodDistribution)
    ? source.likelihoodDistribution
    : [];
  const byLevel = new Map<string, { count?: number }>(
    existing.map((entry: unknown) => {
      const e = entry as Record<string, unknown> | null | undefined;
      return [String(e?.level || ''), { count: Number(e?.count || 0) }];
    }),
  );
  const safeLikelihoodDistribution = ['HIGH', 'MEDIUM', 'LOW'].map((level) => ({
    level,
    count: Number(byLevel.get(level)?.count || 0),
  }));

  return {
    totalEntities: Number(source.totalEntities || 0),
    totalDocuments: Number(source.totalDocuments || 0),
    totalRelationships: Number(source.totalRelationships || 0),
    totalMentions: Number(source.totalMentions || 0),
    averageRedFlagRating: Number(source.averageRedFlagRating || 0),
    totalUniqueRoles: Number(source.totalUniqueRoles || 0),
    entitiesWithDocuments: Number(source.entitiesWithDocuments || 0),
    documentsWithMetadata: Number(source.documentsWithMetadata || 0),
    documentsFixed: Number(source.documentsFixed || 0),
    activeInvestigations: Number(source.activeInvestigations || 0),
    topRoles: Array.isArray(source.topRoles) ? source.topRoles : [],
    topEntities: Array.isArray(source.topEntities) ? source.topEntities : [],
    likelihoodDistribution: safeLikelihoodDistribution,
    redFlagDistribution: Array.isArray(source.redFlagDistribution)
      ? source.redFlagDistribution
      : [],
    collectionCounts: Array.isArray(source.collectionCounts) ? source.collectionCounts : [],
    collectionStats: Array.isArray(source.collectionStats)
      ? source.collectionStats
      : Array.isArray((source.collectionStats as Record<string, unknown> | null)?.data)
        ? (source.collectionStats as Record<string, unknown[]>).data
        : [],
    pipeline_status: source.pipeline_status || null,
    _meta: {
      degraded: degradedSources.length > 0,
      degradedSources: degradedSources.length > 0 ? degradedSources : undefined,
    },
  };
}
