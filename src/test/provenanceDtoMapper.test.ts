import { describe, expect, it } from 'vitest';

import { mapDocumentListItemDto } from '../server/mappers/documentsDtoMapper';
import { mapEntityListItemDto } from '../server/mappers/entitiesDtoMapper';
import { mapEntityMentionEvidenceDto } from '../server/mappers/entityEvidenceDtoMapper';
import { mapProvenanceFieldsDto } from '../server/mappers/provenanceDtoMapper';
import { documentListItemSchema } from '../shared/schemas/documents';
import { entityListItemSchema } from '../shared/schemas/entities';
import { provenanceSchema } from '../shared/schemas/provenance';

describe('mapProvenanceFieldsDto', () => {
  it('normalizes canonical provenance fields from legacy row names', () => {
    const result = mapProvenanceFieldsDto({
      source_document_id: '42',
      content_hash: 'abc123',
      extraction_method: 'AI_Enrichment',
      confidence_score: 87,
      review_state: 'verified',
      last_verified_at: '2026-04-29T03:00:00.000Z',
    });

    expect(result).toEqual({
      sourceDocumentId: 42,
      sourceHash: 'abc123',
      extractionMethod: 'agentic',
      confidence: 0.87,
      reviewState: 'accepted',
      lastVerifiedAt: '2026-04-29T03:00:00.000Z',
      provenanceStatus: 'complete',
    });
    expect(() => provenanceSchema.parse(result)).not.toThrow();
  });

  it('marks records without hash or extraction method as missing provenance', () => {
    const result = mapProvenanceFieldsDto({
      confidence: null,
      status: 'not_enough_evidence',
    });

    expect(result.sourceDocumentId).toBeNull();
    expect(result.sourceHash).toBeNull();
    expect(result.extractionMethod).toBeNull();
    expect(result.confidence).toBeNull();
    expect(result.reviewState).toBe('insufficient_evidence');
    expect(result.provenanceStatus).toBe('missing');
    expect(() => provenanceSchema.parse(result)).not.toThrow();
  });

  it('treats a source document plus extraction method as complete provenance', () => {
    const result = mapProvenanceFieldsDto({
      source_document_id: '314',
      extraction_method: 'agentic',
      confidence: 0.64,
    });

    expect(result.sourceDocumentId).toBe(314);
    expect(result.sourceHash).toBeNull();
    expect(result.extractionMethod).toBe('agentic');
    expect(result.provenanceStatus).toBe('complete');
    expect(() => provenanceSchema.parse(result)).not.toThrow();
  });
});

describe('provenance-bearing DTO mappers', () => {
  it('adds canonical provenance fields to document list items', () => {
    const result = mapDocumentListItemDto({
      id: 7,
      fileName: 'source.pdf',
      title: 'Source PDF',
      fileType: 'pdf',
      fileSize: 123,
      dateCreated: '2026-04-29',
      evidenceType: 'legal',
      metadata: {},
      source_hash: 'doc-hash',
      extraction_method: 'ocr',
      confidence: 0.91,
      review_state: 'accepted',
    });

    expect(result.sourceHash).toBe('doc-hash');
    expect(result.extractionMethod).toBe('ocr');
    expect(result.confidence).toBe(0.91);
    expect(result.reviewState).toBe('accepted');
    expect(result.provenanceStatus).toBe('complete');
    expect(() => documentListItemSchema.parse(result)).not.toThrow();
  });

  it('adds explicit missing provenance to entity list items', () => {
    const result = mapEntityListItemDto({
      id: 9,
      full_name: 'Example Person',
      entity_type: 'person',
      primary_role: 'Person of Interest',
      likelihood_score: 'LOW',
    });

    expect(result.sourceDocumentId).toBeNull();
    expect(result.sourceHash).toBeNull();
    expect(result.reviewState).toBe('unreviewed');
    expect(result.provenanceStatus).toBe('missing');
    expect(() => entityListItemSchema.parse(result)).not.toThrow();
  });

  it('normalizes provenance on entity evidence items', () => {
    const result = mapEntityMentionEvidenceDto({
      id: 'ev-1',
      document_id: 21,
      evidence_type: 'document',
      title: 'Evidence',
      source_path: '/source/path',
      content_preview: 'Preview',
      confidence_score: 72,
      source_hash: 'evidence-hash',
      extraction_method: 'llm',
      review_state: 'disputed',
    });

    expect(result.documentId).toBe(21);
    expect(result.sourceDocumentId).toBe(21);
    expect(result.sourceHash).toBe('evidence-hash');
    expect(result.extractionMethod).toBe('agentic');
    expect(result.confidence).toBe(0.72);
    expect(result.reviewState).toBe('rejected');
    expect(result.provenanceStatus).toBe('complete');
  });
});
