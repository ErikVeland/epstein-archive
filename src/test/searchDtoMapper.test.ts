import { describe, expect, it } from 'vitest';
import { mapUnifiedSearchResponseDto } from '../server/mappers/searchDtoMapper';

describe('mapUnifiedSearchResponseDto', () => {
  it('preserves semantic search metadata and document match reasons', () => {
    const result = mapUnifiedSearchResponseDto({
      entities: [],
      documents: [
        {
          id: '42',
          title: 'Conceptual hit',
          fileName: 'source.pdf',
          filePath: '/data/source.pdf',
          snippet: 'Matched through adjacent language.',
          evidenceType: 'document',
          redFlagRating: 4,
          matchReason: 'semantic',
          rank: 0.87,
        },
      ],
      investigations: [],
      articles: [],
      media: [],
      didYouMean: [],
      requestedMode: 'semantic',
      effectiveMode: 'semantic',
      semanticCapability: {
        available: true,
        provider: 'pgvector',
        documentEmbeddings: 1200,
        entityEmbeddings: 80,
      },
    });

    expect(result.documents[0]).toMatchObject({
      fileName: 'source.pdf',
      filePath: '/data/source.pdf',
      snippet: 'Matched through adjacent language.',
      evidenceType: 'document',
      matchReason: 'semantic',
      score: 0.87,
    });
    expect(result.semanticCapability).toMatchObject({
      available: true,
      provider: 'pgvector',
      documentEmbeddings: 1200,
      entityEmbeddings: 80,
      requestedMode: 'semantic',
      effectiveMode: 'semantic',
    });
  });

  it('adds an explicit fallback message when semantic was requested but lexical ran', () => {
    const result = mapUnifiedSearchResponseDto({
      entities: [],
      documents: [],
      investigations: [],
      articles: [],
      media: [],
      didYouMean: [],
      requestedMode: 'hybrid',
      effectiveMode: 'lexical',
      semanticCapability: {
        available: false,
        reason: 'pgvector is installed, but no document or entity embeddings are populated',
      },
    });

    expect(result.semanticCapability).toMatchObject({
      available: false,
      requestedMode: 'hybrid',
      effectiveMode: 'lexical',
      reason: 'pgvector is installed, but no document or entity embeddings are populated',
      message: 'Hybrid search is using keyword results because semantic indexes are unavailable.',
    });
  });

  it('preserves every coordinate needed to verify a passage citation', () => {
    const result = mapUnifiedSearchResponseDto({
      entities: [],
      documents: [],
      passages: [
        {
          citationId: `EA-P-${'a'.repeat(40)}`,
          citationSchema: 'evidence-passage-v2',
          documentId: '42',
          sentenceId: '99',
          sentenceIndex: 7,
          pageId: '11',
          pageNumber: 3,
          quote: 'Exact text',
          snippet: 'Exact text',
          documentTitle: 'Source document',
          fileName: 'source.pdf',
          sourceCollection: 'Collection',
          sourceRelease: 'Release',
          sourceFamily: `asset-sha256:${'b'.repeat(64)}`,
          assetId: '8',
          assetSha256: 'b'.repeat(64),
          documentRevisionHash: 'c'.repeat(64),
          documentSha256: 'b'.repeat(64),
          textSha256: 'd'.repeat(64),
          textStart: 10,
          textEnd: 20,
          quoteOccurrence: 0,
          scanBbox: null,
          ocrConfidence: 0.9,
          provenanceStatus: 'verified',
          evidenceType: 'document',
          redFlagRating: 0,
          textUrl: '/documents/42?passage=test',
          scanUrl: '/documents/42?passage=test&viewMode=pdf',
          matchReason: 'passage-text',
        },
      ],
      investigations: [],
      articles: [],
      media: [],
      didYouMean: [],
    });

    expect(result.passages[0]).toMatchObject({
      documentId: '42',
      sentenceId: '99',
      sentenceIndex: 7,
      pageId: '11',
      pageNumber: 3,
      textStart: 10,
      textEnd: 20,
    });
  });
});
