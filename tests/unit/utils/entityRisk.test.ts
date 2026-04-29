import { describe, expect, it } from 'vitest';
import {
  calculateEntityRiskRawScore,
  computeEntityRisk,
  isTopRiskBaselineEntity,
  normalizeEntityRiskScore,
  toRedFlagRating,
} from '../../../src/client/utils/entityRisk';

describe('entityRisk', () => {
  it('treats Epstein and Maxwell as top-risk baselines', () => {
    expect(isTopRiskBaselineEntity('Jeffrey Epstein')).toBe(true);
    expect(isTopRiskBaselineEntity('Ghislaine Maxwell')).toBe(true);
    expect(isTopRiskBaselineEntity('Donald Trump')).toBe(false);
  });

  it('forces top-risk baselines to the top of the normalized scale', () => {
    const aggregate = {
      fullName: 'Jeffrey Epstein',
      mentionCount: 1,
      distinctDocuments: 1,
      avgDocRedFlag: 1,
      maxDocRedFlag: 1,
      highRiskDocuments: 0,
      mediumRiskDocuments: 0,
      lowRiskDocuments: 1,
      sourceCollectionsCount: 1,
      blackBookCount: 0,
      mediaEvidenceCount: 0,
      avgMentionConfidence: 1,
      evidenceTypeCounts: { document: 1 },
    };

    const result = computeEntityRisk(aggregate, 250);
    expect(result.normalizedScore).toBe(100);
    expect(result.redFlagRating).toBe(5);
    expect(result.riskLevel).toBe('HIGH');
  });

  it('scores corroborated legal and testimony evidence above sparse low-risk evidence', () => {
    const strongAggregate = {
      fullName: 'Strong Entity',
      mentionCount: 40,
      distinctDocuments: 12,
      avgDocRedFlag: 4.2,
      maxDocRedFlag: 5,
      highRiskDocuments: 7,
      mediumRiskDocuments: 4,
      lowRiskDocuments: 1,
      sourceCollectionsCount: 3,
      blackBookCount: 1,
      mediaEvidenceCount: 2,
      avgMentionConfidence: 0.92,
      evidenceTypeCounts: { legal: 5, testimony: 3, email: 2, flight_log: 2 },
    };
    const weakAggregate = {
      fullName: 'Weak Entity',
      mentionCount: 4,
      distinctDocuments: 2,
      avgDocRedFlag: 1,
      maxDocRedFlag: 1,
      highRiskDocuments: 0,
      mediumRiskDocuments: 0,
      lowRiskDocuments: 2,
      sourceCollectionsCount: 1,
      blackBookCount: 0,
      mediaEvidenceCount: 0,
      avgMentionConfidence: 0.8,
      evidenceTypeCounts: { document: 2 },
    };

    expect(calculateEntityRiskRawScore(strongAggregate)).toBeGreaterThan(
      calculateEntityRiskRawScore(weakAggregate),
    );
  });

  it('uses anchor-normalized sqrt scaling for non-baseline entities', () => {
    const normalized = normalizeEntityRiskScore(62.5, 250, 'Test Entity');
    expect(normalized).toBe(50);
  });

  it('maps normalized scores into red-flag bands consistently', () => {
    expect(toRedFlagRating(95)).toBe(5);
    expect(toRedFlagRating(75)).toBe(4);
    expect(toRedFlagRating(50)).toBe(3);
    expect(toRedFlagRating(25)).toBe(2);
    expect(toRedFlagRating(10)).toBe(1);
    expect(toRedFlagRating(0)).toBe(0);
  });
});
