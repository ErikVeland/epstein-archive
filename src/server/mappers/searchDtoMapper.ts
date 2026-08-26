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
  passages: Array.isArray(data.passages)
    ? data.passages.map((passage) => ({
        citationId: String(passage.citationId),
        citationSchema: String(passage.citationSchema),
        documentId: String(passage.documentId),
        sentenceId: String(passage.sentenceId),
        sentenceIndex: Math.max(0, Number(passage.sentenceIndex) || 0),
        pageId: passage.pageId == null ? null : String(passage.pageId),
        pageNumber: (() => {
          if (passage.pageNumber == null) return null;
          const parsed = Number(passage.pageNumber);
          return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : null;
        })(),
        quote: String(passage.quote),
        snippet: String(passage.snippet),
        documentTitle: String(passage.documentTitle),
        fileName: String(passage.fileName),
        sourceCollection:
          passage.sourceCollection == null ? null : String(passage.sourceCollection),
        sourceRelease: passage.sourceRelease == null ? null : String(passage.sourceRelease),
        sourceFamily: String(passage.sourceFamily),
        assetId: passage.assetId == null ? null : String(passage.assetId),
        assetSha256: passage.assetSha256 == null ? null : String(passage.assetSha256),
        documentRevisionHash: String(passage.documentRevisionHash),
        documentSha256: passage.documentSha256 == null ? null : String(passage.documentSha256),
        textSha256: String(passage.textSha256),
        textStart: passage.textStart == null ? null : Number(passage.textStart),
        textEnd: passage.textEnd == null ? null : Number(passage.textEnd),
        quoteOccurrence: passage.quoteOccurrence == null ? null : Number(passage.quoteOccurrence),
        scanBbox:
          passage.scanBbox && typeof passage.scanBbox === 'object'
            ? (passage.scanBbox as Record<string, unknown> | number[])
            : null,
        ocrConfidence: passage.ocrConfidence == null ? null : Number(passage.ocrConfidence),
        provenanceStatus:
          passage.provenanceStatus == null ? null : String(passage.provenanceStatus),
        evidenceType: passage.evidenceType == null ? null : String(passage.evidenceType),
        redFlagRating: passage.redFlagRating == null ? null : Number(passage.redFlagRating),
        textUrl: String(passage.textUrl),
        scanUrl: String(passage.scanUrl),
        matchReason: String(passage.matchReason),
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
