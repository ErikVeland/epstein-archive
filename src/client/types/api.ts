// Shared API payload types used across the client.
// Centralised here to avoid inline duplication in App.tsx and other components.

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

export interface LikelihoodBucket {
  level: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  count: number;
}

export interface GlobalStatsPayload {
  totalEntities: number;
  totalMentions: number;
  totalDocuments: number;
  likelihoodDistribution?: LikelihoodBucket[];
}

export interface SearchEntityPayload {
  id: number | string;
  name?: string;
  fullName?: string;
  canonicalName?: string;
  matchedAlias?: string | null;
  primaryRole?: string;
  role?: string;
  mention_count?: number;
  mentions?: number;
  redFlagRating?: number;
  document_count?: number;
  files?: number;
}

export interface SearchResponsePayload {
  entities?: SearchEntityPayload[];
}

export interface EntityByIdResponse {
  id: number;
  fullName?: string;
  primaryRole?: string;
  mentions?: number;
  mention_count?: number;
  redFlagRating?: number;
  documentCount?: number;
  document_count?: number;
  evidenceTypes?: string[];
  likelihoodLevel?: string;
  bio?: string;
  description?: string;
  birthDate?: string;
  deathDate?: string;
  photos?: import('../../types').Person['photos'];
  blackBookEntry?: import('../../types').Person['blackBookEntries'];
  entityType?: string;
  type?: string;
  redFlagDescription?: string;
}
