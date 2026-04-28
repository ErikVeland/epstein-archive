export interface RelationshipDto {
  entityId: string;
  relatedEntityId: string;
  relationshipType: string;
  strength: number;
  confidence: number;
  weight: number;
  riskScore: number;
  metadata?: Record<string, unknown>;
}

export interface RelationshipListResponseDto {
  relationships: RelationshipDto[];
}
