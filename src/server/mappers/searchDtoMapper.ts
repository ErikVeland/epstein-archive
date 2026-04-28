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
        sourcePath: String(d.sourcePath ?? d.file_path ?? ''),
        contentPreview: String(d.contentPreview ?? d.content_preview ?? ''),
        redFlagRating: Number(d.redFlagRating ?? d.red_flag_rating ?? 0),
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
      }
    : undefined,
});
