import type { ProvenanceDto } from './provenance';

export interface EntityMentionEvidenceDto extends ProvenanceDto {
  id: string | number | null;
  documentId: string | number | null;
  evidenceType: string;
  title: string;
  sourcePath: string;
  contentPreview: string;
  redFlagRating: number;
  confidence: number;
  role: string;
  flags: Array<{ type: string; severity: string | null }>;
}

export interface EntityEvidenceResponseDto {
  entity: {
    id: string;
    fullName: string;
    primaryRole: string;
    entityCategory: string;
    riskLevel: string;
    redFlagRating: number;
    birthDate: string | null;
    deathDate: string | null;
  };
  evidence: EntityMentionEvidenceDto[];
  stats: {
    totalEvidence: number;
    typeBreakdown: Array<{ evidenceType: string; count: number }>;
    roleBreakdown: Array<{ role: string; count: number }>;
    relatedEntities: Array<{
      id: number;
      fullName: string;
      entityCategory: string;
      sharedEvidenceCount: number;
    }>;
    highRiskCount: number;
    averageConfidence: number;
  };
}

export interface EntityRelationEvidenceDto extends ProvenanceDto {
  id: string | number;
  sourceId: string | number;
  targetId: string | number;
  relationshipType: string;
  confidence: number;
  riskScore: number;
  firstSeen: string | null;
  lastSeen: string | null;
  sourceName?: string;
  targetName?: string;
  document_id?: string | number | null;
  span_id?: string | number | null;
  quote_text?: string | null;
  mention_ids?: unknown;
  document_title?: string | null;
  document_path?: string | null;
}
