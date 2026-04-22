export function withSafeStatsContract(input: unknown) {
  const source = (input as Record<string, unknown>) || {};
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
    collectionStats: Array.isArray(source.collectionStats) ? source.collectionStats : [],
    pipeline_status: source.pipeline_status || null,
  };
}
