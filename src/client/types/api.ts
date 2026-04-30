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
  };
}

export interface SearchDocumentPayload {
  id: string | number;
  title?: string;
  fileName?: string;
  snippet?: string;
  evidenceType?: string;
}

export interface SearchResponsePayload {
  entities: Array<Record<string, unknown>>;
  documents: SearchDocumentPayload[];
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
