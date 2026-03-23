/**
 * Shared Graph Service
 * Centralizes logic for node normalization, deduplication, scoring, and LOD.
 */

export type EntityType =
  | 'person'
  | 'organization'
  | 'location'
  | 'financial'
  | 'document'
  | 'communication'
  | 'cluster'
  | 'unknown';

export interface GraphNode {
  id: string; // Authorized Canonical ID (string)
  label: string;
  type: EntityType;
  risk: number; // 0-5
  image?: string; // Avatar URL
  community?: number; // Cluster ID
  isEgo?: boolean; // Central node?
  connectionCount?: number; // Degree centrality
  // Visualization props (can be computed)
  color?: string;
  radius?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphEdge {
  id: string; // "source-target"
  source: string;
  target: string;
  type: string; // relationship_type (snake_case)
  weight: number; // 0-100 (visual thickness)
  confidence: number; // 0.0-1.0 (opacity/style)
  docCount?: number; // Number of backing docs
  label?: string; // Display label
}

export interface GraphPayload {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const GraphService = {
  /**
   * Get render style based on zoom level (LOD)
   * Hero Spec Zoom Bands:
   * < 0.5: Clusters Only
   * 0.5 - 1.2: Nodes + Selected Labels
   * 1.2 - 2.5: Detailed Nodes + All Labels
   * > 2.5: Faces + Metadata
   */
  getLodConfig: (zoom: number) => {
    return {
      showEdges: zoom >= 0.4,
      showLabels: zoom >= 0.6,
      showAvatars: zoom >= 1.8,
      showDetails: zoom >= 2.0,
      labelDensity: zoom > 1.2 ? 'high' : 'low',
      opacity: zoom < 0.2 ? 0.3 : zoom < 0.6 ? 0.6 : 1.0,
      zoomLevel: zoom,
    };
  },
  /**
   * Compute Spiral Clustered Layout (Deterministic)
   * Groups nodes by type and arranges them in spirals around type-centers.
   */
  computeSpiralLayout: (
    nodes: GraphNode[],
    width: number = 800,
    height: number = 600,
  ): GraphNode[] => {
    // 1. Group by Type
    const groups = new Map<EntityType, GraphNode[]>();
    nodes.forEach((n) => {
      const type = n.type || 'unknown';
      if (!groups.has(type)) groups.set(type, []);
      groups.get(type)!.push(n);
    });

    const types = Array.from(groups.keys());
    const count = nodes.length;

    // Config based on count
    const rStep = count > 300 ? 8 : count > 200 ? 10 : count > 150 ? 12 : count > 80 ? 14 : 16;
    const clusterRadius = count > 300 ? 50 : count > 200 ? 45 : count > 100 ? 40 : 35;
    const intraClusterScale = count > 300 ? 1.0 : count > 200 ? 0.95 : 0.9;

    // Calculate Cluster Centers (Circle around layout center)
    const centers = new Map<string, { x: number; y: number }>();
    types.forEach((type, i) => {
      const angle = (i / types.length) * 2 * Math.PI;
      centers.set(type, {
        x: width / 2 + Math.cos(angle) * clusterRadius,
        y: height / 2 + Math.sin(angle) * clusterRadius,
      });
    });

    // Assign Positions
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const layoutNodes: GraphNode[] = [];

    groups.forEach((groupNodes, type) => {
      const center = centers.get(type) || { x: width / 2, y: height / 2 };
      groupNodes.forEach((node, i) => {
        const r = rStep * Math.sqrt(i + 1);
        const theta = i * goldenAngle;

        layoutNodes.push({
          ...node,
          // @ts-ignore - x/y added here
          x: center.x + r * Math.cos(theta) * intraClusterScale,
          // @ts-ignore
          y: center.y + r * Math.sin(theta) * intraClusterScale,
          vx: 0,
          vy: 0,
        });
      });
    });

    return layoutNodes;
  },
};
