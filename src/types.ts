export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'investigator' | 'viewer';
  lastActive?: string;
}

export interface Photo {
  id: string;
  filePath: string;
  url?: string;
  fullUrl?: string;
  title?: string;
  redFlagRating?: number;
  type?: 'image' | 'video';
  thumbnail_path?: string;
  file_path?: string;
  path?: string;
}

export interface Person {
  id: number | string;
  name: string;
  fullName: string;
  title?: string;
  role?: string;
  primaryRole?: string;
  secondaryRoles?: string[];
  status?: string;
  connections?: string;
  mentions: number;
  files: number;
  documentCount?: number;
  contexts: Array<{
    file: string;
    context: string;
    date: string;
    source?: string;
  }>;
  evidenceTypes: string[];
  significantPassages: Array<{
    keyword: string;
    passage: string;
    filename: string;
    source?: string;
    contentSnippet?: string;
    documentId?: string;
  }>;
  likelihoodScore?: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  likelihoodLevel?: string;
  redFlagRating?: number;
  redFlagScore?: number;
  redFlagPeppers?: string;
  redFlagDescription?: string;
  riskLevel?: string;
  entityType?: string;
  isVip?: boolean;
  blackBookEntries?: {
    id: number;
    phoneNumbers?: string[];
    emailAddresses?: string[];
    addresses?: string[];
    entryText?: string;
    notes?: string;
    entryCategory?: string;
    documentId?: number;
  }[];
  hasBlackBook?: boolean;

  fileReferences: {
    id?: string;
    filename: string;
    filePath: string;
    content?: string;
    contentPreview?: string;
  }[];
  bio?: string;
  description?: string;
  birthDate?: string;
  deathDate?: string;
  photos?: Photo[];

  // DB & Internal Fields
  connectionsSummary?: string;
  mediaCount?: number;
  timelineEvents?: Array<Record<string, unknown>>;
  networkConnections?: Array<Record<string, unknown>>;
  connectionsToEpstein?: string;
  wasAgentic?: boolean;
  ingestRunId?: string;
}

export interface Mention {
  person: string;
  file: string;
  context: string;
  date?: string;
  type: 'email' | 'document' | 'testimony' | 'flight_record';
}

export interface Evidence {
  id: string;
  person: string;
  type: 'email' | 'document' | 'testimony' | 'flight_record' | 'photo';
  title: string;
  content: string;
  date?: string;
  fileReference: string;
  significance: 'high' | 'medium' | 'low';
  redFlagRating?: number;
  source_collection?: string;
  file_type?: string;
  mentions?: number;
  documentId?: string;
  source?: string;
  filePath?: string;
  file_path?: string;
  original_file_path?: string;
  fileUrl?: string;
  originalFileUrl?: string;
  isScannedDocument?: boolean;
  metadataJson?: string;
  fileName?: string;
  ingestRunId?: string;
  wasAgentic?: boolean;
}

export interface SearchFilters {
  likelihood?: 'all' | 'HIGH' | 'MEDIUM' | 'LOW';
  role?: 'all' | string;
  status?: 'all' | string;
  minMentions?: number;
  searchTerm?: string;
  likelihoodScore?: ('HIGH' | 'MEDIUM' | 'LOW')[];
  maxMentions?: number;
  evidenceTypes?: string[];
  sortBy?: SortOption;
  sortOrder?: 'asc' | 'desc';
  minRedFlagIndex?: number;
  maxRedFlagIndex?: number;
  entityType?: string;
  dataSource?: string;
  includeJunk?: boolean;
}

export type SortOption =
  | 'name'
  | 'mentions'
  | 'red_flag'
  | 'recent'
  | 'risk'
  | 'date-desc'
  | 'date-asc'
  | 'relevance'
  | 'document-count';

export interface SubjectCardDTO {
  id: string;
  name: string;
  role: string;
  shortBio?: string;
  stats: {
    mentions: number;
    documents: number;
    distinctSources: number;
    verifiedMedia: number;
  };
  forensics: {
    riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' | string;
    evidenceLadder: 'L1' | 'L2' | 'L3' | 'NONE';
    redFlagObjective?: number;
    redFlagSubjective?: number;
    signalStrength: {
      exposure: number;
      connectivity: number;
      corroboration: number;
    };
    driverLabels: string[];
  };
  topPreview?: {
    id: string;
    type: 'document' | 'flight_log' | 'black_book' | 'testimony';
    title: string;
    citation: string;
    confidence: number;
    year?: number;
  };
  topPhotoId?: string;
  redFlagRating?: number;
}
