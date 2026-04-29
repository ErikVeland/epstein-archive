import type { ProvenanceFieldsDto } from './provenance';

export interface DocumentListItemDto extends ProvenanceFieldsDto {
  id: string;
  fileName: string;
  title: string;
  fileType: string;
  fileSize: number;
  dateCreated: string | null;
  evidenceType: string;
  metadata: Record<string, unknown>;
  redFlagRating: number;
  wordCount: number;
  entitiesCount: number;
  keyEntities: { id: string; name: string }[];
  sourceType: string;
  previewText: string;
  previewKind: 'ai_summary' | 'excerpt' | 'fallback' | string;
  whyFlagged: string;
}

export interface DocumentsListResponseDto {
  data: DocumentListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  searchMeta?: {
    requestedMode: 'lexical' | 'semantic' | 'hybrid';
    effectiveMode: 'lexical' | 'semantic' | 'hybrid';
    semanticAvailable: boolean;
    semanticReason?: string;
    message?: string;
  };
}

export interface DocumentDetailDto extends ProvenanceFieldsDto {
  id: string;
  fileName: string;
  filePath: string | null;
  fileType: string;
  fileSize: number;
  dateCreated: string | null;
  title: string;
  content: string;
  contentRefined: string | null;
  contentPreview: string | null;
  metadata: Record<string, unknown>;
  evidenceType: string;
  redFlagRating: number;
  sourceCollection: string | null;
  fileUrl: string | null;
  originalFileUrl: string | null;
}
