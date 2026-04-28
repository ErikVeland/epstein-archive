import type { AnalyticsSummaryDto, CorrelationResponseDto } from '@shared/dto/analytics';

interface AnalyticsRawEntity {
  id: unknown;
  name: unknown;
  mentions: unknown;
  connection_count?: unknown;
  connectionCount?: unknown;
  risk_score?: unknown;
  riskScore?: unknown;
  red_flag_rating?: unknown;
}

interface AnalyticsRawRelationship {
  source_id?: unknown;
  sourceId?: unknown;
  target_id?: unknown;
  targetId?: unknown;
  relationship_type?: unknown;
  relationshipType?: unknown;
  type?: unknown;
  weight?: unknown;
  proximity_score?: unknown;
  proximityScore?: unknown;
}

interface AnalyticsRawCorrelation {
  id: unknown;
  type?: unknown;
  confidence?: unknown;
  description?: unknown;
  sources?: unknown[];
  entities?: unknown[];
  timeRange?: { start?: unknown; end?: unknown };
  significance?: unknown;
  evidence?: unknown[];
  anomalies?: unknown[];
}

interface AnalyticsRawInput {
  documentsByType?: {
    type?: unknown;
    document_type?: unknown;
    count?: unknown;
  }[];
  timelineData?: {
    date?: unknown;
    count?: unknown;
  }[];
  topConnectedEntities?: AnalyticsRawEntity[];
  entityTypeDistribution?: {
    type?: unknown;
    count?: unknown;
  }[];
  riskByType?: {
    type?: unknown;
    risk?: unknown;
    count?: unknown;
  }[];
  redactionStats?: {
    totalDocuments?: unknown;
    total_documents?: unknown;
    redactedCount?: unknown;
    redacted_count?: unknown;
    redactionPercentage?: unknown;
    redaction_percentage?: unknown;
  };
  topRelationships?: AnalyticsRawRelationship[];
  totalCounts?: {
    entities?: unknown;
    documents?: unknown;
    evidenceFiles?: unknown;
    evidence_files?: unknown;
    relationships?: unknown;
  };
  reconciliation?: {
    unclassifiedCount?: unknown;
    unclassified?: unknown;
    unknownDateCount?: unknown;
    unknown_date?: unknown;
  };
  generatedAt?: string;
}

interface CorrelationRawInput {
  dataSources?: unknown[];
  correlations?: AnalyticsRawCorrelation[];
  rules?: unknown[];
}

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((v) => String(v)) : [];

const asRecordArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value)
    ? value
        .filter((v) => typeof v === 'object' && v !== null)
        .map((v) => v as Record<string, unknown>)
    : [];

export const mapAnalyticsSummaryDto = (data: AnalyticsRawInput): AnalyticsSummaryDto => ({
  documentsByType: Array.isArray(data.documentsByType)
    ? data.documentsByType.map((v) => ({
        type: String(v.type ?? v.document_type ?? ''),
        count: Number(v.count ?? 0),
      }))
    : [],
  timelineData: Array.isArray(data.timelineData)
    ? data.timelineData.map((v) => ({
        date: String(v.date ?? ''),
        count: Number(v.count ?? 0),
      }))
    : [],
  topConnectedEntities: Array.isArray(data.topConnectedEntities)
    ? data.topConnectedEntities.map((e) => ({
        id: String(e.id),
        name: String(e.name || ''),
        mentions: Number(e.mentions || 0),
        connectionCount: Number(e.connectionCount || e.connection_count || 0),
        riskScore: Number(e.riskScore || e.risk_score || e.red_flag_rating || 0),
      }))
    : [],
  entityTypeDistribution: Array.isArray(data.entityTypeDistribution)
    ? data.entityTypeDistribution.map((v) => ({
        type: String(v.type ?? ''),
        count: Number(v.count ?? 0),
      }))
    : [],
  riskByType: Array.isArray(data.riskByType)
    ? data.riskByType.map((v) => ({
        type: String(v.type ?? ''),
        risk: String(v.risk ?? ''),
        count: Number(v.count ?? 0),
      }))
    : [],
  redactionStats: data.redactionStats
    ? {
        totalDocuments: Number(
          data.redactionStats.totalDocuments ?? data.redactionStats.total_documents ?? 0,
        ),
        redactedCount: Number(
          data.redactionStats.redactedCount ?? data.redactionStats.redacted_count ?? 0,
        ),
        redactionPercentage: Number(
          data.redactionStats.redactionPercentage ?? data.redactionStats.redaction_percentage ?? 0,
        ),
      }
    : null,
  topRelationships: Array.isArray(data.topRelationships)
    ? data.topRelationships.map((r) => ({
        sourceId: String(r.sourceId ?? r.source_id ?? ''),
        targetId: String(r.targetId ?? r.target_id ?? ''),
        type: String(r.type ?? r.relationshipType ?? r.relationship_type ?? ''),
        weight: Number(r.weight ?? r.proximityScore ?? r.proximity_score ?? 0),
      }))
    : [],
  totalCounts: {
    entities: Number(data.totalCounts?.entities ?? 0),
    documents: Number(data.totalCounts?.documents ?? 0),
    evidenceFiles: Number(data.totalCounts?.evidenceFiles ?? data.totalCounts?.evidence_files ?? 0),
    relationships: Number(data.totalCounts?.relationships ?? 0),
  },
  reconciliation: {
    unclassifiedCount: Number(
      data.reconciliation?.unclassifiedCount ?? data.reconciliation?.unclassified ?? 0,
    ),
    unknownDateCount: Number(
      data.reconciliation?.unknownDateCount ?? data.reconciliation?.unknown_date ?? 0,
    ),
  },
  generatedAt: data.generatedAt ?? new Date().toISOString(),
});

export const mapCorrelationResponseDto = (data: CorrelationRawInput): CorrelationResponseDto => ({
  dataSources: Array.isArray(data.dataSources)
    ? (data.dataSources as Record<string, unknown>[]).map((d) => ({
        id: String(d.id ?? ''),
        type: String(d.type ?? ''),
        name: String(d.name ?? ''),
        description: String(d.description ?? ''),
        lastUpdated: String(d.lastUpdated ?? d.last_updated ?? ''),
        reliability: String(d.reliability ?? ''),
        recordCount: Number(d.recordCount ?? d.record_count ?? 0),
        coverage: Number(d.coverage ?? 0),
      }))
    : [],
  correlations: Array.isArray(data.correlations)
    ? data.correlations.map((c) => {
        const sig = String(c.significance || 'low').toLowerCase();
        const significance = (['critical', 'high', 'medium', 'low'].includes(sig) ? sig : 'low') as
          | 'critical'
          | 'high'
          | 'medium'
          | 'low';

        return {
          id: String(c.id),
          type: String(c.type || ''),
          confidence: Number(c.confidence || 0),
          description: String(c.description || ''),
          sources: asStringArray(c.sources),
          entities: asStringArray(c.entities),
          timeRange: {
            start: String(c.timeRange?.start || 'Unknown'),
            end: String(c.timeRange?.end || 'Unknown'),
          },
          significance,
          evidence: asStringArray(c.evidence),
          anomalies: asStringArray(c.anomalies),
        };
      })
    : [],
  rules: asRecordArray(data.rules),
});
