export interface SearchEntityResultDto {
  id: number | string;
  name: string;
  mentions: number;
  connectionCount: number;
  riskScore: number;
  primaryRole?: string;
}

export interface SearchDocumentResultDto {
  id: number | string;
  title: string;
  fileName?: string;
  filePath?: string;
  sourcePath: string;
  contentPreview: string;
  snippet?: string | null;
  evidenceType?: string | null;
  redFlagRating: number;
  matchReason?: string;
  score?: number;
}

/** A sentence-level search hit with a durable address into the source evidence. */
export interface SearchPassageResultDto {
  citationId: string;
  citationSchema: string;
  documentId: string;
  sentenceId: string;
  sentenceIndex: number;
  pageId: string | null;
  pageNumber: number | null;
  quote: string;
  snippet: string;
  documentTitle: string;
  fileName: string;
  sourceCollection: string | null;
  sourceRelease: string | null;
  sourceFamily: string;
  assetId: string | null;
  assetSha256: string | null;
  documentRevisionHash: string;
  documentSha256: string | null;
  textSha256: string;
  textStart: number | null;
  textEnd: number | null;
  quoteOccurrence: number | null;
  scanBbox: Record<string, unknown> | number[] | null;
  ocrConfidence: number | null;
  provenanceStatus: string | null;
  evidenceType: string | null;
  redFlagRating: number | null;
  textUrl: string;
  scanUrl: string;
  matchReason: string;
}

export interface UnifiedSearchResponseDto {
  entities: SearchEntityResultDto[];
  documents: SearchDocumentResultDto[];
  passages: SearchPassageResultDto[];
  investigations: Record<string, unknown>[];
  articles: Record<string, unknown>[];
  media: Record<string, unknown>[];
  didYouMean: string[];
  semanticCapability?: {
    available: boolean;
    reason?: string;
    provider?: string;
    documentEmbeddings?: number;
    entityEmbeddings?: number;
    requestedMode?: 'lexical' | 'semantic' | 'hybrid';
    effectiveMode?: 'lexical' | 'semantic' | 'hybrid';
    message?: string;
  };
}
