export type DangerMotifType =
  | 'co_travel'
  | 'co_presence'
  | 'shared_address_contact'
  | 'weak_repeated_association'
  | 'high_risk_bridge'
  | 'conflicting_dates'
  | 'missing_provenance'
  | 'sensitive_entity_exposure'
  | 'financial_proximity'
  | 'communication_proximity'
  | 'document_cluster_bridge'
  | 'manual_lead';

export type HarmType =
  | 'privacy_exposure'
  | 'coercion_or_exploitation'
  | 'reputational_harm'
  | 'financial_harm'
  | 'legal_process_harm'
  | 'safety_risk'
  | 'misinformation_amplification'
  | 'institutional_accountability'
  | 'unknown';

export type IcebergReviewState =
  | 'unreviewed'
  | 'accepted'
  | 'rejected'
  | 'deferred'
  | 'insufficient_evidence';

export interface IcebergEntityRefDto {
  id: number;
  name: string;
  type: string | null;
  riskScore: number | null;
}

export interface IcebergSupportingDocumentDto {
  documentId: number;
  title: string;
  snippet: string | null;
  sourceType: string | null;
  date: string | null;
  confidence: number | null;
}

export interface IcebergExplainabilityDto {
  whyItMatters: string;
  strongestEvidence: string[];
  limitations: string[];
  nextActions: string[];
}

export interface IcebergLeadDto {
  id: string;
  investigationId: number;
  title: string;
  description: string | null;
  leadKind: 'motif' | 'relationship' | 'document' | 'manual';
  motifType: DangerMotifType;
  harmType: HarmType;
  status: 'open' | 'pursued' | 'dead_end' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number | null;
  riskScore: number | null;
  evidenceCount: number;
  pathLength: number | null;
  sourceSummary: string;
  primaryEntities: IcebergEntityRefDto[];
  supportingDocuments: IcebergSupportingDocumentDto[];
  contradictionCount: number;
  reviewState: IcebergReviewState;
  explainability: IcebergExplainabilityDto;
  createdAt: string;
  updatedAt: string;
}

export interface GraphPathEdgeDto {
  source: string;
  sourceLabel: string | null;
  target: string;
  targetLabel: string | null;
  type: string;
  classification: 'EVIDENCE_BACKED' | 'INFERRED' | 'MIXED';
  confidence: number;
  riskScore: number;
  evidenceCount: number;
  sourceDocumentIds: number[];
  dateRange: { start: string | null; end: string | null };
}

export interface GraphPathDto {
  id: string;
  sourceId: string;
  targetId: string;
  score: number;
  confidence: number;
  riskScore: number;
  pathLength: number;
  nodes: IcebergEntityRefDto[];
  edges: GraphPathEdgeDto[];
}

export interface RelationshipExplanationDto {
  sourceId: string;
  targetId: string;
  directEvidence: IcebergSupportingDocumentDto[];
  indirectEvidence: IcebergSupportingDocumentDto[];
  sharedDates: string[];
  sharedLocations: string[];
  contradictions: string[];
  missingProvenance: string[];
  confidence: number | null;
  summary: string;
}

export interface EvidenceChainItemDto {
  id: number;
  investigationId: number;
  leadId: string | null;
  itemType: 'lead' | 'path' | 'edge' | 'document_context';
  title: string;
  payload: unknown;
  createdAt: string;
}
