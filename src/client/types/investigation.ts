// Core investigation types for advanced journalism features

export interface EvidenceChain {
  documentId: string;
  contentHash: string;
  sourceProvenance: SourceProvenance;
  transformations: TransformationEvent[];
  authenticity: AuthenticityScore;
  custodyChain: CustodyEvent[];
  verificationStatus: 'verified' | 'pending' | 'disputed' | 'invalid';
}

export interface SourceProvenance {
  originalPath: string;
  importDate: Date;
  importSource: string;
  importMethod: 'manual' | 'api' | 'scrape' | 'leak';
  sourceReliability: 'high' | 'medium' | 'low' | 'unknown';
  sourceDescription: string;
  chainOfCustodyDocuments: string[];
}

export interface CustodyEvent {
  date: Date;
  custodian: string;
  action: 'received' | 'transferred' | 'analyzed' | 'stored' | 'published';
  description: string;
  location: string;
  verificationHash?: string;
  signature?: string;
}

export interface TransformationEvent {
  date: Date;
  type: 'ocr' | 'translation' | 'redaction' | 'format_conversion' | 'metadata_extraction';
  description: string;
  inputHash: string;
  outputHash: string;
  tool: string;
  confidence?: number;
  operator: string;
}

export interface AuthenticityScore {
  overall: number; // 0-100
  factors: {
    sourceReliability: number;
    chainIntegrity: number;
    contentConsistency: number;
    technicalAuthenticity: number;
    corroboration: number;
  };
  assessmentDate: Date;
  assessedBy: string;
  methodology: string;
}

export interface Investigation {
  id: string;
  uuid?: string;
  title: string;
  description: string;
  hypothesis: string;
  status: 'draft' | 'active' | 'review' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  team: Investigator[];
  leadInvestigator: string;
  permissions: AccessControl[];
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: Date;
}

export interface Investigator {
  id: string;
  name: string;
  email: string;
  role: 'lead' | 'researcher' | 'analyst' | 'reviewer' | 'external';
  permissions: string[];
  joinedAt: Date;
  organization?: string;
  expertise: string[];
  status?: 'active' | 'pending' | 'inactive';
}

export interface AccessControl {
  userId: string;
  level: 'read' | 'write' | 'admin' | 'owner';
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
  reason: string;
}

export interface Annotation {
  id: string;
  documentId: string;
  entityId?: string;
  investigatorId: string;
  type: 'highlight' | 'note' | 'tag' | 'question' | 'evidence' | 'contradiction';
  content: string;
  position?: TextPosition;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  visibility: 'private' | 'team' | 'investigation' | 'public';
  evidenceRating?: 'crucial' | 'supporting' | 'weak' | 'contradictory' | 'uncertain';
  relatedAnnotations: string[];
}

