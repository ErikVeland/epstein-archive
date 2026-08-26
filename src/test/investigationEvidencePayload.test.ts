import { describe, expect, it } from 'vitest';
import { buildInvestigationEvidencePayload } from '../client/contexts/investigationEvidencePayload.js';

process.env.JWT_SECRET ||= 'test-only-investigation-evidence-secret';
const { addEvidenceSchema } = await import('../server/routes/investigationsEvidence.js');

describe('investigation evidence payload', () => {
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
