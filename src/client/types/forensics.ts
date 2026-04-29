export interface ForensicMetricRecord {
  id: string;
  fileName?: string;
  title?: string;
  evidenceType?: string;
  score?: number;
  riskScore?: number;
  jsRiskScore?: number;
  densityScore?: number;
  anomalyScore?: number;
  technical?: {
    producer?: string;
    creator?: string;
    creationDate?: string;
    pageCount?: number;
  };
  structural?: Record<string, unknown>;
  linguistic?: {
    readabilityFKGL?: number;
    sentiment?: string;
    typeTokenRatio?: number;
  };
  network?: {
    riskScore?: number;
  };
  metadata?: Record<string, unknown>;
}

export interface ForensicSummary {
  totalDocuments: number;
  totalSignals?: number;
  avgRiskScore?: number;
  distributions?: Record<string, unknown>;
  topRiskDocuments?: ForensicMetricRecord[];
  sentimentCounts?: {
    positive: number;
    neutral: number;
    negative: number;
  };
}
