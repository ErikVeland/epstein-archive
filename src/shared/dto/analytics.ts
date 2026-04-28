export interface AnalyticsSummaryDto {
  documentsByType: Array<{ type: string; count: number }>;
  timelineData: Array<{ date: string; count: number }>;
  topConnectedEntities: Array<{
    id: string;
    name: string;
    mentions: number;
    connectionCount: number;
    riskScore: number;
  }>;
  entityTypeDistribution: Array<{ type: string; count: number }>;
  riskByType: Array<{ type: string; risk: string; count: number }>;
  redactionStats: {
    totalDocuments: number;
    redactedCount: number;
    redactionPercentage: number;
  } | null;
  topRelationships: Array<{
    sourceId: string;
    targetId: string;
    type: string;
    weight: number;
  }>;
  totalCounts: {
    entities: number;
    documents: number;
    evidenceFiles: number;
    relationships: number;
  };
  reconciliation: {
    unclassifiedCount: number;
    unknownDateCount: number;
  };
  generatedAt: string;
}

export interface CorrelationDto {
  id: string;
  type: string;
  confidence: number;
  description: string;
  sources: string[];
  entities: string[];
  timeRange: { start: string; end: string };
  significance: 'critical' | 'high' | 'medium' | 'low';
  evidence: string[];
  anomalies: string[];
}

export interface CorrelationResponseDto {
  dataSources: Array<{
    id: string;
    type: string;
    name: string;
    description: string;
    lastUpdated: string;
    reliability: string;
    recordCount: number;
    coverage: number;
  }>;
  correlations: CorrelationDto[];
  rules: Record<string, unknown>[];
}
