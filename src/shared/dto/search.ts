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
  sourcePath: string;
  contentPreview: string;
  redFlagRating: number;
}

export interface UnifiedSearchResponseDto {
  entities: SearchEntityResultDto[];
  documents: SearchDocumentResultDto[];
  investigations: Record<string, unknown>[];
  articles: Record<string, unknown>[];
  media: Record<string, unknown>[];
  didYouMean: string[];
  semanticCapability?: { available: boolean; provider?: string };
}
