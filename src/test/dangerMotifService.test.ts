import { describe, expect, it } from 'vitest';
import { DangerMotifService } from '../server/services/DangerMotifService';

describe('DangerMotifService', () => {
  it('scores motif findings deterministically', () => {
    const first = DangerMotifService.score({
      motifType: 'high_risk_bridge',
      harmType: 'institutional_accountability',
      confidence: 0.84,
      evidenceCount: 12,
      contradictionCount: 0,
      missingProvenanceCount: 1,
      pathLength: 2,
    });
    const second = DangerMotifService.score({
      motifType: 'high_risk_bridge',
      harmType: 'institutional_accountability',
      confidence: 0.84,
      evidenceCount: 12,
      contradictionCount: 0,
      missingProvenanceCount: 1,
      pathLength: 2,
    });

    expect(second).toEqual(first);
    expect(first.riskScore).toBeGreaterThan(0.7);
    expect(first.priority).toBe('critical');
  });

  it('marks unsupported low-confidence leads as insufficient evidence', () => {
    const result = DangerMotifService.score({
      motifType: 'manual_lead',
      confidence: 0.2,
      evidenceCount: 0,
      contradictionCount: 0,
      missingProvenanceCount: 0,
      pathLength: null,
    });

    expect(result.reviewState).toBe('insufficient_evidence');
  });
});
