export type RedactionFindingType =
  | 'overlay_text_exposed'
  | 'contextual_hypothesis'
  | 'unresolved_redaction';

export type RedactionReviewStatus = 'pending' | 'corroborated' | 'rejected';

export interface RedactionCandidateDto {
  value: string;
  category: 'name' | 'identifier' | 'date' | 'location' | 'organization' | 'other';
  confidence: number;
  rationale: string;
  entityId: string | null;
  corroboratingDocumentCount: number;
}

export interface RedactionFindingDto {
  id: string;
  documentId: string;
  pageNumber: number | null;
  spanStart: number | null;
  spanEnd: number | null;
  type: RedactionFindingType;
  exposedText: string | null;
  bbox: unknown;
  inferredClass: string | null;
  candidates: RedactionCandidateDto[];
  confidence: number;
  evidence: string[];
  method: string;
  modelId: string | null;
  promptVersion: string | null;
  sourceSha256: string | null;
  reviewStatus: RedactionReviewStatus;
}

export interface DocumentRedactionsDto {
  documentId: string;
  sourceFileUrl: string;
  count: number;
  overlayRecoveryCount: number;
  hypothesisCount: number;
  unresolvedCount: number;
  findings: RedactionFindingDto[];
  disclaimer: string;
}

export interface RedactionIntelligenceSummaryDto {
  total: number;
  overlayRecoveries: number;
  contextualHypotheses: number;
  pendingReview: number;
  corroborated: number;
}

export interface RedactionQueueItemDto {
  documentId: string;
  title: string;
  fileName: string;
  previewText: string;
  findingCount: number;
  overlayRecoveryCount: number;
  hypothesisCount: number;
  unresolvedCount: number;
  highestConfidence: number;
  pendingReviewCount: number;
}

export interface RedactionQueueDto {
  items: RedactionQueueItemDto[];
  total: number;
}
