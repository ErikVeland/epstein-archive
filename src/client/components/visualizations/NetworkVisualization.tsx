import React, { useState, useEffect, useRef } from 'react';
import {
  Network,
  FileText,
  Search,
  Download,
  Settings,
  Sliders,
  Filter,
  Users,
  Shield,
  Zap,
  Info,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { CollapsibleSplitPane } from '../common/CollapsibleSplitPane';

export interface NetworkNode {
  id: string;
  type: 'person' | 'document' | 'organization' | 'location' | 'event' | 'evidence';
  label: string;
  description?: string;
  importance: number; // 1-5 scale
  metadata: {
    mentions?: number;
    documents?: string[];
    connections?: string[];
    category?: string;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    evidenceStrength?: 'weak' | 'moderate' | 'strong' | 'crucial';
  };
  position?: { x: number; y: number };
  color?: string;
  size?: number;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  type: 'connection' | 'communication' | 'financial' | 'legal' | 'family' | 'business' | 'evidence';
  strength: number; // 1-10 scale
  direction?: 'unidirectional' | 'bidirectional';
  metadata: {
    frequency?: number;
    dates?: string[];
    context?: string;
    evidence?: string[];
    confidence?: number;
    wasAgentic?: boolean;
    ingestRunId?: string;
  };
}

export interface NetworkVisualizationProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  onNodeClick?: (node: NetworkNode) => void;
  onEdgeClick?: (edge: NetworkEdge) => void;
  selectedNodeId?: string;
  selectedEdgeId?: string;
  showFilters?: boolean;
  showLegend?: boolean;
  interactive?: boolean;
  height?: number;
}

