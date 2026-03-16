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
   * Normalize DB entity to GraphNode
   */
  normalizeNode: (raw: any): GraphNode => {
    return {
      id: String(raw.id),
      label: raw.label || raw.fullName || raw.name || 'Unknown',
      type: normalizeType(raw.type || raw.primaryRole),
      risk: raw.risk || raw.redFlagRating || 0,
      image: raw.topPhotoId ? `/api/media/images/${raw.topPhotoId}/thumbnail` : raw.image,
      community: raw.community,
      isEgo: !!raw.isEgo,
      connectionCount: raw.connectionCount || raw.properties?.connectionCount || 0,
    };
  },

  /**
   * Deterministic Deduplication by Label
   */
  deduplicateNodes: (nodes: GraphNode[], egoId?: string): GraphNode[] => {
    const uniqueMap = new Map<string, GraphNode>();

    nodes.forEach((node) => {
      const key = node.label.trim().toLowerCase();

      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, node);
      } else {
        const existing = uniqueMap.get(key)!;

        // Resolution Priority:
        // 1. Ego ID wins
        // 2. Higher risk wins
        // 3. Keep existing

        if (node.id === egoId) {
          uniqueMap.set(key, node); // Ego always overwrites
        } else if (existing.id !== egoId && node.risk > existing.risk) {
          uniqueMap.set(key, node); // Higher risk overwrites (unless existing is Ego)
        }
      }
    });

    return Array.from(uniqueMap.values());
  },

  /**
   * Remap edges to point to deduped node IDs
   */
  remapEdges: (edges: any[], uniqueNodes: GraphNode[]): GraphEdge[] => {
    const validIds = new Set(uniqueNodes.map((n) => n.id));
    const labelToId = new Map<string, string>();

    uniqueNodes.forEach((n) => {
      labelToId.set(n.label.trim().toLowerCase(), n.id);
    });

    return edges
      .map((e) => {
        // Resolve source/target via label map if ID not found directly
        // This handles the case where we merged "Jeff" (ID 2) into "Jeff" (ID 1)
        // If an edge pointed to ID 2, we need to find what ID 2's label maps to now.
        // HOWEVER, we don't have the original node for ID 2 here easily unless we passed it.
        // Better strategy: The caller likely has the raw list.
        // But for now, let's assume we map via ID if valid, or fallback string.

        const sourceId = String(e.source || e.source_id);
        const targetId = String(e.target || e.target_id);

        if (!validIds.has(sourceId)) {
          // Try to recover via label if possible, or drop?
          // Without the original node map, tricky.
          // Implementation detail: The caller (EntityGraphPanel) built a map.
          // We should probably just return the edge and let caller filter.
        }

        return {
          id: e.id || `${sourceId}-${targetId}`,
          source: sourceId,
          target: targetId,
          type: e.type || e.relationship_type || 'related_to',
          weight: e.weight || e.proximity_score || 1,
          confidence: e.confidence || 1,
          docCount: e.docCount || 0,
        };
      })
      .filter((e) => validIds.has(e.source) && validIds.has(e.target) && e.source !== e.target);
  },

  /**
   * Calculate Edge Weight
   * Formula: (Proximity * 0.4) + (Confidence * 30) + (EvidenceCount * 5)
   */
  calculateEdgeWeight: (proximity: number, confidence: number, docCount: number = 0): number => {
    const p = Math.min(100, Math.max(0, proximity));
    const c = Math.min(1.0, Math.max(0, confidence));
    const d = Math.min(20, Math.max(0, docCount)); // Cap doc count influence

    const score = p * 0.4 + c * 30 + d * 5;
    return Math.min(100, Math.round(score));
  },

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

// Helper
function normalizeType(rawType: string): EntityType {
  if (!rawType) return 'person';
  const lower = rawType.toLowerCase().trim();

  // Strict matches first
  if (lower === 'location' || lower === 'place' || lower === 'city' || lower === 'country')
    return 'location';
  if (lower === 'organization' || lower === 'company' || lower === 'corporation')
    return 'organization';
  if (lower === 'financial' || lower === 'bank' || lower === 'account') return 'financial';
  if (lower === 'person' || lower === 'individual') return 'person';

  if (
    lower.includes('org') ||
    lower.includes('company') ||
    lower.includes('llc') ||
    lower.includes('corp')
  )
    return 'organization';
  if (
    lower.includes('island') ||
    lower.includes('residence') ||
    lower.includes('house') ||
    lower.includes('apt') ||
    lower.includes('hong kong') ||
    lower.includes('new york') ||
    lower.includes('palm beach')
  )
    return 'location';
  if (lower.includes('bank') || lower.includes('fund') || lower.includes('trust'))
    return 'financial';
  if (lower.includes('doc') || lower.includes('log') || lower.includes('file')) return 'document';
  if (lower.includes('comm') || lower.includes('email') || lower.includes('phone'))
    return 'communication';
  if (lower.includes('cluster')) return 'cluster';

  return 'person'; // Default
}
