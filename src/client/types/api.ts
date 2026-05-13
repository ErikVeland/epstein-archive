export type SeoSchema = Record<string, unknown> | Array<Record<string, unknown>>;

export interface SeoConfig {
  title: string;
  description: string;
  url: string;
  canonical: string;
  type: 'CollectionPage' | 'Dataset' | 'article' | 'website';
  keywords: string[];
  schema?: SeoSchema;
}
export interface GlobalStatsPayload {
  totalEntities: number;
  totalDocuments: number;
  totalMentions: number;
  likelihoodDistribution: Array<{ level: string; count: number }>;
  pipeline_status?: {
    datasets?: Array<{
      name: string;
      target: number;
      ingested: number;
      downloaded: number;
    }>;
    eta_minutes?: number;
    throughput_docs_sec?: number;
    active_workers?: number;
    remaining_docs?: number;
    stage_status?: Record<string, Record<string, number | string | null>>;
    ai_artifacts?: {
      total: number;
      reviewed: number;
    };
    media?: {
      total: number;
      processed: number;
      percent: number;
    };
    current_run?: {
      id: number;
      status: string;
      control_signal: string | null;
    } | null;
    exo?: {
      host: string;
      model: string;
    };
  };
}

export interface SearchDocumentPayload {
  id: string | number;
  title?: string;
  fileName?: string;
  filePath?: string;
  snippet?: string;
  evidenceType?: string;
  matchReason?: string;
  score?: number;
}

export interface SearchResponsePayload {
  entities: Array<Record<string, unknown>>;
  documents: SearchDocumentPayload[];
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

export interface EntityConnectionSignal {
  relationship: { score: number; type: string | null; confidence: number | null };
  financial: { score: number; count: number };
  communications: { score: number; count: number };
  flights: { score: number; count: number };
  documents: { score: number; count: number };
}

export interface EntityConnection {
  entityId: string;
  entityName: string;
  entityType: string;
  riskRating: number;
  communityId: number | null;
  totalScore: number;
  signals: EntityConnectionSignal;
}

export interface EntityConnectionsResponse {
  connections: EntityConnection[];
  totalCount: number;
}

export interface EntityByIdResponse {
  id: number;
  fullName?: string;
  name?: string;
  primaryRole?: string;
  mention_count?: number;
  mentions?: number;
  redFlagRating?: number;
  documentCount?: number;
  document_count?: number;
  evidenceTypes?: string[];
  likelihoodLevel?: string;
  bio?: string;
  description?: string;
  birthDate?: string;
  deathDate?: string;
  photos?: Array<Record<string, unknown>>;
  blackBookEntry?: Array<Record<string, unknown>>;
  entityType?: string;
  type?: string;
  redFlagDescription?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type?: string;
  risk?: number;
  connectionCount?: number;
}

export interface GraphRelationship {
  source: string;
  target: string;
  type?: string;
  weight?: number;
  confidence?: number;
  classification?: string;
  signalType?: string;
}

export interface GlobalGraphResponse {
  nodes: GraphNode[];
  edges: GraphRelationship[];
}