export const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({
  nodes: initialNodes,
  edges: initialEdges,
  onNodeClick,
  onEdgeClick,
  selectedNodeId,
  selectedEdgeId,
  // showFilters/showLegend removed from destructuring (unused)
  interactive = true,
  height = 600,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [edges, setEdges] = useState<NetworkEdge[]>([]);
  const [filteredNodes, setFilteredNodes] = useState<NetworkNode[]>([]);
  const [filteredEdges, setFilteredEdges] = useState<NetworkEdge[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  // filterType/Risk removed (unused)
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [lastPan, setLastPan] = useState({ x: 0, y: 0 });
  const [damningEvidenceOnly, setDamningEvidenceOnly] = useState(false);
  const [showTableView, setShowTableView] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [settingsPaneWidth, setSettingsPaneWidth] = useState(320);
  const [minStrength, setMinStrength] = useState(0);
  const [maxHops, setMaxHops] = useState(3);
  const [rootNodeId, _setRootNodeId] = useState<string | null>('1'); // Default to Jeffrey Epstein
  const [selectedEdgeTypes, setSelectedEdgeTypes] = useState<Set<string>>(
    new Set([
      'connection',
      'communication',
      'financial',
      'legal',
      'family',
      'business',
      'evidence',
      'co_occurrence',
      'co_mention',
    ]),
  );
  const [selectedNodeTypes, setSelectedNodeTypes] = useState<Set<string>>(
    new Set(['person', 'organization', 'location', 'event', 'document', 'evidence']),
  );
  const [hopsMap, setHopsMap] = useState<Map<string, number>>(new Map());

  // Initialize with optimized radial layout
  useEffect(() => {
    if (initialNodes.length === 0) return;

    // BFS is needed here for hops-based radial positioning
    const hopsMapForInit = new Map<string, number>();
    const rootId = rootNodeId || '1';

    // Simple local BFS just for init if global hopsMap isn't ready
    const queue: [string, number][] = [[rootId, 0]];
    hopsMapForInit.set(rootId, 0);

    const adj = new Map<string, string[]>();
    initialEdges.forEach((edge) => {
      if (!adj.has(edge.source)) adj.set(edge.source, []);
      if (!adj.has(edge.target)) adj.set(edge.target, []);
      adj.get(edge.source)!.push(edge.target);
      adj.get(edge.target)!.push(edge.source);
    });

    while (queue.length > 0) {
      const [currId, dist] = queue.shift()!;
      if (dist >= 5) continue;
      const neighbors = adj.get(currId) || [];
      for (const neighbor of neighbors) {
        if (!hopsMapForInit.has(neighbor)) {
          hopsMapForInit.set(neighbor, dist + 1);
          queue.push([neighbor, dist + 1]);
        }
      }
    }

    const spreadNodes = initialNodes.map((node) => {
      const hops = hopsMapForInit.get(node.id) ?? 3;
      const angle = Math.random() * 2 * Math.PI;
      const radius = hops === 0 ? 0 : 150 * hops + Math.random() * 50;

      return {
        ...node,
        position: node.position || {
          x: 400 + Math.cos(angle) * radius,
          y: 300 + Math.sin(angle) * radius,
        },
        color: node.color || getNodeColor(node.type, node.metadata?.riskLevel),
        size: node.size || getNodeSize(node.importance),
      };
    });

    setNodes(spreadNodes);
    setEdges(initialEdges);

    // Apply layout multiple times for better stabilization
    setTimeout(() => {
      applyForceLayout(spreadNodes, initialEdges, 200);
      setNodes([...spreadNodes]);
      centerNetwork();
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNodes, initialEdges, rootNodeId]);

  // BFS calculation for hops from root
  useEffect(() => {
    if (!rootNodeId || nodes.length === 0) {
      setHopsMap(new Map());
      return;
    }

    const newHopsMap = new Map<string, number>();
    const queue: [string, number][] = [[rootNodeId, 0]];
    newHopsMap.set(rootNodeId, 0);

    // Build adjacency list for faster traversal
    const adj = new Map<string, string[]>();
    edges.forEach((edge) => {
      // Only traverse edges that meet the current strength and type requirements
      if (edge.strength < minStrength) return;
      if (!selectedEdgeTypes.has(edge.type)) return;

      if (!adj.has(edge.source)) adj.set(edge.source, []);
      if (!adj.has(edge.target)) adj.set(edge.target, []);
      adj.get(edge.source)!.push(edge.target);
      adj.get(edge.target)!.push(edge.source);
    });

    while (queue.length > 0) {
      const [currId, dist] = queue.shift()!;
      if (dist >= maxHops) continue;

      const neighbors = adj.get(currId) || [];
      for (const neighbor of neighbors) {
        if (!newHopsMap.has(neighbor)) {
          newHopsMap.set(neighbor, dist + 1);
          queue.push([neighbor, dist + 1]);
        }
      }
    }

    setHopsMap(newHopsMap);
  }, [nodes, edges, rootNodeId, maxHops, minStrength, selectedEdgeTypes]);

  // Apply filters
  useEffect(() => {
    let filtered = nodes;

    // Filter by node types
    filtered = filtered.filter((node) => selectedNodeTypes.has(node.type));

    // Filter by Hops from root
    if (rootNodeId && maxHops < 5) {
      // Only apply if we are not showing "all" (simulated by maxHops=5)
      filtered = filtered.filter((node) => hopsMap.has(node.id));
    }

    // Filter by Search
    if (searchTerm) {
      filtered = filtered.filter(
        (node) =>
          node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          node.description?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    setFilteredNodes(filtered);

    // Filter edges
    const filteredNodeIds = new Set(filtered.map((n) => n.id));
    setFilteredEdges(
      edges.filter((edge) => {
        const basics =
          filteredNodeIds.has(edge.source) &&
          filteredNodeIds.has(edge.target) &&
          edge.strength >= minStrength &&
          selectedEdgeTypes.has(edge.type);

        if (!basics) return false;
        if (damningEvidenceOnly) {
          return (edge.metadata.confidence || 0) > 0.8 && (edge.strength || 0) >= 7;
        }
        return true;
      }),
    );
  }, [
    nodes,
    edges,
    searchTerm,
    minStrength,
    selectedEdgeTypes,
    selectedNodeTypes,
    hopsMap,
    rootNodeId,
    maxHops,
    damningEvidenceOnly,
  ]);

  const getNodeColor = (type: string, riskLevel?: string): string => {
    const baseColors: Record<string, string> = {
      person: '#38bdf8', // Blue/Cyan
      organization: '#fbbf24', // Gold
      location: '#10b981', // green
      event: '#f472b6', // pink
      document: '#94a3b8', // slate
      evidence: '#f87171', // red
    };

    const riskColors: Record<string, string> = {
      low: '#22c55e',
      medium: '#eab308',
      high: '#f97316',
      critical: '#dc2626',
    };

    return riskLevel && riskLevel !== 'low'
      ? riskColors[riskLevel] || baseColors[type] || '#64748b'
      : baseColors[type] || '#64748b';
  };

  const getNodeSize = (importance: number): number => {
    return 8 + importance * 4; // 12-28px
  };

  const getEdgeColor = (type: string): string => {
    const colors: Record<string, string> = {
      connection: '#64748b',
      communication: '#3b82f6',
      financial: '#fbbf24',
      legal: '#ef4444',
      family: '#f472b6',
      business: '#38bdf8',
      evidence: '#f97316',
      co_occurrence: '#475569',
      co_mention: '#475569',
      Aviation: '#38bdf8',
      Banking: '#fbbf24',
      Investment: '#a855f7',
      Legal: '#ef4444',
      Personal: '#f472b6',
      Professional: '#3b82f6',
      'Real Estate': '#22c55e',
    };
    return colors[type] || '#64748b';
  };

  const applyForceLayout = (nodes: NetworkNode[], edges: NetworkEdge[], iterations = 150) => {
    const centerX = 400;
    const centerY = 300;
    const repulsionStrength = 2500;
    const attractionStrength = 0.05;

    // damping removed (unused)
    const radialForceStrength = 0.02;

    for (let i = 0; i < iterations; i++) {
      // 1. Repulsion between all nodes
      for (let j = 0; j < nodes.length; j++) {
        for (let k = j + 1; k < nodes.length; k++) {
          const nodeStepA = nodes[j];
          const nodeStepB = nodes[k];

          if (!nodeStepA.position || !nodeStepB.position) continue;

          const dx = nodeStepB.position.x - nodeStepA.position.x;
          const dy = nodeStepB.position.y - nodeStepA.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;

          if (distance < 500) {
            // Limit repulsion range for better performance
            const force = repulsionStrength / (distance * distance + 1);
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;

            nodeStepA.position.x -= fx;
            nodeStepA.position.y -= fy;
            nodeStepB.position.x += fx;
            nodeStepB.position.y += fy;
          }
        }
      }

      // 2. Attraction for connected nodes (Clustering)
      edges.forEach((edge) => {
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);

        if (!source?.position || !target?.position) return;

        const dx = target.position.x - source.position.x;
        const dy = target.position.y - source.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        // Increase attraction for higher strength connections
        const force = attractionStrength * Math.pow(distance, 1.2) * (edge.strength / 5);
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        source.position.x += fx;
        source.position.y += fy;
        target.position.x -= fx;
        target.position.y -= fy;
      });

      // 3. Radial and Center Forces
      nodes.forEach((node) => {
        if (!node.position) return;

        const dx = node.position.x - centerX;
        const dy = node.position.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        // Radial constraint based on hops
        const hops = hopsMap.get(node.id) ?? 2;
        const targetRadius = hops === 0 ? 0 : 180 * hops;

        const radialDiff = distance - targetRadius;
        node.position.x -= (dx / distance) * radialDiff * radialForceStrength;
        node.position.y -= (dy / distance) * radialDiff * radialForceStrength;

        // Extra pull to center for high importance nodes
        if (node.importance > 3) {
          node.position.x -= dx * 0.01;
          node.position.y -= dy * 0.01;
        }
      });

      // 4. Damping / Area Bounds
      nodes.forEach((node) => {
        if (!node.position) return;

        // Keep within reasonable bounds
        const maxDist = 1200;
        const dx = node.position.x - centerX;
        const dy = node.position.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > maxDist) {
          node.position.x = centerX + (dx / dist) * maxDist;
          node.position.y = centerY + (dy / dist) * maxDist;
        }
      });
    }
  };

  const drawNetwork = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply zoom and pan
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw edges
    filteredEdges.forEach((edge) => {
      const source = filteredNodes.find((n) => n.id === edge.source);
      const target = filteredNodes.find((n) => n.id === edge.target);

      if (!source?.position || !target?.position) return;

      const edgeColor = getEdgeColor(edge.type);
      ctx.beginPath();
      ctx.moveTo(source.position.x, source.position.y);
      ctx.lineTo(target.position.x, target.position.y);

      ctx.strokeStyle = edgeColor;
      ctx.lineWidth = edge.strength * 0.5; // Fine lines
      ctx.globalAlpha = 0.25; // Translucent lines

      if (edge.metadata.wasAgentic) {
        ctx.setLineDash([2, 4]); // Dotted for agentic
      } else if (edge.direction === 'bidirectional') {
        ctx.setLineDash([]); // Solid for verified/regular
      } else {
        ctx.setLineDash([8, 4]); // Dashed for directional/inferred
      }

      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    });

    // Draw nodes
    filteredNodes.forEach((node) => {
      if (!node.position) return;

      const isSelected = node.id === selectedNodeId;
      const isRoot = node.id === rootNodeId;
      const nodeSize = node.size || 12;

      // Glow Effect
      ctx.shadowBlur = isSelected ? 20 : 15;
      ctx.shadowColor = node.color || '#3b82f6';

      // Root Halo
      if (isRoot) {
        ctx.beginPath();
        ctx.arc(node.position.x, node.position.y, nodeSize + 8, 0, 2 * Math.PI);
        ctx.strokeStyle = node.color || '#3b82f6';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.3;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Draw node circle
      ctx.beginPath();
      ctx.arc(node.position.x, node.position.y, nodeSize, 0, 2 * Math.PI);

      ctx.fillStyle = node.color || '#3b82f6';
      ctx.fill();

      // Reset shadows for details
      ctx.shadowBlur = 0;

      if (isSelected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Draw node icon
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const icon = getNodeIcon(node.type);
      ctx.fillText(icon, node.position.x, node.position.y);

      // Draw node label (only for important nodes or if zoomed in enough)
      const shouldDrawLabel = zoom > 0.6 || node.importance > 3 || isSelected;
      if (shouldDrawLabel) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = node.importance > 4 ? 'bold 13px Inter, sans-serif' : '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.position.x, node.position.y + nodeSize + 18);
      }

      // Draw importance indicator
      if (node.importance > 3) {
        ctx.beginPath();
        ctx.arc(node.position.x + nodeSize - 2, node.position.y - nodeSize + 2, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    ctx.restore();
  };

  const getNodeIcon = (type: NetworkNode['type']): string => {
    const icons = {
      person: '👤',
      document: '📄',
      organization: '🏢',
      location: '📍',
      event: '📅',
      evidence: '🔍',
    };
    return icons[type];
  };

  useEffect(() => {
    drawNetwork();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- drawNetwork is stable and depends on filtered data
  }, [filteredNodes, filteredEdges, selectedNodeId, selectedEdgeId, zoom, pan]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = ((event.clientX - rect.left) * scaleX - pan.x) / zoom;
    const y = ((event.clientY - rect.top) * scaleY - pan.y) / zoom;

    // Check if click is on a node
    const clickedNode = filteredNodes.find((node) => {
      if (!node.position) return false;
      const distance = Math.sqrt(
        Math.pow(x - node.position.x, 2) + Math.pow(y - node.position.y, 2),
      );
      return distance <= (node.size || 12);
    });

    if (clickedNode) {
      onNodeClick?.(clickedNode);
      return;
    }

    // Check if click is on an edge
    const clickedEdge = filteredEdges.find((edge) => {
      const source = filteredNodes.find((n) => n.id === edge.source);
      const target = filteredNodes.find((n) => n.id === edge.target);

      if (!source?.position || !target?.position) return false;

      // Distance from point to line segment
      const A = x - source.position.x;
      const B = y - source.position.y;
      const C = target.position.x - source.position.x;
      const D = target.position.y - source.position.y;

      const dot = A * C + B * D;
      const len_sq = C * C + D * D;
      let param = -1;
      if (len_sq !== 0)
        // in case of 0 length line
        param = dot / len_sq;

      let xx, yy;

      if (param < 0) {
        xx = source.position.x;
        yy = source.position.y;
      } else if (param > 1) {
        xx = target.position.x;
        yy = target.position.y;
      } else {
        xx = source.position.x + param * C;
        yy = source.position.y + param * D;
      }

      const dx = x - xx;
      const dy = y - yy;
      const distance = Math.sqrt(dx * dx + dy * dy);

      return distance < 5; // 5px tolerance
    });

    if (clickedEdge) {
      onEdgeClick?.(clickedEdge);
    }
  };

  // Enhanced zoom to center on mouse position
  const handleWheelEnhanced = (event: React.WheelEvent<HTMLCanvasElement>) => {
    if (!interactive) return;

    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;

    // Get mouse position relative to canvas
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Scale for internal resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Convert screen coordinates to world coordinates
    const worldMouseX = (mouseX * scaleX - pan.x) / zoom;
    const worldMouseY = (mouseY * scaleY - pan.y) / zoom;

    // Apply zoom
    const newZoom = Math.max(0.1, Math.min(3, zoom * delta));

    // Adjust pan to keep mouse position fixed
    const newPanX = mouseX * scaleX - worldMouseX * newZoom;
    const newPanY = mouseY * scaleY - worldMouseY * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const centerNetwork = () => {
    if (filteredNodes.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Calculate center of all nodes
    const bounds = filteredNodes.reduce(
      (acc, node) => {
        if (!node.position) return acc;
        return {
          minX: Math.min(acc.minX, node.position.x),
          maxX: Math.max(acc.maxX, node.position.x),
          minY: Math.min(acc.minY, node.position.y),
          maxY: Math.max(acc.maxY, node.position.y),
        };
      },
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
    );

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    // Center the network on canvas
    const canvasCenterX = canvas.width / 2;
    const canvasCenterY = canvas.height / 2;

    setPan({
      x: canvasCenterX - centerX * zoom,
      y: canvasCenterY - centerY * zoom,
    });
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return;

    setIsDragging(true);
    setDragStart({ x: event.clientX, y: event.clientY });
    setLastPan({ x: pan.x, y: pan.y });
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive || !isDragging) return;

    const rect = (event.target as HTMLCanvasElement).getBoundingClientRect();
    const scaleX = (event.target as HTMLCanvasElement).width / rect.width;
    const scaleY = (event.target as HTMLCanvasElement).height / rect.height;

    const deltaX = (event.clientX - dragStart.x) * scaleX;
    const deltaY = (event.clientY - dragStart.y) * scaleY;

    setPan({
      x: lastPan.x + deltaX,
      y: lastPan.y + deltaY,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const exportNetwork = () => {
    const data = {
      nodes: filteredNodes,
      edges: filteredEdges,
      exportDate: new Date().toISOString(),
      totalNodes: nodes.length,
      totalEdges: edges.length,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const Checkbox = ({
    label,
    checked,
    onChange,
    color,
  }: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    color?: string;
  }) => (
    <div
      className="flex items-center gap-3 py-1 cursor-pointer group"
      onClick={() => onChange(!checked)}
    >
      <div
        className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${checked ? 'bg-blue-600 border-blue-500' : 'bg-slate-800 border-slate-600 group-hover:border-slate-500'}`}
      >
        {checked && <Zap className="w-3 h-3 text-white fill-current" />}
      </div>
      <div className="flex items-center gap-2">
        {color && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />}
        <span className={`text-sm font-medium ${checked ? 'text-slate-100' : 'text-slate-400'}`}>
          {label}
        </span>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700/50 overflow-hidden shadow-2xl flex flex-col h-full min-h-[600px]">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-md z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-blue-500/10 p-2 rounded-lg">
              <Network className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Epstein Network Analysis
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {nodes.length} entities
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" /> {edges.length} connections
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative mr-4 hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search entities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 pl-10 pr-4 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all w-64"
              />
            </div>

            <button
              onClick={() => setShowTableView(!showTableView)}
              className={`h-10 px-4 flex items-center gap-2 rounded-lg text-sm font-semibold transition-all ${
                showTableView
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {showTableView ? <Network className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              <span>{showTableView ? 'Visual Graph' : 'Data Table'}</span>
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`h-10 w-10 flex items-center justify-center rounded-lg transition-all ${showSettings ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={exportNetwork}
              className="h-10 w-10 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-all"
              title="Export Network"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <CollapsibleSplitPane
          left={
            <div className="h-full relative bg-[radial-gradient(circle_at_center,_#1e293b_0%,_#0f172a_100%)]">
              {showTableView ? (
                <div className="absolute inset-0 overflow-auto p-6 bg-slate-900/50">
                  <div className="max-w-6xl mx-auto space-y-8">
                    <div>
                      <h4 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-400" />
                        Filtered Entities ({filteredNodes.length})
                      </h4>
                      <div className="bg-slate-800/40 border border-slate-700 rounded-xl overflow-hidden backdrop-blur-sm">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-800/60 text-slate-400 text-xs font-bold uppercase tracking-wider">
                              <th className="p-4">Entity Name</th>
                              <th className="p-4">Type</th>
                              <th className="p-4 text-center">Relevance</th>
                              <th className="p-4 text-center">Hops</th>
                              <th className="p-4 text-right">Mentions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700/50">
                            {filteredNodes.map((node) => (
                              <tr
                                key={node.id}
                                className="hover:bg-blue-500/5 cursor-pointer transition-colors"
                                onClick={() => onNodeClick?.(node)}
                              >
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                                      style={{
                                        backgroundColor: `${node.color}22`,
                                        color: node.color,
                                      }}
                                    >
                                      {getNodeIcon(node.type)}
                                    </div>
                                    <span className="text-white font-medium">{node.label}</span>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-700 text-slate-300 capitalize">
                                    {node.type}
                                  </span>
                                </td>
                                <td className="p-4 text-center">
                                  <div className="flex justify-center gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                      <div
                                        key={i}
                                        className={`w-1.5 h-1.5 rounded-full ${i < node.importance ? 'bg-blue-400' : 'bg-slate-700'}`}
                                      />
                                    ))}
                                  </div>
                                </td>
                                <td className="p-4 text-center">
                                  <span className="text-slate-400 font-mono text-sm">
                                    {hopsMap.get(node.id) === 0
                                      ? 'Root'
                                      : `+${hopsMap.get(node.id) || '?'}`}
                                  </span>
                                </td>
                                <td className="p-4 text-right font-mono text-slate-300">
                                  {node.metadata.mentions || 0}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 cursor-grab active:cursor-grabbing">
                  <canvas
                    ref={canvasRef}
                    width={800}
                    height={height}
                    className="w-full h-full"
                    onClick={handleCanvasClick}
                    onWheel={handleWheelEnhanced}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  />

                  <div className="absolute bottom-6 left-6 flex items-center gap-2 p-1 bg-slate-900/80 border border-slate-700 rounded-xl backdrop-blur-md shadow-2xl">
                    <button
                      onClick={() => setZoom((prev) => Math.min(3, prev * 1.2))}
                      className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-all"
                      title="Zoom In"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-slate-700 mx-1" />
                    <button
                      onClick={() => {
                        setZoom(1);
                        setPan({ x: 0, y: 0 });
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                    >
                      RESET
                    </button>
                    <button
                      onClick={centerNetwork}
                      className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                    >
                      CENTER
                    </button>
                  </div>

                  <div className="absolute bottom-6 right-6 p-4 bg-slate-900/60 border border-slate-700/50 rounded-xl backdrop-blur-sm hidden lg:block">
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                      Entity Key
                    </h5>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      {['person', 'organization', 'location', 'event'].map((type) => (
                        <div key={type} className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getNodeColor(type as any) }}
                          />
                          <span className="text-xs text-slate-300 capitalize">{type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          }
          right={
            <div className="h-full p-6 space-y-8 overflow-y-auto scrollbar-thin">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-bold flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  Graph Settings
                </h4>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-slate-500 hover:text-white"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Range Filters */}
              <div className="space-y-6 pt-4 border-t border-slate-800">
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Network Density
                    </label>
                    <span className="text-blue-400 font-mono text-xs font-bold">
                      ≥ {minStrength}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={minStrength}
                    onChange={(e) => setMinStrength(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <p className="text-[10px] text-slate-500 italic">
                    Filter out weaker associations based on co-occurrence.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Degree of Separation
                    </label>
                    <span className="text-purple-400 font-mono text-xs font-bold">
                      {maxHops >= 5 ? '∞' : `≤ ${maxHops} Hops`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={maxHops}
                    onChange={(e) => setMaxHops(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <p className="text-[10px] text-slate-500 italic">
                    Maximum connection distance from Jeffrey Epstein.
                  </p>
                </div>

                {/* Damning Evidence Mode Toggle */}
                <div className="pt-4 border-t border-slate-800">
                  <div
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      damningEvidenceOnly
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                    }`}
                    onClick={() => setDamningEvidenceOnly(!damningEvidenceOnly)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle
                          className={`w-4 h-4 ${damningEvidenceOnly ? 'text-red-400' : 'text-slate-400'}`}
                        />
                        <span
                          className={`text-xs font-bold uppercase tracking-wider ${damningEvidenceOnly ? 'text-red-400' : 'text-slate-300'}`}
                        >
                          Damning Evidence Mode
                        </span>
                      </div>
                      <div
                        className={`w-8 h-4 rounded-full relative transition-colors ${damningEvidenceOnly ? 'bg-red-500' : 'bg-slate-700'}`}
                      >
                        <div
                          className={`absolute top-1 w-2 h-2 rounded-full bg-white transition-all ${damningEvidenceOnly ? 'left-5' : 'left-1'}`}
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Filters for high-confidence associations (&gt;80%) with elevated risk scores.
                    </p>
                  </div>
                </div>
              </div>

              {/* Relationship Types */}
              <div className="space-y-4 pt-6 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-3 h-3" /> Relationship Types
                  </label>
                  <button
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-bold"
                    onClick={() =>
                      setSelectedEdgeTypes(
                        new Set([
                          'connection',
                          'communication',
                          'financial',
                          'legal',
                          'family',
                          'business',
                          'evidence',
                          'co_occurrence',
                          'co_mention',
                          'Aviation',
                          'Banking',
                          'Investment',
                          'Legal',
                          'Personal',
                          'Professional',
                          'Real Estate',
                        ]),
                      )
                    }
                  >
                    RE-SELECT ALL
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {[
                    'Aviation',
                    'Banking',
                    'Investment',
                    'Legal',
                    'Personal',
                    'Professional',
                    'Real Estate',
                  ].map((type) => (
                    <Checkbox
                      key={type}
                      label={type}
                      color={getEdgeColor(type)}
                      checked={selectedEdgeTypes.has(type)}
                      onChange={(checked) => {
                        const next = new Set(selectedEdgeTypes);
                        if (checked) next.add(type);
                        else next.delete(type);
                        setSelectedEdgeTypes(next);
                      }}
                    />
                  ))}
                  {/* Fallback for generated data */}
                  {['co_occurrence', 'financial', 'legal'].map(
                    (type) =>
                      ![
                        'Aviation',
                        'Banking',
                        'Investment',
                        'Legal',
                        'Personal',
                        'Professional',
                        'Real Estate',
                      ].includes(type) && (
                        <Checkbox
                          key={type}
                          label={type.charAt(0).toUpperCase() + type.slice(1)}
                          color={getEdgeColor(type)}
                          checked={selectedEdgeTypes.has(type)}
                          onChange={(checked) => {
                            const next = new Set(selectedEdgeTypes);
                            if (checked) next.add(type);
                            else next.delete(type);
                            setSelectedEdgeTypes(next);
                          }}
                        />
                      ),
                  )}
                </div>
              </div>

              {/* Entity Types */}
              <div className="space-y-4 pt-6 border-t border-slate-800">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Filter className="w-3 h-3" /> Entity Groups
                </label>
                <div className="grid grid-cols-1 gap-1">
                  {['person', 'organization', 'location', 'event'].map((type) => (
                    <Checkbox
                      key={type}
                      label={type.charAt(0).toUpperCase() + type.slice(1) + 's'}
                      color={getNodeColor(type as any)}
                      checked={selectedNodeTypes.has(type)}
                      onChange={(checked) => {
                        const next = new Set(selectedNodeTypes);
                        if (checked) next.add(type);
                        else next.delete(type);
                        setSelectedNodeTypes(next);
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-8 block">
                <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl">
                  <div className="flex gap-3">
                    <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Connecting lines represent evidence-backed associations. Thicker lines
                      indicate higher frequency or proximity scores in investigative files.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          }
          collapsedRight={
            <div className="h-full py-3 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="control h-8 w-8 p-0 flex items-center justify-center text-cyan-300 hover:text-cyan-100"
                title="Expand graph settings"
                aria-label="Expand graph settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <div className="h-px w-6 bg-slate-700/80" />
              <Sliders className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <Filter className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <Shield className="w-4 h-4 text-slate-500" aria-hidden="true" />
            </div>
          }
          defaultRightWidth={settingsPaneWidth}
          minRightWidth={280}
          maxRightWidth={480}
          collapsedWidth={84}
          rightCollapsed={!showSettings}
          onRightCollapsedChange={(next) => setShowSettings(!next)}
          onRightWidthChange={setSettingsPaneWidth}
          dividerAriaLabel="Resize graph settings panel"
          collapseAriaLabel="Collapse graph settings panel"
          expandAriaLabel="Expand graph settings panel"
        />
      </div>
    </div>
  );
};
