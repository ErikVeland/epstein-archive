import type { DangerMotifType, HarmType } from '../../shared/dto/iceberg.js';

export interface DangerMotifScoreInput {
  motifType: DangerMotifType;
  harmType?: HarmType;
  confidence: number | null;
  evidenceCount: number;
  contradictionCount: number;
  missingProvenanceCount: number;
  pathLength: number | null;
}

export interface DangerMotifScore {
  riskScore: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  reviewState: 'unreviewed' | 'insufficient_evidence';
}

const MOTIF_BASE_RISK: Record<DangerMotifType, number> = {
  co_travel: 0.62,
  co_presence: 0.55,
  shared_address_contact: 0.58,
  weak_repeated_association: 0.42,
  high_risk_bridge: 0.78,
  conflicting_dates: 0.48,
  missing_provenance: 0.38,
  sensitive_entity_exposure: 0.82,
  financial_proximity: 0.68,
  communication_proximity: 0.52,
  document_cluster_bridge: 0.5,
  manual_lead: 0.35,
};

const HARM_BONUS: Partial<Record<HarmType, number>> = {
  coercion_or_exploitation: 0.14,
  safety_risk: 0.14,
  privacy_exposure: 0.1,
  legal_process_harm: 0.08,
  financial_harm: 0.08,
  institutional_accountability: 0.06,
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function priorityFor(score: number): DangerMotifScore['priority'] {
  if (score >= 0.82) return 'critical';
  if (score >= 0.64) return 'high';
  if (score >= 0.42) return 'medium';
  return 'low';
}

export class DangerMotifService {
  static score(input: DangerMotifScoreInput): DangerMotifScore {
    const confidence = input.confidence ?? 0.45;
    const evidenceBoost = Math.min(0.18, Math.log10(Math.max(1, input.evidenceCount)) * 0.12);
    const contradictionPenalty = Math.min(0.18, input.contradictionCount * 0.05);
    const provenancePenalty = Math.min(0.14, input.missingProvenanceCount * 0.035);
    const pathPenalty = input.pathLength && input.pathLength > 2 ? 0.05 : 0;
    const harmBonus = HARM_BONUS[input.harmType || 'unknown'] || 0;
    const baseRisk = MOTIF_BASE_RISK[input.motifType];

    const riskScore = clamp01(
      baseRisk * 0.58 +
        confidence * 0.28 +
        evidenceBoost +
        harmBonus -
        contradictionPenalty -
        provenancePenalty -
        pathPenalty,
    );

    return {
      riskScore: Number(riskScore.toFixed(4)),
      priority: priorityFor(riskScore),
      reviewState:
        input.evidenceCount === 0 || confidence < 0.25 ? 'insufficient_evidence' : 'unreviewed',
    };
  }
}
