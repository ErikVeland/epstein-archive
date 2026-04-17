export interface ForensicSignal {
  id: string;
  type: string;
  confidence: number;
  riskScore: number;
  metadata: Record<string, unknown>;
  entities: string[];
}

export interface Document {
  id: string;
  filename?: string;
  title: string;
  content: string;
  contentPreview?: string;
  previewText?: string;
  previewKind?: 'excerpt' | 'ai_summary' | 'fallback';
  keyEntities?: string[];
  entitiesCount?: number;
  sourceType?: string;
  whyFlagged?: string;
  fileType: string;
  fileSize: number;
  dateCreated?: string;
  dateModified?: string;
  metadata?: DocumentMetadata;
  entities?: Entity[];
  passages?: Passage[];
  signals?: ForensicSignal[];
  redFlagScore?: number;
  redFlagRating?: number;
  redFlagPeppers?: string;
  redFlagDescription?: string;
  evidenceType?: 'email' | 'legal' | 'deposition' | 'photo' | 'article' | 'document';
  parentDocumentId?: string;
  threadId?: string;
  threadPosition?: number;
  cleanedPath?: string;
  originalFilePath?: string;
  parentId?: string;
  startOffset?: number;
  endOffset?: number;
  childDocuments?: Array<Record<string, unknown>>;
  collectionId?: string;
}

export interface TechnicalMetadata {
  producer?: string;
  creator?: string;
  softwareVersion?: string;
  modifyDate?: string;
  createDate?: string;
  metadataDate?: string;
  cameraMake?: string;
  cameraModel?: string;
  gpsCoordinates?: string;
}

export interface StructureMetadata {
  hasJavascript?: boolean;
  fontCount?: number;
  isTagged?: boolean;
  pdfVersion?: string;
  pageCount?: number;
  attachmentCount?: number;
  incrementalUpdates?: number;
}

export interface LinguisticMetadata {
  readingLevel?: number; // Flesch-Kincaid Grade Level
  sentiment?: 'positive' | 'negative' | 'neutral';
  sentimentScore?: number; // -1 to 1
  wordCount?: number;
  uniqueWordCount?: number;
  ttr?: number; // Type-Token Ratio
}

export interface TemporalMetadata {
  estimatedTimezone?: string;
  isBusinessHours?: boolean;
  dayOfWeek?: string;
}

export interface NetworkMetadata {
  entityDensity?: number;
  riskScore?: number;
  coOccurrenceRisk?: number;
}

export interface DocumentMetadata {
  author?: string;
  recipient?: string;
  subject?: string;
  emailThread?: string;
  flightNumber?: string;
  flightDate?: string;
  flightFrom?: string;
  flightTo?: string;
  legalCase?: string;
  testimonyDate?: string;
  depositionDate?: string;
  tags: string[];
  categories: string[];
  confidentiality: 'public' | 'confidential' | 'sealed' | 'classified';
  source: string;
  source_collection?: string;
  source_original_url?: string;
  credibility_score?: number;
  sensitivity_flags?: string[];

  // Email metadata
  emailHeaders?: {
    from?: string;
    to?: string;
    cc?: string;
    subject?: string;
    sentDate?: string;
    attachmentCount?: number;
  };

  // Forensic Metadata
  technical?: TechnicalMetadata;
  structure?: StructureMetadata;
  linguistics?: LinguisticMetadata;
  temporal?: TemporalMetadata;
  network?: NetworkMetadata;
}

export interface Entity {
  name: string;
  type: 'person' | 'organization' | 'location' | 'email' | 'phone' | 'address' | 'date' | 'amount';
  mentions: number;
  contexts: EntityContext[];
  significance: 'high' | 'medium' | 'low';
  relatedEntities: string[];
}

export interface EntityContext {
  passage: string;
  context: string;
  position: number;
  file: string;
  date?: string;
  significance: 'high' | 'medium' | 'low';
  source?: string;
}

export interface Passage {
  id: string;
  content: string;
  context: string;
  keywords: string[];
  entities: string[];
  redFlagLevel: number;
  significance: 'high' | 'medium' | 'low';
  file: string;
  position: number;
  date?: string;
}

export interface DocumentSearchResult {
  document: Document;
  relevanceScore: number;
  matchingPassages: Passage[];
  matchingEntities: Entity[];
  searchHighlights: SearchHighlight[];
}

export interface SearchHighlight {
  field: string;
  text: string;
  start: number;
  end: number;
}

export interface DocumentCollection {
  documents: Document[];
  entities: Map<string, Entity>;
  totalFiles: number;
  totalSize: number;
  dateRange: {
    earliest?: string;
    latest?: string;
  };
  fileTypes: Map<string, number>;
  categories: Map<string, number>;
}

export interface BrowseFilters {
  fileType?: string[];
  dateRange?: {
    start?: string;
    end?: string;
  };
  entities?: string[];
  categories?: string[];
  redFlagLevel?: {
    min: number;
    max: number;
  };
  confidentiality?: string[];
  source?: string[];
  collections?: string[];
  collectionId?: string;
  includeMedia?: boolean;
  excludedFileTypes?: string[];
}

export interface BrowseOptions {
  filters: BrowseFilters;
  sortBy: 'relevance' | 'date' | 'red_flag' | 'fileType' | 'size';
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
}
