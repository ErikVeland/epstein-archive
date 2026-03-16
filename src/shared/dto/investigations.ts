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
