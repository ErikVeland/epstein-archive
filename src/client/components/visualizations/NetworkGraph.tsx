import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { GraphService, GraphNode as ServiceGraphNode } from '../../services/GraphService';
import { ZoomIn, ZoomOut, Move, RefreshCw, AlertTriangle, Link2, Filter } from 'lucide-react';
import { Semaphore } from '../../utils/semaphore';

const avatarSemaphore = new Semaphore(2);

interface EntityNode {
  id: string | number;
  name: string;
  role?: string;
  type?: string;
  riskLevel?: number;
  risk?: number;
  connectionCount: number;
  mentions?: number;
  photoUrl?: string;
}

interface Relationship {
  sourceId: string | number;
  targetId: string | number;
  source: string;
  target: string;
  type?: string;
  weight?: number;
  confidence?: number;
  classification?: 'EVIDENCE_BACKED' | 'INFERRED';
}

interface NetworkGraphProps {
  entities: EntityNode[];
  relationships: Relationship[];
  onEntityClick?: (entity: EntityNode) => void;
  maxNodes?: number;
  onZoomLevelChange?: (zoom: number) => void;
  onFilterUpdate?: (stats: { visible: number; total: number; label: string }) => void;
  onEdgeClick?: (edge: Relationship) => void;
  nodeRiskActions?: React.ReactNode;
}

interface Point {
  x: number;
  y: number;
}

interface GraphNode extends ServiceGraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  connectionCount: number;
  photoUrl?: string;
}

// Risk-based colors with better visibility
const getRiskColor = (riskLevel: number): string => {
  if (riskLevel >= 5) return '#a855f7'; // Purple - Critical
  if (riskLevel >= 4) return '#ef4444'; // Red - High
  if (riskLevel >= 3) return '#f59e0b'; // Amber - Medium
  if (riskLevel >= 2) return '#3b82f6'; // Blue - Low
  return '#10b981'; // Green - Minimal
};

const getNodeSize = (connectionCount: number, maxConnections: number): number => {
  const minSize = 2;
  const maxSize = 8;
  const ratio = connectionCount / Math.max(maxConnections, 1);
  return minSize + (maxSize - minSize) * Math.sqrt(ratio);
};

// Simple collision resolution for main thread (small datasets)
const applyCollisionResolution = (
  nodes: GraphNode[],
  draggedNode: string | number | null,
  forceFactor: number = 0.1,
): GraphNode[] => {
  const newNodes = nodes.map((n) => ({ ...n }));

  for (let i = 0; i < newNodes.length; i++) {
    const node = newNodes[i];
    if (node.id === draggedNode) continue;

    for (let j = 0; j < newNodes.length; j++) {
      if (i === j) continue;
      const other = newNodes[j];
      const dx = node.x - other.x;
      const dy = node.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = (node.radius / 2 + other.radius / 2) * 1.5;

      if (dist < minDist && dist > 0) {
        const overlap = minDist - dist;
        const moveX = (dx / dist) * overlap * forceFactor;
        const moveY = (dy / dist) * overlap * forceFactor;

        node.x += moveX;
        node.y += moveY;
      }
    }
  }
  return newNodes;
};

