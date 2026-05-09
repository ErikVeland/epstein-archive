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

export interface UnifiedSearchResponseDto {
  entities: SearchEntityResultDto[];
  documents: SearchDocumentResultDto[];
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
