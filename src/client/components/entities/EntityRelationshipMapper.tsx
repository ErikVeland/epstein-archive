import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3Selection from 'd3-selection';
import * as d3Quadtree from 'd3-quadtree';

import { EntityType } from '../../services/GraphService';
import styles from './EntityRelationshipMapper.module.css';

export interface Entity {
  id: string;
  type: EntityType;
  label: string;
  properties: Record<string, unknown>;
  confidence: number;
  sources: string[];
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null; // Fixed X position
  fy?: number | null; // Fixed Y position
  isEgo?: boolean; // Is this the central entity?
}

export interface Relationship {
  id: string;
  from: string;
  to: string;
  type: string;
  strength: number;
  confidence: number;
  evidence: string[];
  properties: Record<string, unknown>;
}

interface EntityRelationshipMapperProps {
  entities: Entity[];
  relationships: Relationship[];
  onEntitySelect?: (entity: Entity) => void;
  onRelationshipSelect?: (relationship: Relationship) => void;
}

export const EntityRelationshipMapper: React.FC<EntityRelationshipMapperProps> = ({
  entities,
  relationships,
  onEntitySelect,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [simulationRunning, setSimulationRunning] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Memoize nodes with positions
  const nodes = useMemo(() => {
    return entities.map((e) => ({
      ...e,
      x: e.x ?? Math.random() * 800,
      y: e.y ?? Math.random() * 600,
      vx: 0,
      vy: 0,
      fx: e.isEgo ? (containerRef.current?.clientWidth || 800) / 2 : undefined,
      fy: e.isEgo ? (containerRef.current?.clientHeight || 600) / 2 : undefined,
    }));
  }, [entities]);

  // Memoize links
  const links = useMemo(() => {
    return relationships.map((r) => ({ ...r }));
  }, [relationships]);

  // Memoize link colors to avoid recomputing on every render
  const getLinkColor = useMemo(() => {
    return (d: Relationship) => {
      const risk = typeof d.properties?.riskScore === 'number' ? d.properties.riskScore : undefined;
      if (risk === undefined) return '#475569';
      if (risk >= 8) return '#ef4444';
      if (risk >= 5) return '#f59e0b';
      if (risk >= 3) return '#eab308';
      return '#10b981';
    };
  }, []);

  // Memoize node colors to avoid recomputing on every render
  const getNodeColor = useMemo(() => {
    return (type: string) => {
      switch (type) {
        case 'person':
          return '#3b82f6';
        case 'organization':
          return '#8b5cf6';
        case 'location':
          return '#06b6d4';
        case 'document':
          return '#10b981';
        case 'communication':
          return '#f43f5e';
        case 'financial':
          return '#f59e0b';
        case 'unknown':
        default:
          return '#64748b';
      }
    };
  }, []);

  // Custom simple force simulation since d3-force is not available
  useEffect(() => {
    if (!simulationRunning) return;

    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;
    const center = { x: width / 2, y: height / 2 };

    let animationFrameId: number;

    const tick = () => {
      // 1. Repulsion using Quadtree (Barnes-Hut approximation)
      // Build quadtree
      const tree = d3Quadtree
        .quadtree<Entity>()
        .x((d) => d.x!)
        .y((d) => d.y!)
        .addAll(nodes);

      nodes.forEach((_node) => {
        tree.visit((quad, _x1, _y1, _x2, _y2) => {
          if (!quad.length) {
            // Internal node
            // d3-quadtree doesn't calculate center of mass by default without accumulation.
            // We'll use a simpler collision detection approach instead of full Barnes-Hut if we don't implement the mass accumulation.
            // Actually, a simpler repulsion is just visiting all nodes near us.
          }
          return false;
        });
      });

      // Better approach: Use local repulsion window
      // Revert to N^2 loop BUT use the quadtree to only check neighbors within radius
      // This is efficient for collision/short-range repulsion. For long-range, we simplify.

      // Let's implement a standard force accumulation visit
      nodes.forEach((node) => {
        tree.visit((quad, x1, y1, x2, y2) => {
          if (!quad.length) {
            // Internal node
            // If we implemented center of mass, we could use BH here.
            // For now, let's just descend if the quad is close enough
            // Check if quad is far away
            // Keep fully visiting leaves
            return false;
          }

          const otherNode = (quad as { data?: Entity }).data;
          if (otherNode && otherNode !== node) {
            const dx = node.x! - otherNode.x!;
            const dy = node.y! - otherNode.y!;
            const distSq = dx * dx + dy * dy || 1;

            // Limit the range of interaction for performance (cutoff)
            if (distSq < 40000) {
              const force = 5000 / distSq;
              const fx = (dx / Math.sqrt(distSq)) * force;
              const fy = (dy / Math.sqrt(distSq)) * force;

              node.vx! += fx * 0.05;
              node.vy! += fy * 0.05;
            }
          }
          // Prune if quad is out of range?
          // The "visit" function returns true to stop descending.
          // Calculate distance from node to quad center/bounds
          const cx = (x1 + x2) / 2;
          const cy = (y1 + y2) / 2;
          const width = x2 - x1;
          const qDx = node.x! - cx;
          const qDy = node.y! - cy;
          // If nearest point in quad is > 200 (sqrt(40000)), skip
          // Simplified check:
          if (Math.abs(qDx) - width / 2 > 200 || Math.abs(qDy) - width / 2 > 200) {
            return true; // Skip this quad and children
          }

          return false;
        });
      });

      // 2. Attraction (Links pull connected nodes together)
      links.forEach((link) => {
        const source = nodes.find((n) => n.id === link.from);
        const target = nodes.find((n) => n.id === link.to);

        if (source && target) {
          const dx = target.x! - source.x!;
          const dy = target.y! - source.y!;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDist = 100; // Desired link length

          const force = (dist - targetDist) * 0.05; // Spring constant

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          source.vx! += fx;
          source.vy! += fy;
          target.vx! -= fx;
          target.vy! -= fy;
        }
      });

      // 3. Center Gravity (Pull everything to center) + Pin Ego
      nodes.forEach((node) => {
        // Strict Centering: If this is the selected/ego entity, lock it to center
        // We identify the ego node by matching the ID passed via props or state
        // For now, we assume the first node is generating the graph or we use selectedEntity if available
        // Better strategy: The parent should pass an `egoId` prop.
        // Fallback: If node.id matches the first node in the list? No, that's flaky.
        // Let's rely on the parent component passing `egoId` or `centerId`.
        // Since we don't have that yet, let's look for the node that has the most connections?
        // OR: Just pull everything to center.

        // Per Blueprint: "The Pin" logic
        // We need to know which ID is the "Ego".
        // We will add an `isEgo` property to the Entity interface in the next step.
        // For this step, let's implement the physics engine capability to respect `fx` / `fy`.

        if (node.fx !== undefined && node.fx !== null) {
          node.x = node.fx;
          node.vx = 0;
        } else {
          node.vx! += (center.x - node.x!) * 0.005;
        }

        if (node.fy !== undefined && node.fy !== null) {
          node.y = node.fy;
          node.vy = 0;
        } else {
          node.vy! += (center.y - node.y!) * 0.005;
        }

        // Apply velocity
        if (node.fx === undefined || node.fx === null) node.x! += node.vx!;
        if (node.fy === undefined || node.fy === null) node.y! += node.vy!;

        // Damping
        node.vx! *= 0.9;
        node.vy! *= 0.9;
      });

      // Update DOM directly for performance
      const svg = d3Selection.select(svgRef.current);

      svg.selectAll('.node-group').attr('transform', (d: unknown) => {
        const node = d as Entity;
        return `translate(${node.x},${node.y})`;
      });

      svg
        .selectAll('.link')
        .attr('x1', (d: unknown) => {
          const link = d as Relationship;
          const source = nodes.find((n) => n.id === link.from);
          return source ? source.x : 0;
        })
        .attr('y1', (d: unknown) => {
          const link = d as Relationship;
          const source = nodes.find((n) => n.id === link.from);
          return source ? source.y : 0;
        })
        .attr('x2', (d: unknown) => {
          const link = d as Relationship;
          const target = nodes.find((n) => n.id === link.to);
          return target ? target.x : 0;
        })
        .attr('y2', (d: unknown) => {
          const link = d as Relationship;
          const target = nodes.find((n) => n.id === link.to);
          return target ? target.y : 0;
        });

      animationFrameId = requestAnimationFrame(tick);
    };

    tick();

    // Stop simulation after 5 seconds to save resources
    const timeout = setTimeout(() => {
      cancelAnimationFrame(animationFrameId);
      setSimulationRunning(false);
    }, 5000);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(timeout);
    };
  }, [nodes, links, simulationRunning]);

  // Handle node click
  const handleNodeClick = (entity: Entity) => {
    setSelectedEntity(entity);
    if (onEntitySelect) {
      onEntitySelect(entity);
    }
  };

  // Initial Render
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3Selection.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous

    const g = svg
      .append('g')
      .attr('class', 'zoom-layer')
      .attr('transform', `translate(${transform.x},${transform.y}) scale(${transform.k})`);

    // Draw Links
    g.selectAll('.link')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', (d: Relationship) => getLinkColor(d))
      .attr('stroke-width', (d: Relationship) => Math.sqrt(d.strength || 1))
      .attr('opacity', 0.6);

    // Draw Nodes
    const nodeGroups = g
      .selectAll('.node-group')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node-group')
      .attr('cursor', 'pointer')
      .on('click', (event: MouseEvent, d: unknown) => {
        event.stopPropagation();
        handleNodeClick(d as Entity);
      });

    // Node Circles
    nodeGroups
      .append('circle')
      .attr('r', (d: Entity) => (d.type === 'person' ? 15 : 10))
      .attr('fill', (d: Entity) => getNodeColor(d.type))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Node Labels
    nodeGroups
      .append('text')
      .text((d: Entity) => d.label)
      .attr('dy', 25)
      .attr('text-anchor', 'middle')
      .attr('fill', '#cbd5e1')
      .attr('font-size', '10px')
      .style('pointer-events', 'none');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- helper functions are stable, transform is handled in separate effect
  }, [nodes, links]); // Re-render when data changes (positions handled by tick)

  // Update transform
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3Selection.select(svgRef.current);
    svg
      .select('.zoom-layer')
      .attr('transform', `translate(${transform.x},${transform.y}) scale(${transform.k})`);
  }, [transform]);

  // Handle zoom
  const handleZoom = (delta: number) => {
    setTransform((prev) => ({
      ...prev,
      k: Math.max(0.1, Math.min(5, prev.k + delta * 0.1)),
    }));
  };

  // Handle pan
  const handlePan = (dx: number, dy: number) => {
    setTransform((prev) => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy,
    }));
  };

  // Export as PNG
  const exportAsPNG = async () => {
    if (!svgRef.current || !containerRef.current) return;

    setExporting(true);
    try {
      const svg = svgRef.current;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      // Serialize SVG
      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svg);

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      // Load SVG into image
      const img = new Image();
      const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        // Draw background
        ctx.fillStyle = '#0f172a'; // slate-900
        ctx.fillRect(0, 0, width, height);

        // Draw image
        ctx.drawImage(img, 0, 0);

        // Download
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `entity-graph-${new Date().toISOString().split('T')[0]}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        // Cleanup
        URL.revokeObjectURL(url);
        setExporting(false);
      };

      img.onerror = () => {
        console.error('Failed to load SVG image');
        URL.revokeObjectURL(url);
        setExporting(false);
      };

      img.src = url;
    } catch (error) {
      console.error('Error exporting as PNG:', error);
      setExporting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Entity Relationship Map</h2>
        <div className={styles.controls}>
          <button onClick={() => handleZoom(1)} className={styles.zoomButton} aria-label="Zoom in">
            +
          </button>
          <button
            onClick={() => handleZoom(-1)}
            className={styles.zoomButton}
            aria-label="Zoom out"
          >
            -
          </button>
          <button onClick={exportAsPNG} disabled={exporting} className={styles.exportButton}>
            {exporting ? 'Exporting...' : 'Export PNG'}
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={styles.graphContainer}
        onMouseDown={(e) => {
          const startX = e.clientX;
          const startY = e.clientY;

          const handleMouseMove = (moveEvent: MouseEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            handlePan(dx, dy);
          };

          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };

          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        }}
      >
        <svg ref={svgRef} className={styles.svgCanvas} viewBox="0 0 800 600" />

        {simulationRunning && <div className={styles.simulatingBadge}>Simulating...</div>}
      </div>

      {selectedEntity && (
        <div className={styles.selectedCard}>
          <h3 className={styles.selectedTitle}>{selectedEntity.label}</h3>
          <p className={styles.selectedType}>Type: {selectedEntity.type}</p>
          {selectedEntity.properties && (
            <div className={styles.selectedProperties}>
              {Object.entries(selectedEntity.properties).map(([key, value]) => (
                <p key={key} className={styles.selectedPropertyItem}>
                  <span className={styles.selectedPropertyKey}>{key}:</span> {String(value)}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EntityRelationshipMapper;
