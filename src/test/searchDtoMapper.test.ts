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
});