export interface TextPosition {
  start: number;
  end: number;
  page?: number;
  coordinates?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export type LeadStatus = 'open' | 'pursued' | 'dead_end' | 'resolved';
export type LeadPriority = 'low' | 'medium' | 'high' | 'critical';

export interface InvestigationLead {
  id: number;
  investigationId: number;
  title: string;
  description: string | null;
  status: LeadStatus;
  priority: LeadPriority;
  sourceDocumentId: number | null;
  sourceEftaRef: string | null;
  assignedTo: string | null;
  resolutionNotes: string | null;
  forensicSignalId?: string | null;
  signalType?: string | null;
  confidence?: number | null;
  riskScore?: number | null;
  signalMetadata?: Record<string, unknown> | null;
  entityIds?: number[] | null;
  entityNames?: string[] | null;
  document_title?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Hypothesis {
  id: string;
  investigationId: string;
  title: string;
  description: string;
  status: 'proposed' | 'testing' | 'confirmed' | 'rejected' | 'revised';
  evidence: EvidenceItem[];
  evidenceIds?: string[];
  timelineEventIds?: string[];
  confidence: number; // 0-100
  createdBy: string;
  createdAt: Date;
  testedAt?: Date;
  revisedAt?: Date;
  relatedHypotheses: string[];
}

export interface EvidenceItem {
  id: string;
  title?: string;
  type:
    | 'document'
    | 'testimony'
    | 'photo'
    | 'video'
    | 'audio'
    | 'data'
    | 'analysis'
    | 'entity'
    | 'person'
    | 'organization';
  sourceId: string; // documentId, entityId, etc.
  source?: string;
  description: string;
  relevance: 'high' | 'medium' | 'low';
  credibility: 'verified' | 'likely' | 'uncertain' | 'disputed';
  extractedAt: Date;
  extractedBy: string;
  analysis?: EvidenceAnalysis;
  authenticityScore?: number;
  chainOfCustody?: ChainOfCustodyEvent[];
  acquiredAt?: Date;
  hash?: string;
  legalAdmissibility?: {
    status: 'admissible' | 'inadmissible' | 'conditional' | 'unknown';
    notes?: string;
  };
  sensitivity?: 'public' | 'confidential' | 'restricted' | 'secret';
  cleanedPath?: string;
  metadata?: Record<string, unknown>;
  metadata_json?: string | Record<string, unknown>;
}

export interface ChainOfCustodyEvent {
  id: string;
  date: Date;
  actor: string;
  action: 'acquired' | 'analyzed' | 'transferred' | 'stored' | 'archived';
  notes?: string;
  signature?: string;
}

export interface EvidenceAnalysis {
  type: 'sentiment' | 'topic' | 'entity' | 'relationship' | 'timeline' | 'pattern';
  method: string;
  confidence: number;
  results: Record<string, unknown>;
  performedBy: string;
  performedAt: Date;
}

export interface InvestigationTimeline {
  id: string;
  investigationId: string;
  title: string;
  layers: TimelineLayer[];
  events: TimelineEvent[];
  createdBy: string;
  createdAt: Date;
  isPublic: boolean;
}

export interface TimelineLayer {
  id: string;
  name: string;
  color: string;
  type: 'personal' | 'business' | 'legal' | 'travel' | 'communication' | 'financial' | 'custom';
  visibility: 'public' | 'team' | 'private';
}

export interface TimelineEvent {
  id: string;
  layerId: string;
  title: string;
  description: string;
  type: 'document' | 'meeting' | 'location' | 'communication' | 'hypothesis' | 'other';
  hypothesisIds?: string[];
  startDate: Date;
  endDate?: Date;
  entities: string[]; // entityIds
  documents: string[]; // documentIds
  evidence: EvidenceItem[];
  confidence: number;
  importance: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  location?: {
    address?: string;
    coordinates?: { lat: number; lng: number };
  };
  sources: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  verifiedBy?: string;
  verifiedAt?: Date;
}

export interface InvestigationReport {
  id: string;
  investigationId: string;
  title: string;
  summary: string;
  findings: Finding[];
  methodology: string;
  limitations: string[];
  recommendations: string[];
  evidence: EvidenceSummary;
  timeline: InvestigationTimeline;
  team: Investigator[];
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'review' | 'final' | 'published';
  permissions: AccessControl[];
}

export interface Finding {
  id: string;
  title: string;
  description: string;
  evidence: EvidenceItem[];
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: string;
  relatedFindings: string[];
  verifiedBy?: string;
  verifiedAt?: Date;
}

export interface EvidenceSummary {
  totalDocuments: number;
  totalEntities: number;
  totalAnnotations: number;
  evidenceByType: Record<string, number>;
  credibilityDistribution: Record<string, number>;
  keyEvidence: EvidenceItem[];
  missingEvidence: string[];
}

export interface NetworkAnalysis {
  entities: NetworkEntity[];
  relationships: NetworkRelationship[];
  communities: NetworkCommunity[];
  metrics: NetworkMetrics;
}

export interface NetworkEntity {
  id: string;
  name: string;
  type: string;
  centrality: number;
  betweenness: number;
  influence: number;
  riskLevel: number;
  community?: string;
}

export interface NetworkRelationship {
  source: string;
  target: string;
  type: string;
  strength: number;
  evidence: EvidenceItem[];
  timeline: Date[];
}

export interface NetworkCommunity {
  id: string;
  name: string;
  entities: string[];
  density: number;
  centrality: number;
  characteristics: string[];
}

export interface NetworkMetrics {
  totalEntities: number;
  totalRelationships: number;
  averageDegree: number;
  clusteringCoefficient: number;
  networkDiameter: number;
  communities: number;
  centralEntities: string[];
  bridges: string[];
}
