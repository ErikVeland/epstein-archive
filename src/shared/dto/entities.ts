import type { ProvenanceFieldsDto } from './provenance';

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface SubjectCardStatsDto {
  mentions: number;
  documents: number;
  distinctSources: number;
  verifiedMedia: number;
}

export interface SubjectCardForensicsDto {
  riskLevel: RiskLevel;
  evidenceLadder: 'L1' | 'L2' | 'L3' | 'NONE';
  redFlagObjective?: number;
  redFlagSubjective?: number;
  signalStrength: {
    exposure: number;
    connectivity: number;
    corroboration: number;
  };
  driverLabels: string[];
}

export interface SubjectCardTopPreviewDto extends ProvenanceFieldsDto {
  id: string;
  type: 'document' | 'flight_log' | 'black_book' | 'testimony';
  title: string;
  citation: string;
  confidence: number;
  year?: number;
}

export interface SubjectCardListItemDto {
  id: string;
  name: string;
  role: string;
  shortBio?: string;
  stats: SubjectCardStatsDto;
  forensics: SubjectCardForensicsDto;
  topPreview?: SubjectCardTopPreviewDto;
  topPhotoId?: string;
}

export interface SubjectsListResponseDto {
  subjects: SubjectCardListItemDto[];
  total: number;
}

export interface EntityListItemDto extends ProvenanceFieldsDto {
  id: number | string;
  name: string;
  fullName: string;
  bio?: string;
  entityType: string;
  primaryRole: string;
  secondaryRoles: string[];
  mentions: number;
  files: number;
  contexts: Record<string, unknown>[];
  evidenceTypes: string[];
  photos: Record<string, unknown>[];
  significantPassages: Record<string, unknown>[];
  likelihoodScore: RiskLevel;
  redFlagScore: number;
  redFlagRating: number;
  redFlagPeppers: string;
  redFlagDescription: string;
  connectionsToEpstein: string;
}

export interface EntityListResponseDto {
  data: EntityListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
export interface EntityDetailDto extends ProvenanceFieldsDto {
  id: string;
  name: string;
  fullName: string;
  entityType: string;
  primaryRole: string;
  secondaryRoles: string[];
  mentions: number;
  files: number;
  contexts: unknown[];
  evidenceTypes: string[];
  likelihoodScore: string;
  redFlagScore: number;
  redFlagRating: number;
  redFlagPeppers: string;
  redFlagDescription: string;
  connectionsToEpstein: string;
  fileReferences: unknown[];
  timelineEvents: unknown[];
  networkConnections: unknown[];
  blackBookEntries: unknown[];
  bio: string;
  description: string;
  photos: unknown[];
  significantPassages: unknown[];
  birthDate: string | null;
  deathDate: string | null;
}
