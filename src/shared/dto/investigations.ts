export type LeadStatus = 'open' | 'pursued' | 'dead_end' | 'resolved';
export type LeadPriority = 'low' | 'medium' | 'high' | 'critical';

export interface InvestigativeLeadDto {
  id: number;
  investigationId: number;
  title: string;
  description: string | null;
  status: LeadStatus;
  priority: LeadPriority;
  sourceDocumentId: number | null;
  sourceEftaRef: string | null;
  assignedTo: string | null;
  createdBy: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
  leadKind?: 'motif' | 'relationship' | 'document' | 'manual';
  motifType?: string | null;
  harmType?: string | null;
  confidence?: number | null;
  riskScore?: number | null;
  evidenceCount?: number;
  pathLength?: number | null;
  sourceSummary?: string | null;
  primaryEntities?: unknown[];
  supportingDocuments?: unknown[];
  contradictionCount?: number;
  reviewState?: string;
  explainability?: unknown;
}

export interface InvestigationListItemDto {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  leadCount: number;
  evidenceCount: number;
}

// ---------------------------------------------------------------------------
// Evidence (investigation case folder + evidence lists)
// ---------------------------------------------------------------------------

export type InvestigationEvidenceRelevance = 'low' | 'medium' | 'high' | 'critical' | string;

export type InvestigationEvidenceTargetType = 'document' | 'entity' | 'media' | null;

export interface InvestigationEvidenceListItemDto {
  id: number;
  type: string;
  title: string | null;
  description: string | null;
  sourcePath: string;
  metadataJson?: unknown;
  investigationEvidenceId: number;
  relevance: InvestigationEvidenceRelevance;
  addedAt: string;
  addedBy: string | null;
  // Back-compat fields used by some UI normalizers
  extractedAt?: string;
  extractedBy?: string;
}

export interface InvestigationEvidenceListResponseDto {
  data: InvestigationEvidenceListItemDto[];
  total: number;
  limit: number;
  offset: number;
}

export interface InvestigationCaseEvidenceItemDto extends InvestigationEvidenceListItemDto {
  notes?: string | null;
  documentId?: number | null;
  mediaItemId?: number | null;
  redFlagRating: number;
  // Enrichment fields (optional)
  ingestRunId?: number | null;
  evidenceLadder?: string | null;
  pipelineVersion?: string | null;
  evidencePack?: string | null;
  wasAgentic?: boolean;
  targetType?: InvestigationEvidenceTargetType;
  targetId?: string | number | null;
}

export interface InvestigationEvidenceByTypeResponseDto {
  all: InvestigationCaseEvidenceItemDto[];
  byType: Record<string, InvestigationCaseEvidenceItemDto[]>;
  counts: Record<string, number>;
  total: number;
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface InvestigationTaskDto {
  id: number;
  uuid: string;
  investigationId: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo?: string;
  dueDate?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  evidenceIds?: number[];
  relatedEntities?: number[];
  progress?: number;
}

export interface InvestigationTaskSummaryDto {
  statusBreakdown: Record<string, number>;
  priorityBreakdown: Record<string, number>;
  overdueTasks: number;
  averageProgress: number;
  assignmentBreakdown: { assignedTo: string; count: number }[];
}
