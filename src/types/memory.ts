// Memory system types

export interface ProvenanceInfo {
  sourceDocument?: string;
  sourceEntity?: number;
  confidenceScore?: number;
  extractionMethod?: string;
  verificationStatus?: 'unverified' | 'verified' | 'partially_verified';
  originalContext?: string;
}

export interface MemoryEntry {
  id: number;
  uuid: string;
  memoryType: 'declarative' | 'episodic' | 'working' | 'procedural';
  content: string;
  metadata?: Record<string, unknown>;
  contextTags?: string[];
  importanceScore: number; // 0.0 to 1.0
  createdAt: string;
  updatedAt: string;
  sourceId?: number;
  sourceType?: string; // 'entity', 'document', 'investigation', etc.
  version: number;
  status: 'active' | 'archived' | 'deprecated';
  qualityScore: number; // 0.0 to 1.0
  provenance?: ProvenanceInfo;
}

export interface CreateMemoryEntryInput {
  uuid?: string;
  memoryType: 'declarative' | 'episodic' | 'working' | 'procedural';
  content: string;
  metadata?: Record<string, unknown>;
  contextTags?: string[];
  importanceScore?: number; // 0.0 to 1.0
  sourceId?: number;
  sourceType?: string;
  provenance?: ProvenanceInfo;
}

export interface UpdateMemoryEntryInput {
  content?: string;
  metadata?: Record<string, unknown>;
  contextTags?: string[];
  importanceScore?: number; // 0.0 to 1.0
  sourceId?: number;
  sourceType?: string;
  status?: 'active' | 'archived' | 'deprecated';
  provenance?: ProvenanceInfo;
}

export interface MemoryRelationship {
  id: number;
  fromMemoryId: number;
  toMemoryId: number;
  relationshipType: string; // 'supports', 'contradicts', 'related_to', 'derived_from', etc.
  strength: number; // 0.0 to 1.0
  createdAt: string;
  updatedAt: string;
}

export interface CreateMemoryRelationshipInput {
  fromMemoryId: number;
  toMemoryId: number;
  relationshipType: string;
  strength?: number; // 0.0 to 1.0
}

export interface MemoryAuditLog {
  id: number;
  memoryEntryId: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ACCESS';
  actor?: string; // User or system component that performed the action
  timestamp: string;
  oldValues?: Record<string, unknown>; // JSON of old values before change
  newValues?: Record<string, unknown>; // JSON of new values after change
  metadata?: Record<string, unknown>; // Additional context about the action
}

export interface CreateMemoryAuditLogInput {
  memoryEntryId: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ACCESS';
  actor?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface MemoryQualityMetrics {
  id: number;
  memoryEntryId: number;
  sourceReliability: number; // 0.0 to 1.0
  evidenceStrength: number; // 0.0 to 1.0
  temporalRelevance: number; // 0.0 to 1.0
  entityConfidence: number; // 0.0 to 1.0
  overallScore: number; // Calculated average
  calculatedAt: string;
}

export interface CreateMemoryQualityMetricsInput {
  memoryEntryId: number;
  sourceReliability: number; // 0.0 to 1.0
  evidenceStrength: number; // 0.0 to 1.0
  temporalRelevance: number; // 0.0 to 1.0
  entityConfidence: number; // 0.0 to 1.0
}

export interface MemorySearchFilters {
  memoryType?: 'declarative' | 'episodic' | 'working' | 'procedural';
  status?: 'active' | 'archived' | 'deprecated';
  searchQuery?: string;
  minImportance?: number;
  maxImportance?: number;
  startDate?: string;
  endDate?: string;
  sourceId?: number;
  sourceType?: string;
  contextTag?: string;
}

export interface MemorySearchResult {
  data: MemoryEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
