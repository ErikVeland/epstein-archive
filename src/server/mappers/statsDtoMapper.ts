import type { StatsDto } from '@shared/dto/stats';

interface RoleCount {
  role: string;
  count: number;
}

interface TopEntity {
  id: number;
  name: string;
  mentions: number;
}

interface LikelihoodEntry {
  level?: string;
  count?: number;
}

interface RedFlagEntry {
  rating: number;
  count: number;
}

interface CollectionCount {
  collection: string;
  count: number;
}

interface CollectionStatsRow {
  degraded?: boolean;
  data?: CollectionCount[];
}

type PipelineStatus = Record<string, unknown>;

export interface RawStatsRow {
  totalEntities?: number;
  totalDocuments?: number;
  totalRelationships?: number;
  totalMentions?: number;
  averageRedFlagRating?: number;
  totalUniqueRoles?: number;
  entitiesWithDocuments?: number;
  documentsWithMetadata?: number;
  documentsFixed?: number;
  activeInvestigations?: number;
  topRoles?: RoleCount[];
  topEntities?: TopEntity[];
  likelihoodDistribution?: LikelihoodEntry[];
  redFlagDistribution?: RedFlagEntry[];
  collectionCounts?: CollectionCount[];
  collectionStats?: CollectionStatsRow | CollectionCount[];
  pipelineStatus?: PipelineStatus;
  pipeline_status?: PipelineStatus | null;
}

function extractCollectionStats(colStats: RawStatsRow['collectionStats']): CollectionCount[] {
  if (Array.isArray(colStats)) {
    return colStats;
  }
  if (colStats && typeof colStats === 'object' && 'data' in colStats) {
    const statsWithData = colStats as { data?: CollectionCount[] };
    if (Array.isArray(statsWithData.data)) {
      return statsWithData.data;
    }
  }
  return [];
}

export function mapStatsDto(source: RawStatsRow): StatsDto {
  const degradedSources: string[] = [];
  const colStats = source.collectionStats;
  if (colStats && !Array.isArray(colStats) && (colStats as CollectionStatsRow).degraded) {
    degradedSources.push('collectionStats');
  }

  const likelihoodExisting = Array.isArray(source.likelihoodDistribution)
    ? source.likelihoodDistribution
    : [];

  const likelihoodByLevel = new Map<string, number>(
    likelihoodExisting.map((entry) => [String(entry.level || ''), Number(entry.count || 0)]),
  );

  const safeLikelihoodDistribution = ['HIGH', 'MEDIUM', 'LOW'].map((level) => ({
    level,
    count: likelihoodByLevel.get(level) || 0,
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
    collectionStats: extractCollectionStats(colStats),
    pipeline_status: source.pipeline_status || source.pipelineStatus || null,
    pipelineStatus: source.pipeline_status || source.pipelineStatus || null,
    _meta: {
      degraded: degradedSources.length > 0,
      degradedSources: degradedSources.length > 0 ? degradedSources : undefined,
    },
  };
}
