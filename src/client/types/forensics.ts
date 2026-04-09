export interface ForensicTechnicalMetrics {
  producer?: string;
  creator?: string;
  creationDate?: string;
  modificationDate?: string;
  pageCount?: number;
}

export interface ForensicStructuralMetrics {
  containsJavascript?: boolean;
  fontCount?: number;
  pdfVersion?: string;
  jsObjectIds?: string[];
}

export interface ForensicLinguisticMetrics {
  readabilityFKGL?: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
  typeTokenRatio?: number;
}

export interface ForensicTemporalMetrics {
  businessHours?: boolean;
  dayOfWeek?: string;
}

export interface ForensicNetworkMetrics {
  entityDensityPer1000Words?: number;
  riskScore?: number;
}

export interface ForensicMetricRecord {
  id?: string | number;
  fileName?: string;
  score?: number;
  technical?: ForensicTechnicalMetrics;
  structural?: ForensicStructuralMetrics;
  linguistic?: ForensicLinguisticMetrics;
  temporal?: ForensicTemporalMetrics;
  network?: ForensicNetworkMetrics;
  [key: string]: unknown;
}

export interface ForensicSummary {
  readabilityBuckets?: Array<{ range: string; count: number }>;
  sentimentCounts?: {
    positive?: number;
    neutral?: number;
    negative?: number;
  };
}
