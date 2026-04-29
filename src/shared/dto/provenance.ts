export type ReviewState =
  | 'unreviewed'
  | 'accepted'
  | 'rejected'
  | 'deferred'
  | 'insufficient_evidence';

export type ExtractionMethod = 'ocr' | 'manual' | 'structured' | 'agentic';

export type ProvenanceStatus = 'complete' | 'partial' | 'missing';

export interface ProvenanceFieldsDto {
  sourceDocumentId?: number | null;
  sourceHash?: string | null;
  extractionMethod?: ExtractionMethod | null;
  confidence?: number | null;
  reviewState?: ReviewState;
  lastVerifiedAt?: string | null;
  provenanceStatus?: ProvenanceStatus;
}

export type ProvenanceDto = ProvenanceFieldsDto;