export const NetworkGraph: React.FC<NetworkGraphProps> = ({
  entities,
  relationships,
  onEntityClick,
  maxNodes = 200,
  onZoomLevelChange,
  onFilterUpdate,
  onEdgeClick,
  nodeRiskActions,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [transform, setTransform] = useState({ x: 50, y: 50, k: 1.0 }); // Start centered at 50,50 for 100x100 viewBox
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState<string | number | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | number | null>(null);

  // Debounced Zoom Callback
  const zoomTimeoutRef = useRef<NodeJS.Timeout>();
  const reportZoomLevel = useCallback(
    (k: number) => {
      if (onZoomLevelChange) {
        if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
        zoomTimeoutRef.current = setTimeout(() => {
          onZoomLevelChange(k);
        }, 500);
      }
    },
    [onZoomLevelChange],
  );

  const [modifierKeyPressed, setModifierKeyPressed] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [totalDragDistance, setTotalDragDistance] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const useWorkerRef = useRef(false);
  const [extraNodes, setExtraNodes] = useState<EntityNode[]>([]);
  const [extraRelationships, setExtraRelationships] = useState<Relationship[]>([]);
  const [isExpanding, setIsExpanding] = useState(false);

  // Filter state
  const [minSeverity, setMinSeverity] = useState(0);
  const [minConnections, setMinConnections] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [hasInteractedWithFilter, setHasInteractedWithFilter] = useState(false);
  const [excludedRelTypes, setExcludedRelTypes] = useState<Set<string>>(new Set());

  // Track avatar fetch status
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});
  const blobUrlsRef = React.useRef<Set<string>>(new Set());

  // Revoke all blob URLs on unmount to prevent memory leaks
  React.useEffect(() => {
    const blobUrls = blobUrlsRef.current;
    return () => {
      blobUrls.forEach((url) => URL.revokeObjectURL(url));
      blobUrls.clear();
    };
  }, []);

  // Level of Detail (LOD) based on zoom level
  const lod = useMemo(() => GraphService.getLodConfig(transform.k), [transform.k]);

  // Track modifier keys (Shift or Alt for forced node dragging) and Space for pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey || e.altKey) setModifierKeyPressed(true);
      if (e.key === ' ') {
        e.preventDefault();
        setSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.shiftKey && !e.altKey) setModifierKeyPressed(false);
      if (e.key === ' ') setSpacePressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [transform, reportZoomLevel]);

  // Compute max values for sliders
  const maxSeverityInData = useMemo(
    () => Math.max(1, ...entities.map((e) => e.riskLevel || e.risk || 0)),
    [entities],
  );
  const maxConnectionsInData = useMemo(
    () => Math.max(1, ...entities.map((e) => e.connectionCount)),
    [entities],
  );

  const availableRelTypes = useMemo(() => {
    const types = new Set<string>();
    relationships.forEach((r) => {
      if (r.type) types.add(r.type);
    });
    return Array.from(types).sort();
  }, [relationships]);

  // Initialize nodes with Clustered Spiral Layout via GraphService
  useEffect(() => {
    // Backend API already handles dedup and normalization. We just need to ensure
    // properties needed by the visualization are present.
    const preNormalizedNodes = [...entities, ...extraNodes].map((e) => {
      const node = e as unknown as {
        risk?: number;
        label?: string;
        primaryRole?: string;
        image?: string;
        isEgo?: boolean;
      };
      return {
        id: String(e.id),
        label: String(e.name || node.label || 'Unknown'),
        type: e.type || node.primaryRole || 'person',
        risk: e.riskLevel || node.risk || e.risk || 0,
        connectionCount: e.connectionCount || 0,
        photoUrl: e.photoUrl || node.image,
        isEgo: node.isEgo || false,
      };
    }) as unknown as GraphNode[];

    // Sort logic
    const uniqueNodes = preNormalizedNodes
      .sort((a, b) => b.risk - a.risk || (b.connectionCount || 0) - (a.connectionCount || 0))
      .slice(0, maxNodes);

    // 2. Compute Layout (Deterministic)
    // Use 100x100 space to match SVG viewBox
    const layoutNodes = GraphService.computeSpiralLayout(uniqueNodes, 100, 100).map((n) => {
      // @ts-ignore - computeSpiralLayout adds x/y but typescript doesn't see it on ServiceGraphNode yet
      return {
        ...n,
        x: n.x || 0,
        y: n.y || 0,
        vx: 0,
        vy: 0,
        radius: getNodeSize(n.connectionCount || 0, 100) / 4, // Scale radius for 100x100 space
        connectionCount: n.connectionCount || 0,
      } as GraphNode;
    });

    setNodes(layoutNodes);
    useWorkerRef.current = layoutNodes.length > 40;
  }, [entities, maxNodes, extraNodes]);

  // Filtered nodes based on sliders
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => (n.risk || 0) >= minSeverity && n.connectionCount >= minConnections);
  }, [nodes, minSeverity, minConnections]);

  // Update parent with filter stats
  useEffect(() => {
    if (onFilterUpdate) {
      const total = nodes.length;
      const visible = filteredNodes.length;
      let label = `Showing ${visible} of ${total} Nodes`;

      if (minSeverity > 0) label += ` • Min Severity: ${minSeverity}`;
      if (minConnections > 0) label += ` • Min Conn: ${minConnections}`;

      onFilterUpdate({ visible, total, label });
    }
  }, [filteredNodes.length, nodes.length, minSeverity, minConnections, onFilterUpdate]);

  // Filtered links based on filtered nodes and excluded relationship types
  const links = useMemo(() => {
    const allRelationships = [...relationships, ...extraRelationships];
    if (filteredNodes.length === 0) return [];

    const nodeMap = new Map<string, GraphNode>();
    filteredNodes.forEach((n) => {
      nodeMap.set(String(n.id), n);
    });

    const maxWeight = Math.max(1, ...allRelationships.map((r) => r.weight || 1));

    return allRelationships
      .filter((r) => nodeMap.has(String(r.sourceId)) && nodeMap.has(String(r.targetId)))
      .filter((r) => !excludedRelTypes.has(r.type || ''))
      .map((r) => ({
        source: nodeMap.get(String(r.sourceId))!,
        target: nodeMap.get(String(r.targetId))!,
        type: r.type,
        weight: r.weight || 0.1,
        confidence: r.confidence || 1.0,
        classification: r.classification,
        normalizedWeight: (r.weight || 0.1) / maxWeight,
      }))
      .slice(0, 500);
  }, [filteredNodes, relationships, extraRelationships, excludedRelTypes]);

  // High-performance Label Collision Management (Grid-based approximation of Quadtree)
  const visibleLabels = useMemo(() => {
    const importantLabels = new Set<string | number>();
    if (selectedNodeId !== null) importantLabels.add(selectedNodeId);
    if (hoveredNode) {
      const hovered = filteredNodes.find((n) => n.label === hoveredNode);
      if (hovered) importantLabels.add(hovered.id);
    }

    if (!lod.showLabels) return importantLabels;

    const visible = new Set<string | number>();
    const collisionGrid = new Set<string>();

    // Cell size determines label density. Adjust based on zoom for semantic density.
    // 100x100 viewBox. cellSize 10 means 100 cells.
    const cellSize = lod.labelDensity === 'high' ? 3 / transform.k : 6 / transform.k;

    // Sort by importance: Selected > Hovered > Ego > Risk > Degree
    const sortedNodes = [...filteredNodes].sort((a, b) => {
      if (String(a.id) === String(selectedNodeId)) return -1;
      if (String(b.id) === String(selectedNodeId)) return 1;
      if (a.label === hoveredNode) return -1;
      if (b.label === hoveredNode) return 1;
      if (a.isEgo !== b.isEgo) return a.isEgo ? -1 : 1;
      if (a.risk !== b.risk) return (b.risk || 0) - (a.risk || 0);
      return (b.connectionCount || 0) - (a.connectionCount || 0);
    });

    for (const node of sortedNodes) {
      if (String(node.id) === String(selectedNodeId) || node.label === hoveredNode) {
        visible.add(node.id);
        continue;
      }

      // Semantic suppression at low density - High Risk always wins
      if (lod.labelDensity === 'low' && !node.isEgo && (node.risk || 0) < 3.5) continue;

      const gridX = Math.floor(node.x / cellSize);
      const gridY = Math.floor(node.y / cellSize);
      const key = `${gridX},${gridY}`;

      if (!collisionGrid.has(key)) {
        collisionGrid.add(key);
        visible.add(node.id);
      }
    }
    importantLabels.forEach((id) => visible.add(id));
    return visible;
  }, [filteredNodes, lod, transform.k, selectedNodeId, hoveredNode]);

  const labelFontSize = useMemo(() => {
    if (transform.k < 0.8) return 1.05;
    if (transform.k < 1.4) return 1.2;
    if (transform.k < 2.2) return 1.4;
    return 1.6;
  }, [transform.k]);

  // Avatar Fetch Policy
  useEffect(() => {
    // Only process fetching logic when zoom is deep or interactively hovering/selecting
    if (transform.k <= 1.8 && !hoveredNode && !selectedNodeId) return;

    const minX = -transform.x / transform.k;
    const maxX = (100 - transform.x) / transform.k;
    const minY = -transform.y / transform.k;
    const maxY = (100 - transform.y) / transform.k;

    const visibleNodes = filteredNodes.filter(
      (n) => n.x >= minX - 10 && n.x <= maxX + 10 && n.y >= minY - 10 && n.y <= maxY + 10,
    );

    const vips = [...visibleNodes]
      .sort(
        (a, b) =>
          (b.risk || 0) + (b.connectionCount || 0) - ((a.risk || 0) + (a.connectionCount || 0)),
      )
      .slice(0, 20);
    const vipSet = new Set(vips.map((v) => String(v.id)));

    const eligible = filteredNodes.filter((n) => {
      if (avatarUrls[n.id] !== undefined) return false;
      if (String(n.id) === String(selectedNodeId)) return true;
      if (n.label === hoveredNode) return true;
      if (transform.k > 1.8 && vipSet.has(String(n.id))) return true;
      return false;
    });

    eligible.forEach(async (node) => {
      const url = node.photoUrl || node.image || `/api/entities/${node.id}/media`;
      setAvatarUrls((prev) => ({ ...prev, [node.id]: 'pending' }));

      const release = await avatarSemaphore.acquire();
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Fetch failed');
        const blob = await res.blob();
        if (blob.size < 100) throw new Error('Too small');
        const objectUrl = URL.createObjectURL(blob);
        blobUrlsRef.current.add(objectUrl);
        setAvatarUrls((prev) => {
          const old = prev[node.id];
          if (old && old.startsWith('blob:')) {
            URL.revokeObjectURL(old);
            blobUrlsRef.current.delete(old);
          }
          return { ...prev, [node.id]: objectUrl };
        });
      } catch {
        setAvatarUrls((prev) => ({ ...prev, [node.id]: 'error' }));
      } finally {
        release();
      }
    });
  }, [
    filteredNodes,
    transform.k,
    hoveredNode,
    selectedNodeId,
    transform.x,
    transform.y,
    avatarUrls,
  ]);

  // Physics simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    if (useWorkerRef.current && typeof Worker !== 'undefined') {
      try {
        workerRef.current = new Worker(
          new URL('../../workers/networkGraph.worker.ts', import.meta.url),
          { type: 'module' },
        );

        workerRef.current.onmessage = (e) => {
          if (e.data.type === 'nodes' && e.data.nodes) {
            setNodes(e.data.nodes);
          }
        };

        workerRef.current.postMessage({ type: 'init', nodes });

        return () => {
          workerRef.current?.postMessage({ type: 'stop' });
          workerRef.current?.terminate();
          workerRef.current = null;
        };
      } catch (e) {
        console.warn('Web Worker failed, using main thread:', e);
        useWorkerRef.current = false;
      }
    }

    let tickCount = 0;
    const maxTicks = 200; // Increased from 60 for smoother settlement

    const tick = () => {
      if (tickCount >= maxTicks) return;
      // Exponential decay of collision force
      const forceFactor = 0.15 * Math.exp(-tickCount / 50);
      setNodes((prevNodes) => applyCollisionResolution(prevNodes, draggedNode, forceFactor));
      tickCount++;
    };

    const interval = setInterval(tick, 33);
    const timeout = setTimeout(() => clearInterval(interval), 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nodes is used but nodes.length prevents unnecessary re-runs
  }, [nodes.length, draggedNode]);

  // Update worker when node is dragged
  useEffect(() => {
    if (workerRef.current && draggedNode !== null) {
      const node = nodes.find((n) => n.id === draggedNode);
      if (node) {
        workerRef.current.postMessage({
          type: 'updateNode',
          nodeUpdate: { id: node.id, x: node.x, y: node.y },
          draggedNodeId: draggedNode,
        });
      }
    }
  }, [draggedNode, nodes]);

  // Find nearest node to a point (for modifier key drag)
  const findNearestNode = useCallback(
    (clientX: number, clientY: number): GraphNode | null => {
      if (!svgRef.current || filteredNodes.length === 0) return null;

      const rect = svgRef.current.getBoundingClientRect();
      const svgX = (((clientX - rect.left) / rect.width) * 100 - transform.x) / transform.k;
      const svgY = (((clientY - rect.top) / rect.height) * 100 - transform.y) / transform.k;

      let nearest: GraphNode | null = null;
      let minDist = Infinity;

      for (const node of filteredNodes) {
        const dx = node.x - svgX;
        const dy = node.y - svgY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          nearest = node;
        }
      }

      return nearest;
    },
    [filteredNodes, transform],
  );

  // Pan/Zoom handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!svgRef.current) return;

    const scaleFactor = 1.1;
    const direction = e.deltaY < 0 ? 1 : -1;
    const factor = direction > 0 ? scaleFactor : 1 / scaleFactor;

    const newK = Math.max(0.2, Math.min(5, transform.k * factor));

    const rect = svgRef.current.getBoundingClientRect();
    // Calculate cursor position in viewBox units (0-100)
    const relX = ((e.clientX - rect.left) / rect.width) * 100;
    const relY = ((e.clientY - rect.top) / rect.height) * 100;

    // Zoom anchored to cursor
    const newX = relX - (relX - transform.x) * (newK / transform.k);
    const newY = relY - (relY - transform.y) * (newK / transform.k);

    setTransform({ x: newX, y: newY, k: newK });
    reportZoomLevel(newK);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;

    setTotalDragDistance(0);

    // Space key = Pan mode
    if (spacePressed) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Modifier key = Drag node mode
    if (modifierKeyPressed) {
      const nearest = findNearestNode(e.clientX, e.clientY);
      if (nearest) {
        setDraggedNode(nearest.id);
        setDragStart({ x: e.clientX, y: e.clientY });
        return;
      }
    }

    // Default - start pan, but check for node click later
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedNode !== null) {
      const dx = (e.clientX - dragStart.x) / transform.k;
      const dy = (e.clientY - dragStart.y) / transform.k;

      const svgWidth = svgRef.current?.getBoundingClientRect().width || 1;
      const scaleToUnits = 100 / svgWidth;

      // Accumulate drag distance
      setTotalDragDistance((prev) => prev + Math.abs(dx) + Math.abs(dy));

      setNodes((prev) =>
        prev.map((n) => {
          if (n.id === draggedNode) {
            return {
              ...n,
              x: n.x + dx * scaleToUnits,
              y: n.y + dy * scaleToUnits,
            };
          }
          return n;
        }),
      );
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isDragging) {
      const svgWidth = svgRef.current?.getBoundingClientRect().width || 1;
      const scaleToUnits = 100 / svgWidth;

      const dx = (e.clientX - dragStart.x) * scaleToUnits;
      const dy = (e.clientY - dragStart.y) * scaleToUnits;

      setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedNode(null);
  };

  const zoomFromCenter = (factor: number) => {
    const newK = Math.max(0.2, Math.min(5, transform.k * factor));
    const center = 50;
    const newX = center - (center - transform.x) * (newK / transform.k);
    const newY = center - (center - transform.y) * (newK / transform.k);
    setTransform({ x: newX, y: newY, k: newK });
  };

  const zoomIn = () => zoomFromCenter(1.2);
  const zoomOut = () => zoomFromCenter(1 / 1.2);
  const resetView = () => setTransform({ x: 50, y: 50, k: 1.0 });

  const handleExpandNode = async (entityId: number | string) => {
    try {
      setIsExpanding(true);
      const response = await fetch(`/api/entities/${entityId}/graph?depth=1`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch graph slice');
      const data = await response.json();

      if (data.nodes && data.edges) {
        // Adapt backend nodes to internal format
        const newNodes: EntityNode[] = data.nodes.map((n: Record<string, unknown>) => ({
          id: n.id as string | number,
          name: n.label as string,
          type: (n.type as string | undefined) || 'person',
          connectionCount: ((n.relationships as unknown[]) || []).length,
        }));

        // Adapt backend edges to internal format
        const newRels: Relationship[] = data.edges.map((e: Record<string, unknown>) => ({
          sourceId: e.source_id as string | number,
          targetId: e.target_id as string | number,
          source: '', // Names not strictly needed since we use IDs now
          target: '',
          type: e.relationship_type as string | undefined,
          weight: (e.proximity_score as number | undefined) || 1,
        }));

        setExtraNodes((prev) => {
          const existing = new Set(prev.map((n) => String(n.id)));
          const fresh = newNodes.filter((n) => !existing.has(String(n.id)));
          return [...prev, ...fresh];
        });

        setExtraRelationships((prev) => [...prev, ...newRels]);
      }
    } catch (err) {
      console.error('Error expanding node:', err);
    } finally {
      setIsExpanding(false);
    }
  };

  const selectedNode = useMemo(
    () =>
      selectedNodeId !== null
        ? filteredNodes.find((n) => String(n.id) === String(selectedNodeId)) || null
        : null,
    [filteredNodes, selectedNodeId],
  );

  return (
    <div
      className={`relative w-full h-full min-h-[420px] bg-[var(--glass-bg-strong)]/50 rounded-[var(--radius-lg)] border border-[var(--glass-border)] overflow-hidden select-none ${spacePressed ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={zoomIn}
          className="p-2 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] border border-[var(--glass-border)] text-[var(--text-secondary)]"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={zoomOut}
          className="p-2 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] border border-[var(--glass-border)] text-[var(--text-secondary)]"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={resetView}
          className="p-2 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] border border-[var(--glass-border)] text-[var(--text-secondary)]"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            setShowFilters(!showFilters);
            setHasInteractedWithFilter(true);
          }}
          className={`p-2 rounded-[var(--radius-lg)] border text-[var(--text-secondary)] relative ${showFilters ? 'bg-cyan-700 border-[var(--accent)]' : 'bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-highlight)] border-[var(--glass-border)]'}`}
        >
          <Filter className="w-5 h-5" />
          {!hasInteractedWithFilter && !showFilters && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--accent)] rounded-full animate-ping" />
          )}
          {!hasInteractedWithFilter && !showFilters && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--accent)] rounded-full" />
          )}
        </button>
      </div>

      {/* Hover Tooltip */}
      {hoveredNode && !isDragging && (
        <div
          className="absolute z-30 pointer-events-none bg-[var(--glass-bg-strong)]/95 text-[var(--text-primary)] text-[10px] px-2 py-1 rounded border border-[var(--accent)]/50 shadow-[0_0_15px_rgba(6,182,212,0.3)] whitespace-nowrap backdrop-blur-md"
          style={{
            left: `${(nodes.find((n) => n.label === hoveredNode)?.x || 0) * transform.k + transform.x}%`,
            top: `${(nodes.find((n) => n.label === hoveredNode)?.y || 0) * transform.k + transform.y - 2}%`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-[var(--accent)]">{hoveredNode}</span>
            <span className="text-[8px] text-[var(--text-muted)] uppercase tracking-tighter">
              {nodes.find((n) => n.label === hoveredNode)?.type || 'Entity'}
            </span>
          </div>
        </div>
      )}
      {/* Filter Panel */}
      {showFilters && (
        <div className="absolute top-4 right-16 z-20 bg-[var(--glass-bg)]/95 backdrop-blur-sm rounded-[var(--radius-lg)] p-4 border border-[var(--glass-border)] shadow-[var(--glass-shadow)] w-64">
          <p className="text-xs text-[var(--text-muted)] mb-3 font-bold uppercase tracking-wider flex items-center gap-2">
            <Filter className="w-3 h-3" /> Node Filters
          </p>

          <div className="space-y-4">
            {/* Severity Filter */}
            <div>
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-2">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                Min Severity: {minSeverity}
              </label>
              <input
                type="range"
                min={0}
                max={maxSeverityInData}
                value={minSeverity}
                onChange={(e) => setMinSeverity(parseInt(e.target.value))}
                className="w-full h-2 bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
                <span>All</span>
                <span>{maxSeverityInData}</span>
              </div>
            </div>

            {/* Connections Filter */}
            <div>
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-2">
                <Link2 className="w-3 h-3 text-[var(--accent)]" />
                Min Connections: {minConnections}
              </label>
              <input
                type="range"
                min={0}
                max={Math.min(50, maxConnectionsInData)}
                value={minConnections}
                onChange={(e) => setMinConnections(parseInt(e.target.value))}
                className="w-full h-2 bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
                <span>All</span>
                <span>{Math.min(50, maxConnectionsInData)}+</span>
              </div>
            </div>

            {/* Relationship Type Filter */}
            {availableRelTypes.length > 0 && (
              <div className="pt-2 border-t border-[var(--glass-border)]">
                <label className="text-xs text-[var(--text-secondary)] mb-2 block font-medium">
                  Rel Types:
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                  {availableRelTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        const next = new Set(excludedRelTypes);
                        if (next.has(type)) next.delete(type);
                        else next.add(type);
                        setExcludedRelTypes(next);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                        !excludedRelTypes.has(type)
                          ? 'bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30'
                          : 'bg-[var(--glass-bg-highlight)] text-[var(--text-muted)] border border-[var(--glass-border)]'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="pt-2 border-t border-[var(--glass-border)] text-xs text-[var(--text-muted)]">
              Showing {filteredNodes.length} of {nodes.length} nodes
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-4 left-4 z-20 bg-[var(--glass-bg)]/90 backdrop-blur-sm rounded-[var(--radius-lg)] p-4 border border-[var(--glass-border)] shadow-[var(--glass-shadow)] pointer-events-none sm:pointer-events-auto opacity-80 sm:opacity-100 hover:opacity-100 transition-opacity">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">
            Node Risk
          </p>
          {nodeRiskActions ? (
            <div className="pointer-events-auto flex items-center gap-1">{nodeRiskActions}</div>
          ) : null}
        </div>
        <div className="space-y-2">
          {[
            { level: 5, label: 'Critical Risk', color: '#a855f7' },
            { level: 4, label: 'High Risk', color: '#ef4444' },
            { level: 3, label: 'Medium Risk', color: '#f59e0b' },
            { level: 2, label: 'Low Risk', color: '#3b82f6' },
            { level: 1, label: 'Minimal', color: '#10b981' },
          ].map(({ level, label, color }) => (
            <div key={level} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full shadow-[0_0_8px]"
                style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
              />
              <span className="text-xs text-[var(--text-secondary)]">{label}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-[var(--glass-border)]">
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-2">
            Edge Style
          </div>
          <div className="space-y-1 mb-3">
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <svg width="18" height="6" viewBox="0 0 18 6" aria-hidden="true">
                <line x1="0" y1="3" x2="18" y2="3" stroke="#60a5fa" strokeWidth="1.5" />
              </svg>
              Direct
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <svg width="18" height="6" viewBox="0 0 18 6" aria-hidden="true">
                <line
                  x1="0"
                  y1="3"
                  x2="18"
                  y2="3"
                  stroke="#22d3ee"
                  strokeWidth="1.5"
                  strokeDasharray="3 2"
                />
              </svg>
              Inferred
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <svg width="18" height="6" viewBox="0 0 18 6" aria-hidden="true">
                <line
                  x1="0"
                  y1="3"
                  x2="18"
                  y2="3"
                  stroke="#a855f7"
                  strokeWidth="1.5"
                  strokeDasharray="1.5 2.5"
                />
              </svg>
              Agentic
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Move className="w-3 h-3" />
            <span>Drag Background to Pan</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-1">
            <span className="w-3 h-3 rounded-full border border-[var(--glass-border)] block"></span>
            <span>Drag Nodes to Rearrange</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--accent)] mt-1">
            <span className="text-[10px] bg-[var(--glass-bg-highlight)] px-1 rounded">Shift</span>
            <span>+ Drag = Force Move Nearest</span>
          </div>
        </div>
      </div>

      {/* Graph Area */}
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        className={`w-full h-full ${modifierKeyPressed ? 'cursor-crosshair' : 'cursor-move'}`}
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0.5) 0%, rgba(2, 6, 23, 0.8) 100%)',
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {filteredNodes
            .filter(
              (n) =>
                avatarUrls[n.id] && avatarUrls[n.id] !== 'pending' && avatarUrls[n.id] !== 'error',
            )
            .map((n) => (
              <pattern
                key={`photo-${n.id}`}
                id={`photo-${n.id}`}
                x="0"
                y="0"
                height="1"
                width="1"
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid slice"
              >
                <image
                  href={avatarUrls[n.id]}
                  x="0"
                  y="0"
                  width="100"
                  height="100"
                  preserveAspectRatio="xMidYMid slice"
                />
              </pattern>
            ))}
        </defs>

        <g
          transform={`translate(${transform.x - 50 * transform.k}, ${transform.y - 50 * transform.k}) scale(${transform.k})`}
        >
          {/* Links */}
          <g className="links" style={{ opacity: lod.opacity }}>
            {links.map((link, i) => {
              const isHighlight =
                hoveredNode === link.source.label || hoveredNode === link.target.label;
              const type = String(link.type || '').toLowerCase();
              const isInferred = link.classification === 'INFERRED' || type.includes('infer');
              const isAgentic = type.includes('agentic') || type.includes('derived');
              const stroke = isAgentic ? '#a855f7' : isInferred ? '#22d3ee' : '#60a5fa';
              // Dynamic width based on weight (0.05 to 0.3 base)
              // @ts-ignore - normalizedWeight added in useMemo
              const weightBonus = (link.normalizedWeight || 0) * 0.15;
              const baseWidth = 0.05 + weightBonus;
              const highlightWidth = 0.3 + weightBonus;
              const baseOpacity =
                transform.k < 0.4
                  ? 0.12
                  : transform.k < 0.8
                    ? 0.18
                    : 0.22 + (link.normalizedWeight || 0) * 0.24;

              return (
                <line
                  key={i}
                  x1={link.source.x}
                  y1={link.source.y}
                  x2={link.target.x}
                  y2={link.target.y}
                  stroke={isHighlight ? '#e2e8f0' : stroke}
                  strokeWidth={isHighlight ? highlightWidth : baseWidth}
                  strokeOpacity={isHighlight ? 0.85 : baseOpacity}
                  strokeDasharray={isInferred || isAgentic ? '1.6 1.2' : undefined}
                  vectorEffect="non-scaling-stroke"
                  className="transition-all duration-300 cursor-pointer hover:stroke-cyan-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdgeClick?.({
                      sourceId: Number(link.source.id),
                      targetId: Number(link.target.id),
                      source: String(link.source.id),
                      target: String(link.target.id),
                      type: link.type,
                      weight: link.weight,
                    });
                  }}
                />
              );
            })}
          </g>

          {/* Nodes */}
          <g className="nodes">
            {filteredNodes.map((node) => {
              const color = getRiskColor(node.risk || 0); // Changed from node.riskLevel to node.risk
              const isHovered = hoveredNode === node.label; // Changed from node.label to node.label
              const size = node.radius || 4;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseEnter={() => setHoveredNode(node.label)} // Changed from node.label to node.label
                  onMouseLeave={() => setHoveredNode(null)}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    // Only drag node if NOT panning with space
                    if (!spacePressed) {
                      setDraggedNode(node.id);
                      setDragStart({ x: e.clientX, y: e.clientY });
                      setTotalDragDistance(0);
                    }
                  }}
                  onClick={(_e) => {
                    // Only trigger click if drag distance is small (was just a click)
                    if (totalDragDistance < 5) {
                      setSelectedNodeId(node.id);
                      if (onEntityClick) {
                        onEntityClick({
                          id: node.id,
                          name: node.label,
                          type: node.type,
                          risk: node.risk,
                          connectionCount: node.connectionCount,
                          photoUrl: node.photoUrl || node.image,
                        });
                      }
                    }
                  }}
                  className={`${spacePressed ? '' : 'cursor-pointer'}`}
                  style={{
                    transition:
                      isDragging && draggedNode === node.id ? 'none' : 'transform 0.1s ease-out',
                  }}
                >
                  {/* Outer Glow */}
                  <circle
                    r={(size / 2) * 2.5}
                    fill={color}
                    opacity={isHovered ? 0.3 : 0.05}
                    className="transition-opacity duration-300"
                  />

                  {/* Node Body */}
                  <circle
                    r={size / 2}
                    fill={color}
                    stroke="white"
                    strokeWidth={isHovered ? 0.2 : 0.05}
                    filter="url(#nodeGlow)"
                    className="transition-all duration-300"
                  />

                  {/* Photo or Default Fill */}
                  {node.image && lod.showAvatars ? (
                    <circle
                      r={size / 2}
                      fill={`url(#photo-${node.id})`}
                      className="pointer-events-none fade-in animate-in duration-500"
                    />
                  ) : null}

                  {/* Label */}
                  {visibleLabels.has(node.id) && (
                    <text
                      dy={size + 2}
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize={labelFontSize}
                      className="pointer-events-none select-none transition-all duration-300"
                      style={{
                        textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                        opacity: hoveredNode && hoveredNode !== node.label ? 0.4 : 1.0,
                      }}
                    >
                      {transform.k < 1 ? node.label.slice(0, 24) : node.label.slice(0, 48)}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* Selection Inspector */}
      {selectedNode && (
        <div className="absolute left-4 right-4 bottom-4 z-20 bg-[var(--glass-bg-strong)]/90 backdrop-blur-sm border border-[var(--glass-border)] rounded-[var(--radius-md)] p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-grow">
              <div className="text-sm font-bold text-[var(--text-primary)] truncate">
                {selectedNode.label}
              </div>{' '}
              {/* Changed from selectedNode.name to selectedNode.label */}
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                {selectedNode.type} • {selectedNode.connectionCount}{' '}
                {/* Changed from selectedNode.role to selectedNode.type */}
                connections
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExpandNode(selectedNode.id)}
                disabled={isExpanding}
                className="px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent)] disabled:bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] rounded-md text-xs font-bold transition-all flex items-center gap-2 shadow-[var(--glass-shadow)] shadow-cyan-900/20"
              >
                {isExpanding ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Link2 className="w-3 h-3" />
                )}
                Discover Connections
              </button>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="p-1.5 hover:bg-[var(--glass-bg)] rounded-md text-[var(--text-muted)] transition-colors"
                title="Close"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkGraph;
