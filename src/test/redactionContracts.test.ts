import { describe, expect, it } from 'vitest';
import {
  DocumentRedactionsSchema,
  RedactionIntelligenceSummarySchema,
  RedactionQueueSchema,
} from '@shared/contracts';

describe('redaction intelligence contracts', () => {
  it('accepts an auditable source-layer finding', () => {
    const parsed = DocumentRedactionsSchema.parse({
      documentId: '42',
      sourceFileUrl: '/api/documents/42/file?variant=original',
      count: 1,
      overlayRecoveryCount: 1,
      hypothesisCount: 0,
      unresolvedCount: 0,
      findings: [
        {
          id: '7',
          documentId: '42',
          pageNumber: 3,
          spanStart: 12,
          spanEnd: 18,
          type: 'overlay_text_exposed',
          exposedText: 'Example',
          bbox: { text: [1, 2, 3, 4] },
          inferredClass: 'person',
          candidates: [],
          confidence: 0.94,
          evidence: ['text precedes overlay'],
          method: 'pdf_object_order_v2',
          modelId: null,
          promptVersion: null,
          sourceSha256: 'abc',
          reviewStatus: 'pending',
        },
      ],
      disclaimer: 'Confidence is not truth.',
    });

    expect(parsed.findings[0].type).toBe('overlay_text_exposed');
  });

  it('rejects confidence outside the supported range', () => {
    expect(() =>
      RedactionQueueSchema.parse({
        total: 1,
        items: [
          {
            documentId: '1',
            title: 'Document',
            fileName: 'document.pdf',
            previewText: '',
            findingCount: 1,
            overlayRecoveryCount: 0,
            hypothesisCount: 1,
            unresolvedCount: 0,
            highestConfidence: 1.2,
            pendingReviewCount: 1,
          },
        ],
      }),
    ).toThrow();
  });

  it('keeps aggregate counts non-negative', () => {
    expect(() =>
      RedactionIntelligenceSummarySchema.parse({
        total: -1,
        overlayRecoveries: 0,
        contextualHypotheses: 0,
        pendingReview: 0,
        corroborated: 0,
      }),
    ).toThrow();
  });
});
