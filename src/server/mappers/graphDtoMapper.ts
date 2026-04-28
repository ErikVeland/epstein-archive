import type { GraphNodeDto, GraphEdgeDto, GraphResponseDto } from '@shared/dto/graph';

interface GraphNodeRowInput {
  id?: unknown;
  label?: unknown;
  name?: unknown;
  type?: unknown;
  risk?: unknown;
  red_flag_rating?: unknown;
  connectionCount?: unknown;
  connection_count?: unknown;
  memberCount?: unknown;
  member_count?: unknown;
  community?: unknown;
}

interface GraphEdgeRowInput {
  id?: unknown;
  source?: unknown;
  target?: unknown;
  type?: unknown;
  weight?: unknown;
  confidence?: unknown;
  classification?: unknown;
}

interface GraphResponseRowInput {
  nodes?: GraphNodeRowInput[];
  edges?: GraphEdgeRowInput[];
}

export const mapGraphNodeDto = (row: GraphNodeRowInput): GraphNodeDto => {
  const node: GraphNodeDto = {
    id: row.id != null ? String(row.id) : '0',
    label: String(row.label ?? row.name ?? ''),
    type: String(row.type ?? 'Person'),
    risk: Number(row.risk ?? row.red_flag_rating ?? 0),
  };

  const connectionCount = row.connectionCount ?? row.connection_count;
  if (connectionCount != null) {
    node.connectionCount = Number(connectionCount);
  }

  const memberCount = row.memberCount ?? row.member_count;
  if (memberCount != null) {
    node.memberCount = Number(memberCount);
  }

  if (row.community != null) {
    node.community = Number(row.community);
  }

  return node;
};

export const mapGraphEdgeDto = (row: GraphEdgeRowInput): GraphEdgeDto => ({
  id: row.id ? String(row.id) : undefined,
  source: String(row.source),
  target: String(row.target),
  type: String(row.type ?? 'related'),
  weight: Number(row.weight ?? row.confidence ?? 1),
  confidence: Number(row.confidence ?? row.weight ?? 0.5),
  classification: typeof row.classification === 'string' ? row.classification : null,
});

export const mapGraphResponseDto = (data: GraphResponseRowInput): GraphResponseDto => ({
  nodes: Array.isArray(data.nodes) ? data.nodes.map(mapGraphNodeDto) : [],
  edges: Array.isArray(data.edges) ? data.edges.map(mapGraphEdgeDto) : [],
});
