import type { UnifiedSearchResponseDto } from '@shared/dto/search';
import type { UnifiedSearchResult } from '../db/searchRepository';

export const mapUnifiedSearchResponseDto = (
  data: UnifiedSearchResult,
): UnifiedSearchResponseDto => ({
  entities: Array.isArray(data.entities)
    ? (data.entities as Record<string, unknown>[]).map((e) => ({
        id: (e.id != null ? (typeof e.id === 'number' ? e.id : String(e.id)) : 0) as
          | string
          | number,
        name: String(e.name || e.fullName || ''),
        mentions: Number(e.mentions) || 0,
        connectionCount: Number(e.connectionCount ?? e.connection_count) || 0,
        riskScore: Number(e.riskScore ?? e.risk_score ?? 0),
        primaryRole: e.primaryRole ? String(e.primaryRole) : undefined,
      }))
    : [],
  documents: Array.isArray(data.documents)
    ? (data.documents as Record<string, unknown>[]).map((d) => ({
        id: (d.id != null ? (typeof d.id === 'number' ? d.id : String(d.id)) : 0) as
          | string
          | number,
        title: String(d.title || ''),
        fileName: d.fileName ? String(d.fileName) : undefined,
        filePath: d.filePath ? String(d.filePath) : undefined,
        sourcePath: String(d.sourcePath ?? d.filePath ?? d.file_path ?? ''),
        contentPreview: String(d.contentPreview ?? d.previewText ?? d.content_preview ?? ''),
        snippet: d.snippet == null ? null : String(d.snippet),
        evidenceType: d.evidenceType == null ? null : String(d.evidenceType),
        redFlagRating: Number(d.redFlagRating ?? d.red_flag_rating ?? 0),
        matchReason: d.matchReason == null ? undefined : String(d.matchReason),
        score: Number(d.score ?? d.rank ?? 0),
      }))
    : [],
  investigations: Array.isArray(data.investigations)
    ? (data.investigations as Record<string, unknown>[])
    : [],
  articles: Array.isArray(data.articles) ? (data.articles as Record<string, unknown>[]) : [],
  media: Array.isArray(data.media) ? (data.media as Record<string, unknown>[]) : [],
  didYouMean: Array.isArray(data.didYouMean) ? data.didYouMean.map(String) : [],
  semanticCapability: data.semanticCapability
    ? {
        available: Boolean(data.semanticCapability.available),
        reason: data.semanticCapability.reason,
        provider: data.semanticCapability.provider,
        documentEmbeddings: data.semanticCapability.documentEmbeddings,
        entityEmbeddings: data.semanticCapability.entityEmbeddings,
        requestedMode: data.requestedMode,
        effectiveMode: data.effectiveMode,
        message:
          data.requestedMode !== 'lexical' && data.effectiveMode === 'lexical'
            ? data.requestedMode === 'semantic'
              ? 'Conceptual search is unavailable in this environment, so keyword results are shown instead.'
              : 'Hybrid search is using keyword results because semantic indexes are unavailable.'
            : undefined,
      }
    : undefined,
});
