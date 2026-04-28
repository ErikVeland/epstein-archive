export interface GraphNodeDto {
  id: string;
  label: string;
  type: string;
  risk: number;
  connectionCount?: number;
  memberCount?: number;
  community?: number;
}

export interface GraphEdgeDto {
  id?: string;
  source: string;
  target: string;
  type: string;
  weight: number;
  confidence: number;
  classification: string | null;
}

export interface GraphResponseDto {
  nodes: GraphNodeDto[];
  edges: GraphEdgeDto[];
}
