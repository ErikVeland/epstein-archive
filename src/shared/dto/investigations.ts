export interface InvestigationEvidenceListItemDto {
  id: number;
  type: string;
  title: string;
  description: string;
  sourcePath: string;
  metadataJson: string | null;
  investigationEvidenceId: number;
  relevance: string;
  extractedAt: string;
  extractedBy: string | null;
}

export interface InvestigationEvidenceListResponseDto {
  data: InvestigationEvidenceListItemDto[];
  total: number;
  limit: number;
  offset: number;
}

export interface InvestigationCaseEvidenceItemDto {
  id: number;
  type: string;
  title: string;
  description: string;
  sourcePath: string;
  metadataJson: string | null;
  investigationEvidenceId?: number;
  documentId?: number | null;
  mediaItemId?: number | null;
  redFlagRating: number;
  relevance: string;
  addedAt: string;
  addedBy: string | null;
  notes: string;
  targetType?: 'document' | 'entity' | 'media' | null;
  targetId?: number | null;
  ingestRunId?: string | number | null;
  evidenceLadder?: string | null;
  pipelineVersion?: string | null;
  evidencePack?: unknown;
  wasAgentic?: boolean;
}

export interface InvestigationEvidenceByTypeResponseDto {
  all: InvestigationCaseEvidenceItemDto[];
  byType: Record<string, InvestigationCaseEvidenceItemDto[]>;
  counts: Record<string, number>;
  total: number;
}

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
  assignmentBreakdown: { assigned_to: string; count: number }[];
}
