import React, { useState, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { filterPeopleOnly } from '../../utils/entityFilters';

interface TreeMapProps {
  people: any[];
  onPersonClick?: (person: any) => void;
}

interface TreeMapNode {
  name: string;
  value: number;
  redFlagRating: number;
  person: any;
}

export const TreeMap: React.FC<TreeMapProps> = ({ people, onPersonClick }) => {
  const [hoveredNode, setHoveredNode] = useState<TreeMapNode | null>(null);
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Prepare data - top 50 person-like entities by mentions
  // Filter for entities that are likely people or have connection counts
  const nodes: TreeMapNode[] = (people || [])
    .filter((p) => {
      const type = (p.type || p.entityType || '').toLowerCase();
      return type === 'person' || type === '' || !type;
    })
    .filter((p) => (p.name || p.fullName) && filterPeopleOnly([p as any]).length > 0)
    .sort((a, b) => Number(b.mentions || 0) - Number(a.mentions || 0))
    .slice(0, 50)
    .map((p) => ({
      name: (p.name || p.fullName || 'Unknown').trim(),
      value: Number(p.mentions || 0),
      redFlagRating: Number(p.redFlagRating || 0),
      person: p,
    }));

  const total = nodes.reduce((sum, node) => sum + node.value, 0);

  // Constants for original canvas size
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const WIDTH = isMobile ? 600 : 1000;
  const HEIGHT = isMobile ? 1000 : 600;

  // Simple squarified treemap layout
  const layout = squarify(nodes, WIDTH, HEIGHT);

  // Hex colors for SVG gradients
  const getGradientColors = (rating: number) => {
    if (rating >= 5) return ['#db2777', '#dc2626']; // pink-600 to red-600
    if (rating >= 4) return ['#9333ea', '#db2777']; // purple-600 to pink-600
    if (rating >= 3) return ['#2563eb', '#9333ea']; // blue-600 to purple-600
    if (rating >= 2) return ['#0891b2', '#2563eb']; // cyan-600 to blue-600
    if (rating >= 1) return ['#0d9488', '#0891b2']; // teal-600 to cyan-600
    return ['#475569', '#64748b']; // slate-600 to slate-500
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Only zoom if Ctrl is pressed or it's a pinch gesture (trackpad typically sends Ctrl+Wheel for zoom)
    // Or just allow unrestricted zooming but prevent page scroll
    e.preventDefault();
    e.stopPropagation();

    const scaleAmount = -e.deltaY * 0.001;
    const newScale = Math.max(0.5, Math.min(4, transform.k * (1 + scaleAmount)));

    // Zoom towards mouse position could be complex, centering zoom for simplicity or improving later
    setTransform((prev) => ({ ...prev, k: newScale }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom controls
  const zoomIn = () => setTransform((prev) => ({ ...prev, k: Math.min(4, prev.k * 1.2) }));
  const zoomOut = () => setTransform((prev) => ({ ...prev, k: Math.max(0.5, prev.k / 1.2) }));
  const resetZoom = () => setTransform({ k: 1, x: 0, y: 0 });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end gap-2 mb-2">
        <button
          onClick={zoomIn}
          className="p-2 bg-[var(--glass-bg)] rounded hover:bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)]"
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={zoomOut}
          className="p-2 bg-[var(--glass-bg)] rounded hover:bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)]"
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={resetZoom}
          className="p-2 bg-[var(--glass-bg)] rounded hover:bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)]"
          title="Reset"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      <div
        ref={containerRef}
        className={`relative w-full ${isMobile ? 'h-[800px]' : 'h-[600px]'} bg-[var(--glass-bg-strong)]/50 rounded-[var(--radius-xl)] border border-[var(--glass-border)] overflow-hidden cursor-move`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full h-full select-none"
        >
          <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
            {layout.map((node, index) => {
              const isHovered = hoveredNode?.name === node.name;
              const [stop1, stop2] = getGradientColors(node.redFlagRating);

              return (
                <g
                  key={index}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent drag start on click
                    onPersonClick?.(node.person);
                  }}
                  className="cursor-pointer transition-all duration-200"
                  style={{ opacity: hoveredNode && !isHovered ? 0.6 : 1 }}
                >
                  <defs>
                    <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={stop1} />
                      <stop offset="100%" stopColor={stop2} />
                    </linearGradient>
                  </defs>

                  <rect
                    x={node.x}
                    y={node.y}
                    width={node.width}
                    height={node.height}
                    fill={`url(#gradient-${index})`}
                    stroke="#1e293b"
                    strokeWidth={isHovered ? 2 / transform.k : 1 / transform.k}
                    rx={4}
                    style={{
                      transition: 'filter 0.2s ease',
                      filter: isHovered ? 'brightness(1.1)' : 'none',
                    }}
                  />

                  {/* Text - scaled inversely to zoom to maintain readability or hidden if too small */}
                  {node.width * transform.k > 60 && node.height * transform.k > 40 && (
                    <>
                      <text
                        x={node.x + node.width / 2}
                        y={node.y + node.height / 2 - 8}
                        textAnchor="middle"
                        className="fill-white font-semibold text-xs pointer-events-none user-select-none"
                        style={{
                          fontSize: Math.min(14, (node.width * transform.k) / 8) / transform.k,
                        }}
                      >
                        {node.name.length > 20 ? node.name.substring(0, 18) + '...' : node.name}
                      </text>
                      <text
                        x={node.x + node.width / 2}
                        y={node.y + node.height / 2 + 8}
                        textAnchor="middle"
                        className="fill-white/80 text-xs pointer-events-none user-select-none"
                        style={{
                          fontSize: Math.min(12, (node.width * transform.k) / 10) / transform.k,
                        }}
                      >
                        {node.value.toLocaleString()}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Hover tooltip - fixed position relative to viewport */}
        {hoveredNode && (
          <div className="absolute top-4 right-4 bg-[var(--glass-bg-strong)]/95 backdrop-blur-sm border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-4 shadow-[var(--glass-shadow)] max-w-xs z-10 pointer-events-none">
            <h4 className="text-[var(--text-primary)] font-bold text-sm mb-2">
              {hoveredNode.name}
            </h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Mentions:</span>
                <span className="text-[var(--text-primary)] font-mono">
                  {hoveredNode.value.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Percentage:</span>
                <span className="text-[var(--text-primary)] font-mono">
                  {((hoveredNode.value / total) * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Red Flag Index:</span>
                <span className="text-[var(--text-primary)]">
                  {hoveredNode.redFlagRating}/5 {'🚩'.repeat(hoveredNode.redFlagRating)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Improved squarified treemap algorithm that fills space better
function squarify(nodes: TreeMapNode[], width: number, height: number) {
  const result: Array<TreeMapNode & { x: number; y: number; width: number; height: number }> = [];

  if (nodes.length === 0) return [];

  // Sort by value descending
  const sorted = [...nodes].sort((a, b) => b.value - a.value);

  // Recursive tiling function
  function tile(items: TreeMapNode[], x: number, y: number, w: number, h: number) {
    if (items.length === 0) return;

    if (items.length === 1) {
      result.push({ ...items[0], x, y, width: w, height: h });
      return;
    }

    // Split items into two groups roughly equal in value
    // Optimization: find split point that balances value sum better
    let bestSplit = 1;
    let minDiff = Infinity;
    let currentSum = 0;
    const groupTotal = items.reduce((s, n) => s + n.value, 0);

    for (let i = 0; i < items.length - 1; i++) {
      currentSum += items[i].value;
      const diff = Math.abs(currentSum - groupTotal / 2);
      if (diff < minDiff) {
        minDiff = diff;
        bestSplit = i + 1;
      }
    }

    const group1 = items.slice(0, bestSplit);
    const group2 = items.slice(bestSplit);

    const value1 = group1.reduce((sum, node) => sum + node.value, 0);
    const ratio = value1 / groupTotal;

    if (w > h) {
      // Split vertically
      tile(group1, x, y, w * ratio, h);
      tile(group2, x + w * ratio, y, w * (1 - ratio), h);
    } else {
      // Split horizontally
      tile(group1, x, y, w, h * ratio);
      tile(group2, x, y + h * ratio, w, h * (1 - ratio));
    }
  }

  tile(sorted, 0, 0, width, height);
  return result;
}
