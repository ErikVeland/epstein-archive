import { describe, expect, it } from 'vitest';
import { buildInvestigationEvidencePayload } from '../client/contexts/investigationEvidencePayload.js';
import { resolveCaseEvidenceTarget } from '../client/domains/investigations/investigations.model.js';

process.env.JWT_SECRET ||= 'test-only-investigation-evidence-secret';
const { addEvidenceSchema } = await import('../server/routes/investigationsEvidence.js');

describe('investigation evidence payload', () => {
  it.each([
    ['entity:5', 'entity', '5'],
    ['document:7', 'document', '7'],
    ['media:9', 'media', '9'],
  ])(
    'preserves the target of %s when a wrapper document also exists',
    (sourcePath, targetType, targetId) => {
      expect(
        resolveCaseEvidenceTarget({
          id: 1,
          investigationEvidenceId: 1,
          type: 'document',
          title: null,
          description: null,
          sourcePath,
          documentId: 42,
          relevance: 'high',
          addedAt: '2026-11-05',
          addedBy: null,
          redFlagRating: 0,
        }),
      ).toMatchObject({ targetType, targetId });
    },
  );
  it('opens a canonical document ID when the stored source path is a file path', () => {
    expect(
      resolveCaseEvidenceTarget({
        id: 1,
        investigationEvidenceId: 1,
        type: 'document',
        title: null,
        description: null,
        sourcePath: 'data/synthetic/source.pdf',
        documentId: 42,
        relevance: 'high',
        addedAt: '2026-11-05',
        addedBy: null,
        redFlagRating: 0,
      }),
    ).toMatchObject({ targetType: 'document', targetId: '42' });
  });
  it('keeps a passage citation and its evidence address at the API body root', () => {
    const metadata = {
      citationId: `EA-P-${'a'.repeat(40)}`,
      citationSchema: 'evidence-passage-v2',
      documentId: '42',
      sentenceIndex: 7,
      assetSha256: 'b'.repeat(64),
      exactQuote: 'Exact source text',
    };
    const payload = buildInvestigationEvidencePayload(
      {
        id: metadata.citationId,
        type: 'evidence',
        title: 'Source document — Page 3',
        description: metadata.exactQuote,
        metadata,
      },
      'high',
    );

    expect(payload).toMatchObject({
      title: 'Source document — Page 3',
      type: 'evidence',
      description: 'Exact source text',
      source_path: `evidence:${metadata.citationId}`,
      relevance: 'high',
      metadata,
    });
    expect(payload).not.toHaveProperty('evidence');
    expect(() => addEvidenceSchema.parse({ params: { id: '1' }, body: payload })).not.toThrow();
  });
});
