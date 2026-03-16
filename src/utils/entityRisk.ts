export interface EntityRiskAggregate {
  fullName: string;
  mentionCount: number;
  distinctDocuments: number;
  avgDocRedFlag: number;
  maxDocRedFlag: number;
  highRiskDocuments: number;
  mediumRiskDocuments: number;
  lowRiskDocuments: number;
  sourceCollectionsCount: number;
  blackBookCount: number;
  mediaEvidenceCount: number;
  avgMentionConfidence: number;
  evidenceTypeCounts: Record<string, number>;
}

export interface EntityRiskComputation {
  rawScore: number;
  normalizedScore: number;
  redFlagRating: number;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  driverLabels: string[];
  description: string;
}

const TOP_RISK_BASELINES = new Set(['jeffrey epstein', 'ghislaine maxwell']);

const evidenceTypeWeights: Record<string, number> = {
  testimony: 1.35,
  deposition: 1.35,
  legal: 1.25,
  legal_document: 1.25,
  court_case: 1.25,
  court_filing: 1.25,
  flight_log: 1.15,
  flight_record: 1.15,
  travel: 1.1,
  financial: 1.15,
  email: 0.95,
  communication: 0.95,
  media: 0.75,
  audio: 0.85,
  video: 0.85,
  photo: 0.85,
  article: 0.7,
  document: 0.8,
  archive: 0.55,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const round = (value: number, digits: number = 2): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const normalizeEvidenceType = (value: string): string => value.trim().toLowerCase();

const getEvidenceTypeQualityScore = (evidenceTypeCounts: Record<string, number>): number => {
  return Object.entries(evidenceTypeCounts).reduce((sum, [rawType, rawCount]) => {
    const count = Math.max(0, Number(rawCount || 0));
    if (!count) return sum;
    const type = normalizeEvidenceType(rawType);
    const weight = evidenceTypeWeights[type] ?? 0.8;
    return sum + Math.log2(count + 1) * weight * 7;
  }, 0);
};

export const isTopRiskBaselineEntity = (fullName: string): boolean =>
  TOP_RISK_BASELINES.has(fullName.trim().toLowerCase());

export const calculateEntityRiskRawScore = (aggregate: EntityRiskAggregate): number => {
  if (isTopRiskBaselineEntity(aggregate.fullName)) {
    return 250;
  }

  const severityScore =
    aggregate.maxDocRedFlag * 12 +
    aggregate.avgDocRedFlag * 8 +
    aggregate.highRiskDocuments * 4 +
    aggregate.mediumRiskDocuments * 1.5;

  const corroborationScore =
    Math.min(20, aggregate.distinctDocuments * 1.8) +
    Math.min(12, Object.keys(aggregate.evidenceTypeCounts).length * 3) +
    Math.min(10, aggregate.sourceCollectionsCount * 2.5);

  const exposureScore = Math.min(10, Math.log2(aggregate.mentionCount + 1) * 2);
  const specialEvidenceScore =
    Math.min(12, aggregate.blackBookCount * 4) + Math.min(8, aggregate.mediaEvidenceCount * 1.5);
  const qualityScore = getEvidenceTypeQualityScore(aggregate.evidenceTypeCounts);
  const confidenceMultiplier = clamp(0.85 + aggregate.avgMentionConfidence * 0.25, 0.85, 1.1);

  return round(
    (severityScore + corroborationScore + exposureScore + specialEvidenceScore + qualityScore) *
      confidenceMultiplier,
  );
};

export const normalizeEntityRiskScore = (
  rawScore: number,
  anchorScore: number,
  fullName: string,
): number => {
  if (isTopRiskBaselineEntity(fullName)) return 100;
  if (rawScore <= 0 || anchorScore <= 0) return 0;

  const ratio = clamp(rawScore / anchorScore, 0, 1.5);
  return round(Math.min(96, Math.sqrt(ratio) * 100));
};

export const toRedFlagRating = (normalizedScore: number): number => {
  if (normalizedScore >= 90) return 5;
  if (normalizedScore >= 70) return 4;
  if (normalizedScore >= 45) return 3;
  if (normalizedScore >= 20) return 2;
  if (normalizedScore >= 8) return 1;
  return 0;
};

export const toRiskLevel = (redFlagRating: number): 'HIGH' | 'MEDIUM' | 'LOW' => {
  if (redFlagRating >= 4) return 'HIGH';
  if (redFlagRating >= 2) return 'MEDIUM';
  return 'LOW';
};

const buildDriverLabels = (aggregate: EntityRiskAggregate): string[] => {
  const drivers: string[] = [];

  if (aggregate.maxDocRedFlag >= 5) drivers.push('Critical documents');
  if (aggregate.highRiskDocuments >= 3) drivers.push('Multiple high-risk documents');
  if (aggregate.blackBookCount > 0) drivers.push('Black Book evidence');
  if (aggregate.evidenceTypeCounts.testimony || aggregate.evidenceTypeCounts.deposition) {
    drivers.push('Testimony corroboration');
  }
  if (aggregate.evidenceTypeCounts.legal || aggregate.evidenceTypeCounts.legal_document) {
    drivers.push('Legal evidence');
  }
  if (aggregate.evidenceTypeCounts.flight_log || aggregate.evidenceTypeCounts.flight_record) {
    drivers.push('Flight records');
  }
  if (aggregate.sourceCollectionsCount >= 2) drivers.push('Cross-source corroboration');
  if (aggregate.distinctDocuments >= 10) drivers.push('Deep evidence volume');

  return drivers.slice(0, 4);
};

const buildDescription = (
  aggregate: EntityRiskAggregate,
  normalizedScore: number,
  redFlagRating: number,
): string => {
  if (isTopRiskBaselineEntity(aggregate.fullName)) {
    return 'Top-risk baseline entity anchored by dense, high-severity primary evidence.';
  }

  const clauses = [
    `${aggregate.distinctDocuments} linked docs`,
    `max doc risk ${aggregate.maxDocRedFlag}`,
    `${aggregate.highRiskDocuments} high-risk docs`,
  ];

  if (aggregate.blackBookCount > 0) clauses.push(`black book ${aggregate.blackBookCount}`);
  if (aggregate.sourceCollectionsCount > 1) {
    clauses.push(`${aggregate.sourceCollectionsCount} source collections`);
  }

  return `Entity risk ${normalizedScore}/100 (${redFlagRating}/5): ${clauses.join(', ')}.`;
};

export const computeEntityRisk = (
  aggregate: EntityRiskAggregate,
  anchorScore: number,
): EntityRiskComputation => {
  const rawScore = calculateEntityRiskRawScore(aggregate);
  const normalizedScore = normalizeEntityRiskScore(rawScore, anchorScore, aggregate.fullName);
  const redFlagRating = isTopRiskBaselineEntity(aggregate.fullName)
    ? 5
    : toRedFlagRating(normalizedScore);
  const riskLevel = isTopRiskBaselineEntity(aggregate.fullName)
    ? 'HIGH'
    : toRiskLevel(redFlagRating);
  const driverLabels = isTopRiskBaselineEntity(aggregate.fullName)
    ? ['Top-risk baseline', 'Critical documents', 'Cross-source corroboration']
    : buildDriverLabels(aggregate);

  return {
    rawScore,
    normalizedScore,
    redFlagRating,
    riskLevel,
    driverLabels,
    description: buildDescription(aggregate, normalizedScore, redFlagRating),
  };
};
