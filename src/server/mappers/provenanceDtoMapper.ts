import type {
  ExtractionMethod,
  ProvenanceFieldsDto,
  ProvenanceStatus,
  ReviewState,
} from '@shared/dto/provenance';

interface ProvenanceRowInput {
  sourceDocumentId?: unknown;
  source_document_id?: unknown;
  documentId?: unknown;
  document_id?: unknown;
  sourceHash?: unknown;
  source_hash?: unknown;
  contentHash?: unknown;
  content_hash?: unknown;
  extractionMethod?: unknown;
  extraction_method?: unknown;
  confidence?: unknown;
  confidenceScore?: unknown;
  confidence_score?: unknown;
  reviewState?: unknown;
  review_state?: unknown;
  status?: unknown;
  lastVerifiedAt?: unknown;
  last_verified_at?: unknown;
  verifiedAt?: unknown;
  verified_at?: unknown;
}

const asNullableString = (value: unknown): string | null => {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  return null;
};

const asNullableNumber = (value: unknown): number | null => {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeConfidence = (value: unknown): number | null => {
  const parsed = asNullableNumber(value);
  if (parsed == null) return null;
  return parsed > 1 ? Math.min(parsed / 100, 1) : Math.max(parsed, 0);
};

const normalizeExtractionMethod = (value: unknown): ExtractionMethod | null => {
  const method = asNullableString(value)?.trim().toLowerCase();
  switch (method) {
    case 'ocr':
    case 'pdf_extract':
    case 'tesseract':
      return 'ocr';
    case 'manual':
    case 'human':
      return 'manual';
    case 'structured':
    case 'import':
    case 'legacy_ingest':
    case 'heuristic':
    case 'nlp':
    case 'spacy':
      return 'structured';
    case 'agentic':
    case 'ai_enrichment':
    case 'llm':
      return 'agentic';
    default:
      return null;
  }
};

const normalizeReviewState = (value: unknown): ReviewState => {
  const state = asNullableString(value)?.trim().toLowerCase();
  switch (state) {
    case 'verified':
    case 'accepted':
    case 'reviewed':
      return 'accepted';
    case 'rejected':
    case 'disputed':
    case 'false':
      return 'rejected';
    case 'deferred':
      return 'deferred';
    case 'insufficient_evidence':
    case 'insufficient':
    case 'not_enough_evidence':
      return 'insufficient_evidence';
    default:
      return 'unreviewed';
  }
};

const deriveProvenanceStatus = (
  sourceHash: string | null,
  extractionMethod: ExtractionMethod | null,
): ProvenanceStatus => {
  if (sourceHash && extractionMethod) return 'complete';
  if (sourceHash || extractionMethod) return 'partial';
  return 'missing';
};

export const mapProvenanceFieldsDto = (row: ProvenanceRowInput): ProvenanceFieldsDto => {
  const sourceDocumentId = asNullableNumber(
    row.sourceDocumentId ?? row.source_document_id ?? row.documentId ?? row.document_id,
  );
  const sourceHash = asNullableString(
    row.sourceHash ?? row.source_hash ?? row.contentHash ?? row.content_hash,
  );
  const extractionMethod = normalizeExtractionMethod(row.extractionMethod ?? row.extraction_method);

  return {
    sourceDocumentId,
    sourceHash,
    extractionMethod,
    confidence: normalizeConfidence(row.confidence ?? row.confidenceScore ?? row.confidence_score),
    reviewState: normalizeReviewState(row.reviewState ?? row.review_state ?? row.status),
    lastVerifiedAt: asNullableString(
      row.lastVerifiedAt ?? row.last_verified_at ?? row.verifiedAt ?? row.verified_at,
    ),
    provenanceStatus: deriveProvenanceStatus(sourceHash, extractionMethod),
  };
};
