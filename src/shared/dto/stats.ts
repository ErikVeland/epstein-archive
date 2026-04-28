export interface StatsDto {
  totalEntities: number;
  totalDocuments: number;
  totalRelationships: number;
  totalMentions: number;
  averageRedFlagRating: number;
  totalUniqueRoles: number;
  entitiesWithDocuments: number;
  documentsWithMetadata: number;
  documentsFixed: number;
  activeInvestigations: number;
  topRoles: Array<{ role: string; count: number }>;
  topEntities: Array<{ id: number; name: string; mentions: number }>;
  likelihoodDistribution: Array<{ level: string; count: number }>;
  redFlagDistribution: Array<{ rating: number; count: number }>;
  collectionCounts: Array<{ collection: string; count: number }>;
  collectionStats: Array<{ collection: string; count: number }>;
  pipelineStatus: { status?: string; lastRun?: string; nextRun?: string } | null;
  _meta: {
    degraded: boolean;
    degradedSources?: string[];
  };
}
